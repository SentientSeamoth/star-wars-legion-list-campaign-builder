//! Thin Tauri wrappers over db::queries::campaigns_play -- see
//! commands/_PURPOSE.md. This is the played side of Campaign Mode:
//! permadeath roster entries, store purchases, and battle reports.
//!
//! `purchase_store_item` and `log_battle_report` are the two places this
//! app calls into domain::campaign_rules for real validation/arithmetic,
//! then sequences several db/queries writes inside one SQL transaction so
//! a partial failure can't leave credits deducted without a roster entry,
//! or a casualty recorded without its credit award. Per
//! commands/_PURPOSE.md: business logic lives in domain/, persistence in
//! db/, this file only orchestrates between them.

use crate::db::{queries, DbState};
use crate::domain::campaign_rules::{self, RosterEntryStatus};
use crate::error::AppError;
use crate::types::{
    CampaignBattleReport, CampaignParticipant, CampaignRosterEntry, CasualtyInput, PurchaseResult,
};
use tauri::State;

// ---------------- Roster (direct CRUD, outside a purchase/battle report) ----------------

#[tauri::command]
pub fn add_roster_entry(
    state: State<DbState>,
    participant_id: String,
    unit_id: Option<String>,
    nickname: Option<String>,
    models_total: i32,
    is_specialty: bool,
    acquired_mission_id: Option<String>,
) -> Result<CampaignRosterEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_play::add_roster_entry(
        &conn,
        &id,
        &participant_id,
        unit_id.as_deref(),
        nickname.as_deref(),
        models_total,
        is_specialty,
        acquired_mission_id.as_deref(),
    )?)
}

#[tauri::command]
pub fn update_roster_entry_upgrades(
    state: State<DbState>,
    roster_entry_id: String,
    upgrade_ids: Vec<String>,
) -> Result<CampaignRosterEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_play::update_roster_entry_upgrades(
        &conn,
        &roster_entry_id,
        &upgrade_ids,
    )?)
}

/// Manual casualty adjustment outside a formal battle report (e.g.
/// correcting a count after the fact) -- resolves the post-loss roster
/// status via domain::campaign_rules before persisting both fields
/// together. `models_lost_delta` can be negative to undo a mistaken entry;
/// the result is clamped at 0, since a negative loss count is meaningless.
#[tauri::command]
pub fn record_roster_casualty(
    state: State<DbState>,
    roster_entry_id: String,
    models_lost_delta: i32,
) -> Result<CampaignRosterEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let entry = queries::campaigns_play::get_roster_entry(&conn, &roster_entry_id)?;
    let new_models_lost = (entry.models_lost + models_lost_delta).max(0);
    let retired = campaign_rules::resolve_roster_status(entry.models_total, new_models_lost)
        == RosterEntryStatus::Retired;
    Ok(queries::campaigns_play::update_roster_entry_casualty(
        &conn,
        &roster_entry_id,
        new_models_lost,
        retired,
    )?)
}

#[tauri::command]
pub fn set_roster_entry_retired(
    state: State<DbState>,
    roster_entry_id: String,
    retired: bool,
) -> Result<CampaignRosterEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_play::set_roster_entry_retired(
        &conn,
        &roster_entry_id,
        retired,
    )?)
}

#[tauri::command]
pub fn remove_roster_entry(state: State<DbState>, roster_entry_id: String) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_play::remove_roster_entry(&conn, &roster_entry_id)?)
}

// ---------------- Store purchases ----------------

#[tauri::command]
pub fn purchase_store_item(
    state: State<DbState>,
    participant_id: String,
    store_item_id: String,
    credits_spent: i32,
    models_total: i32,
    nickname: Option<String>,
    is_specialty: bool,
) -> Result<PurchaseResult, AppError> {
    let mut conn = state.0.lock().expect("db mutex poisoned");

    let item = queries::campaigns_content::get_store_item(&conn, &store_item_id)?;
    let participant = queries::campaigns_core::get_participant(&conn, &participant_id)?;
    let total_spent = queries::campaigns_play::get_participant_total_spent(&conn, &participant_id)?;
    let owned_count =
        queries::campaigns_play::count_purchases_of_item(&conn, &participant_id, &store_item_id)?;

    campaign_rules::can_purchase_store_item(
        &item,
        participant.credits_balance,
        total_spent,
        owned_count,
        credits_spent,
    )
    .map_err(AppError::Rule)?;

    let new_balance = campaign_rules::apply_credit_delta(participant.credits_balance, -credits_spent)
        .map_err(AppError::Rule)?;

    let roster_entry_id = uuid::Uuid::new_v4().to_string();
    let purchase_id = uuid::Uuid::new_v4().to_string();

    let tx = conn.transaction()?;
    let roster_entry = queries::campaigns_play::add_roster_entry(
        &tx,
        &roster_entry_id,
        &participant_id,
        item.unit_id.as_deref(),
        nickname.as_deref(),
        models_total,
        is_specialty,
        None,
    )?;
    let purchase = queries::campaigns_play::insert_purchase(
        &tx,
        &purchase_id,
        &participant_id,
        &store_item_id,
        Some(&roster_entry.id),
        credits_spent,
    )?;
    queries::campaigns_core::update_participant_credits(&tx, &participant_id, new_balance)?;
    tx.commit()?;

    Ok(PurchaseResult {
        purchase,
        roster_entry,
    })
}

// ---------------- Hero upgrade purchases ----------------

/// Enforces the confirmed non-banking rule: only allowed while
/// `upgrade_purchase_available` is set (granted by log_battle_report
/// below), and consumes it immediately on success.
#[tauri::command]
pub fn purchase_upgrade_option(
    state: State<DbState>,
    participant_id: String,
    upgrade_option_id: String,
    acquired_mission_id: Option<String>,
) -> Result<CampaignParticipant, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let participant = queries::campaigns_core::get_participant(&conn, &participant_id)?;
    campaign_rules::can_purchase_upgrade(participant.upgrade_purchase_available)
        .map_err(AppError::Rule)?;
    queries::campaigns_play::insert_participant_upgrade(
        &conn,
        &participant_id,
        &upgrade_option_id,
        acquired_mission_id.as_deref(),
    )?;
    Ok(queries::campaigns_core::set_participant_upgrade_purchase_available(
        &conn,
        &participant_id,
        false,
    )?)
}

// ---------------- Battle reports ----------------

#[tauri::command]
pub fn list_battle_reports_for_mission(
    state: State<DbState>,
    mission_id: String,
) -> Result<Vec<CampaignBattleReport>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_play::list_battle_reports_for_mission(&conn, &mission_id)?)
}

struct ResolvedCasualty<'a> {
    input: &'a CasualtyInput,
    new_models_lost: Option<i32>,
    retired: Option<bool>,
}

/// Logs a played mission: records the narrative + credit award, links
/// whichever outcome(s) triggered, applies each casualty to its roster
/// entry (auto-retiring one that's been wiped out, via
/// domain::campaign_rules::resolve_roster_status), awards credits to the
/// participant, grants their next upgrade-purchase opportunity, and marks
/// the mission completed -- all in one transaction. `credits_awarded` is
/// computed client-side (sum of the chosen outcomes' reward_credits, user-
/// editable before submitting) rather than re-derived here, since it's
/// trivial arithmetic, not a business rule.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn log_battle_report(
    state: State<DbState>,
    mission_id: String,
    participant_id: String,
    narrative: Option<String>,
    outcome_ids: Vec<String>,
    credits_awarded: i32,
    notes: Option<String>,
    casualties: Vec<CasualtyInput>,
) -> Result<CampaignBattleReport, AppError> {
    let mut conn = state.0.lock().expect("db mutex poisoned");

    let participant = queries::campaigns_core::get_participant(&conn, &participant_id)?;
    let new_balance = campaign_rules::apply_credit_delta(participant.credits_balance, credits_awarded)
        .map_err(AppError::Rule)?;

    // Resolve every casualty's post-loss roster status up front, before
    // any writes happen, using data already fetched.
    let mut resolved = Vec::with_capacity(casualties.len());
    for input in &casualties {
        if let Some(entry_id) = &input.roster_entry_id {
            let entry = queries::campaigns_play::get_roster_entry(&conn, entry_id)?;
            let new_models_lost = (entry.models_lost + input.models_lost).max(0);
            let retired = campaign_rules::resolve_roster_status(entry.models_total, new_models_lost)
                == RosterEntryStatus::Retired;
            resolved.push(ResolvedCasualty {
                input,
                new_models_lost: Some(new_models_lost),
                retired: Some(retired),
            });
        } else {
            resolved.push(ResolvedCasualty {
                input,
                new_models_lost: None,
                retired: None,
            });
        }
    }

    let report_id = uuid::Uuid::new_v4().to_string();
    let tx = conn.transaction()?;

    queries::campaigns_play::insert_battle_report(
        &tx,
        &report_id,
        &mission_id,
        &participant_id,
        narrative.as_deref(),
        credits_awarded,
        notes.as_deref(),
    )?;
    for outcome_id in &outcome_ids {
        queries::campaigns_play::link_battle_report_outcome(&tx, &report_id, outcome_id)?;
    }
    for c in &resolved {
        let casualty_id = uuid::Uuid::new_v4().to_string();
        queries::campaigns_play::add_battle_report_casualty(
            &tx,
            &casualty_id,
            &report_id,
            c.input.roster_entry_id.as_deref(),
            &c.input.label,
            c.input.models_lost,
        )?;
        if let (Some(entry_id), Some(new_models_lost), Some(retired)) =
            (&c.input.roster_entry_id, c.new_models_lost, c.retired)
        {
            queries::campaigns_play::update_roster_entry_casualty(&tx, entry_id, new_models_lost, retired)?;
        }
    }
    queries::campaigns_core::update_participant_credits(&tx, &participant_id, new_balance)?;
    queries::campaigns_core::set_participant_upgrade_purchase_available(&tx, &participant_id, true)?;
    queries::campaigns_content::set_mission_status(&tx, &mission_id, "completed")?;

    tx.commit()?;

    Ok(queries::campaigns_play::get_battle_report(&conn, &report_id)?)
}
