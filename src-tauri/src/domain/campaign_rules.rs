//! Pure Campaign Mode business rules -- the first real occupant of
//! domain/ (see _PURPOSE.md; this folder was deliberately left empty
//! until real validation rules existed, per docs/DECISIONS.md's
//! 2026-08-23 entry). No I/O, no database calls, no Tauri types.

use crate::types::CampaignStoreItem;

/// Whether a roster entry is still fully alive, has taken losses but
/// isn't wiped out, or should be treated as retired (permadeath resolved
/// once models_lost reaches models_total).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RosterEntryStatus {
    Alive,
    Depleted,
    Retired,
}

pub fn resolve_roster_status(models_total: i32, models_lost: i32) -> RosterEntryStatus {
    if models_lost >= models_total {
        RosterEntryStatus::Retired
    } else if models_lost > 0 {
        RosterEntryStatus::Depleted
    } else {
        RosterEntryStatus::Alive
    }
}

/// Whether a participant may buy `item` for `price` right now.
/// `total_credits_spent` is the participant's lifetime spend (read from
/// the `campaign_participant_totals` view), `current_owned_count` is how
/// many roster entries already trace back to this store item.
///
/// Confirmed with the project owner (see docs/DECISIONS.md):
/// `unlock_spend_threshold` gates on CUMULATIVE spend, not a free grant --
/// `price` is still charged once the threshold is met.
pub fn can_purchase_store_item(
    item: &CampaignStoreItem,
    credits_balance: i32,
    total_credits_spent: i32,
    current_owned_count: i32,
    price: i32,
) -> Result<(), String> {
    if let Some(threshold) = item.unlock_spend_threshold {
        if total_credits_spent < threshold {
            return Err(format!(
                "{} unlocks once {} total credits have been spent (spent so far: {}).",
                item.display_name, threshold, total_credits_spent
            ));
        }
    }
    if let Some(max) = item.max_count {
        if current_owned_count >= max {
            return Err(format!(
                "{} has a maximum of {} in a single roster.",
                item.display_name, max
            ));
        }
    }
    if price > credits_balance {
        return Err(format!(
            "Not enough credits: {} costs {}, balance is {}.",
            item.display_name, price, credits_balance
        ));
    }
    Ok(())
}

/// Non-banking upgrade-purchase rule: a participant may spend their
/// upgrade-purchase opportunity only if one is currently available.
/// Completing a mission grants exactly one (see
/// db/queries/campaigns_play.rs::complete_mission_for_participant); it is
/// never accumulated -- an unused opportunity is overwritten, not
/// incremented, the next time a mission completes.
pub fn can_purchase_upgrade(upgrade_purchase_available: bool) -> Result<(), String> {
    if upgrade_purchase_available {
        Ok(())
    } else {
        Err("No upgrade purchase is available -- complete a mission to earn one.".to_string())
    }
}

/// Applies a credit delta to a balance, refusing to go negative -- used
/// for both spending (negative delta) and awarding (positive delta) so
/// there's exactly one place this arithmetic happens.
pub fn apply_credit_delta(balance: i32, delta: i32) -> Result<i32, String> {
    let new_balance = balance + delta;
    if new_balance < 0 {
        Err(format!(
            "This would put the credit balance below zero ({balance} + {delta} = {new_balance})."
        ))
    } else {
        Ok(new_balance)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_item(unlock_spend_threshold: Option<i32>, max_count: Option<i32>) -> CampaignStoreItem {
        CampaignStoreItem {
            id: "item-1".into(),
            campaign_id: "camp-1".into(),
            unit_id: None,
            display_name: "Droideka".into(),
            base_cost: 60,
            unlock_spend_threshold,
            unlock_only: false,
            max_count,
            sort_order: 0,
            modifiers: vec![],
        }
    }

    #[test]
    fn blocks_purchase_below_unlock_threshold() {
        let item = sample_item(Some(10), None);
        assert!(can_purchase_store_item(&item, 1000, 5, 0, 60).is_err());
    }

    #[test]
    fn allows_purchase_once_threshold_met() {
        let item = sample_item(Some(10), None);
        assert!(can_purchase_store_item(&item, 1000, 10, 0, 60).is_ok());
    }

    #[test]
    fn threshold_does_not_grant_a_free_unit() {
        // Meeting the threshold still requires paying `price` out of balance.
        let item = sample_item(Some(10), None);
        assert!(can_purchase_store_item(&item, 5, 10, 0, 60).is_err());
    }

    #[test]
    fn blocks_purchase_over_max_count() {
        let item = sample_item(None, Some(1));
        assert!(can_purchase_store_item(&item, 1000, 0, 1, 60).is_err());
        assert!(can_purchase_store_item(&item, 1000, 0, 0, 60).is_ok());
    }

    #[test]
    fn blocks_purchase_with_insufficient_balance() {
        let item = sample_item(None, None);
        assert!(can_purchase_store_item(&item, 10, 0, 0, 60).is_err());
    }

    #[test]
    fn resolves_roster_status_transitions() {
        assert_eq!(resolve_roster_status(4, 0), RosterEntryStatus::Alive);
        assert_eq!(resolve_roster_status(4, 2), RosterEntryStatus::Depleted);
        assert_eq!(resolve_roster_status(4, 4), RosterEntryStatus::Retired);
        assert_eq!(resolve_roster_status(4, 9), RosterEntryStatus::Retired);
    }

    #[test]
    fn non_banking_upgrade_purchase_rule() {
        assert!(can_purchase_upgrade(true).is_ok());
        assert!(can_purchase_upgrade(false).is_err());
    }

    #[test]
    fn credit_delta_refuses_negative_balance() {
        assert_eq!(apply_credit_delta(100, -40).unwrap(), 60);
        assert!(apply_credit_delta(100, -200).is_err());
    }
}
