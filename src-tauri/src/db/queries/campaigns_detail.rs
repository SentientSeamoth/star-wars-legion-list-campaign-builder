//! Assembles the CampaignDetail aggregate a campaign's dashboard screen
//! loads in one call -- mirrors db/queries/lists.rs::get_list_with_entries.
//! Split into its own file (rather than living in campaigns_core.rs)
//! purely to stay under this project's ~300-line-per-file guideline given
//! how many child tables a campaign has. Read-only; no business logic,
//! per db/_PURPOSE.md.

use super::{campaigns_core, campaigns_play};
use crate::types::{
    CampaignDetail, CampaignMeter, CampaignMission, CampaignMissionOutcome,
    CampaignMissionWithOutcomes, CampaignPath, CampaignPurchase, CampaignRosterEntry,
    CampaignStoreItem, CampaignStoreItemModifier, CampaignUpgradeOption, ParticipantUpgrade,
};
use rusqlite::{params, Connection, Row};
use serde::de::DeserializeOwned;
use serde_json::Value;

fn parse_enum<T: DeserializeOwned>(s: &str) -> T {
    serde_json::from_value(Value::String(s.to_string()))
        .expect("DB value should always match its column's CHECK constraint")
}

fn select_paths(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignPath>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, name, style_summary, narrative, sort_order
         FROM campaign_paths WHERE campaign_id = ?1 ORDER BY sort_order",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        Ok(CampaignPath {
            id: row.get(0)?,
            campaign_id: row.get(1)?,
            name: row.get(2)?,
            style_summary: row.get(3)?,
            narrative: row.get(4)?,
            sort_order: row.get(5)?,
        })
    })?;
    rows.collect()
}

fn select_missions_with_outcomes(
    conn: &Connection,
    campaign_id: &str,
) -> rusqlite::Result<Vec<CampaignMissionWithOutcomes>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, path_id, name, sort_order, setup_narrative, objectives, battle_mechanics, status
         FROM campaign_missions WHERE campaign_id = ?1 ORDER BY sort_order",
    )?;
    let missions = stmt
        .query_map(params![campaign_id], |row: &Row| {
            let status: String = row.get(8)?;
            Ok(CampaignMission {
                id: row.get(0)?,
                campaign_id: row.get(1)?,
                path_id: row.get(2)?,
                name: row.get(3)?,
                sort_order: row.get(4)?,
                setup_narrative: row.get(5)?,
                objectives: row.get(6)?,
                battle_mechanics: row.get(7)?,
                status: parse_enum(&status),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut outcome_stmt = conn.prepare(
        "SELECT id, mission_id, condition_label, reward_credits, reward_notes, sort_order
         FROM campaign_mission_outcomes WHERE mission_id = ?1 ORDER BY sort_order",
    )?;
    let mut result = Vec::with_capacity(missions.len());
    for mission in missions {
        let outcomes = outcome_stmt
            .query_map(params![mission.id], |row: &Row| {
                Ok(CampaignMissionOutcome {
                    id: row.get(0)?,
                    mission_id: row.get(1)?,
                    condition_label: row.get(2)?,
                    reward_credits: row.get(3)?,
                    reward_notes: row.get(4)?,
                    sort_order: row.get(5)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        result.push(CampaignMissionWithOutcomes { mission, outcomes });
    }
    Ok(result)
}

fn select_roster_entries(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignRosterEntry>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.participant_id, r.unit_id, r.nickname, r.models_total, r.models_lost,
                r.is_specialty, r.upgrades_json, r.acquired_mission_id, r.retired
         FROM campaign_roster_entries r
         JOIN campaign_participants p ON p.id = r.participant_id
         WHERE p.campaign_id = ?1
         ORDER BY r.id",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        let upgrades_json: Option<String> = row.get(7)?;
        let upgrades = upgrades_json
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Ok(CampaignRosterEntry {
            id: row.get(0)?,
            participant_id: row.get(1)?,
            unit_id: row.get(2)?,
            nickname: row.get(3)?,
            models_total: row.get(4)?,
            models_lost: row.get(5)?,
            is_specialty: row.get::<_, i64>(6)? != 0,
            upgrades,
            acquired_mission_id: row.get(8)?,
            retired: row.get::<_, i64>(9)? != 0,
        })
    })?;
    rows.collect()
}

fn select_meters(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignMeter>> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.participant_id, m.name, m.current_value, m.description
         FROM campaign_meters m
         JOIN campaign_participants p ON p.id = m.participant_id
         WHERE p.campaign_id = ?1
         ORDER BY m.name",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        Ok(CampaignMeter {
            id: row.get(0)?,
            participant_id: row.get(1)?,
            name: row.get(2)?,
            current_value: row.get(3)?,
            description: row.get(4)?,
        })
    })?;
    rows.collect()
}

fn select_upgrade_options(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignUpgradeOption>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, path_id, name, tier, effect, is_trophy, sort_order
         FROM campaign_upgrade_options WHERE campaign_id = ?1 ORDER BY sort_order",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        Ok(CampaignUpgradeOption {
            id: row.get(0)?,
            campaign_id: row.get(1)?,
            path_id: row.get(2)?,
            name: row.get(3)?,
            tier: row.get(4)?,
            effect: row.get(5)?,
            is_trophy: row.get::<_, i64>(6)? != 0,
            sort_order: row.get(7)?,
        })
    })?;
    rows.collect()
}

fn select_participant_upgrades(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<ParticipantUpgrade>> {
    let mut stmt = conn.prepare(
        "SELECT pu.participant_id, pu.upgrade_option_id
         FROM campaign_participant_upgrades pu
         JOIN campaign_participants p ON p.id = pu.participant_id
         WHERE p.campaign_id = ?1",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        Ok(ParticipantUpgrade {
            participant_id: row.get(0)?,
            upgrade_option_id: row.get(1)?,
        })
    })?;
    rows.collect()
}

fn select_store_items(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignStoreItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, campaign_id, unit_id, display_name, base_cost, unlock_spend_threshold, unlock_only, max_count, sort_order
         FROM campaign_store_items WHERE campaign_id = ?1 ORDER BY sort_order",
    )?;
    let mut items = stmt
        .query_map(params![campaign_id], |row: &Row| {
            Ok(CampaignStoreItem {
                id: row.get(0)?,
                campaign_id: row.get(1)?,
                unit_id: row.get(2)?,
                display_name: row.get(3)?,
                base_cost: row.get(4)?,
                unlock_spend_threshold: row.get(5)?,
                unlock_only: row.get::<_, i64>(6)? != 0,
                max_count: row.get(7)?,
                sort_order: row.get(8)?,
                modifiers: Vec::new(),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut modifier_stmt = conn.prepare(
        "SELECT id, store_item_id, label, cost, sort_order FROM campaign_store_item_modifiers
         WHERE store_item_id = ?1 ORDER BY sort_order",
    )?;
    for item in items.iter_mut() {
        item.modifiers = modifier_stmt
            .query_map(params![item.id], |row: &Row| {
                Ok(CampaignStoreItemModifier {
                    id: row.get(0)?,
                    store_item_id: row.get(1)?,
                    label: row.get(2)?,
                    cost: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
    }
    Ok(items)
}

fn select_purchases(conn: &Connection, campaign_id: &str) -> rusqlite::Result<Vec<CampaignPurchase>> {
    let mut stmt = conn.prepare(
        "SELECT pu.id, pu.participant_id, pu.store_item_id, pu.roster_entry_id, pu.credits_spent, pu.purchased_at
         FROM campaign_purchases pu
         JOIN campaign_participants p ON p.id = pu.participant_id
         WHERE p.campaign_id = ?1
         ORDER BY pu.purchased_at",
    )?;
    let rows = stmt.query_map(params![campaign_id], |row: &Row| {
        Ok(CampaignPurchase {
            id: row.get(0)?,
            participant_id: row.get(1)?,
            store_item_id: row.get(2)?,
            roster_entry_id: row.get(3)?,
            credits_spent: row.get(4)?,
            purchased_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

/// Every battle report across the whole campaign, chronological -- backs
/// the Story tab. Reuses campaigns_play::get_battle_report per id rather
/// than duplicating its outcome/casualty assembly logic.
fn select_battle_reports(
    conn: &Connection,
    campaign_id: &str,
) -> rusqlite::Result<Vec<crate::types::CampaignBattleReport>> {
    let mut stmt = conn.prepare(
        "SELECT br.id
         FROM campaign_battle_reports br
         JOIN campaign_missions m ON m.id = br.mission_id
         WHERE m.campaign_id = ?1
         ORDER BY br.created_at",
    )?;
    let ids = stmt
        .query_map(params![campaign_id], |row: &Row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    ids.iter()
        .map(|id| campaigns_play::get_battle_report(conn, id))
        .collect()
}

pub fn get_campaign_detail(conn: &Connection, campaign_id: &str) -> rusqlite::Result<CampaignDetail> {
    let campaign = campaigns_core::get_campaign(conn, campaign_id)?;
    let participants = campaigns_core::list_participants_for_campaign(conn, campaign_id)?;
    let paths = select_paths(conn, campaign_id)?;
    let missions = select_missions_with_outcomes(conn, campaign_id)?;
    let roster_entries = select_roster_entries(conn, campaign_id)?;
    let meters = select_meters(conn, campaign_id)?;
    let upgrade_options = select_upgrade_options(conn, campaign_id)?;
    let participant_upgrades = select_participant_upgrades(conn, campaign_id)?;
    let store_items = select_store_items(conn, campaign_id)?;
    let purchases = select_purchases(conn, campaign_id)?;
    let battle_reports = select_battle_reports(conn, campaign_id)?;

    Ok(CampaignDetail {
        campaign,
        participants,
        paths,
        missions,
        roster_entries,
        meters,
        upgrade_options,
        participant_upgrades,
        store_items,
        purchases,
        battle_reports,
    })
}
