//! CRUD for the GM-authored "template" side of Campaign Mode
//! (0003_campaigns.sql): paths, missions, mission outcomes, upgrade
//! options, store items and their modifiers. This is where campaign
//! *design* happens, as opposed to campaigns_play.rs's played state. No
//! business logic here, per db/_PURPOSE.md.

use crate::types::{
    CampaignMission, CampaignMissionOutcome, CampaignPath, CampaignStoreItem,
    CampaignStoreItemModifier, CampaignUpgradeOption,
};
use rusqlite::{params, Connection, Row};
use serde::de::DeserializeOwned;
use serde_json::Value;

fn parse_enum<T: DeserializeOwned>(s: &str) -> T {
    serde_json::from_value(Value::String(s.to_string()))
        .expect("DB value should always match its column's CHECK constraint")
}

// ---------------- Paths ----------------

const PATH_COLUMNS: &str = "id, campaign_id, name, style_summary, narrative, sort_order";

fn row_to_path(row: &Row) -> rusqlite::Result<CampaignPath> {
    Ok(CampaignPath {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        name: row.get(2)?,
        style_summary: row.get(3)?,
        narrative: row.get(4)?,
        sort_order: row.get(5)?,
    })
}

pub fn get_path(conn: &Connection, id: &str) -> rusqlite::Result<CampaignPath> {
    conn.query_row(
        &format!("SELECT {PATH_COLUMNS} FROM campaign_paths WHERE id = ?1"),
        params![id],
        row_to_path,
    )
}

pub fn add_path(
    conn: &Connection,
    id: &str,
    campaign_id: &str,
    name: &str,
    style_summary: Option<&str>,
    narrative: Option<&str>,
    sort_order: i32,
) -> rusqlite::Result<CampaignPath> {
    conn.execute(
        "INSERT INTO campaign_paths (id, campaign_id, name, style_summary, narrative, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, campaign_id, name, style_summary, narrative, sort_order],
    )?;
    get_path(conn, id)
}

pub fn update_path(
    conn: &Connection,
    id: &str,
    name: &str,
    style_summary: Option<&str>,
    narrative: Option<&str>,
    sort_order: i32,
) -> rusqlite::Result<CampaignPath> {
    conn.execute(
        "UPDATE campaign_paths SET name = ?2, style_summary = ?3, narrative = ?4, sort_order = ?5 WHERE id = ?1",
        params![id, name, style_summary, narrative, sort_order],
    )?;
    get_path(conn, id)
}

pub fn remove_path(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM campaign_paths WHERE id = ?1", params![id])?;
    Ok(())
}

// ---------------- Missions ----------------

const MISSION_COLUMNS: &str =
    "id, campaign_id, path_id, name, sort_order, setup_narrative, objectives, battle_mechanics, status";

fn row_to_mission(row: &Row) -> rusqlite::Result<CampaignMission> {
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
}

pub fn get_mission(conn: &Connection, id: &str) -> rusqlite::Result<CampaignMission> {
    conn.query_row(
        &format!("SELECT {MISSION_COLUMNS} FROM campaign_missions WHERE id = ?1"),
        params![id],
        row_to_mission,
    )
}

#[allow(clippy::too_many_arguments)]
pub fn add_mission(
    conn: &Connection,
    id: &str,
    campaign_id: &str,
    path_id: Option<&str>,
    name: &str,
    sort_order: i32,
    setup_narrative: Option<&str>,
    objectives: Option<&str>,
    battle_mechanics: Option<&str>,
) -> rusqlite::Result<CampaignMission> {
    conn.execute(
        "INSERT INTO campaign_missions
            (id, campaign_id, path_id, name, sort_order, setup_narrative, objectives, battle_mechanics)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            campaign_id,
            path_id,
            name,
            sort_order,
            setup_narrative,
            objectives,
            battle_mechanics
        ],
    )?;
    get_mission(conn, id)
}

#[allow(clippy::too_many_arguments)]
pub fn update_mission(
    conn: &Connection,
    id: &str,
    path_id: Option<&str>,
    name: &str,
    sort_order: i32,
    setup_narrative: Option<&str>,
    objectives: Option<&str>,
    battle_mechanics: Option<&str>,
) -> rusqlite::Result<CampaignMission> {
    conn.execute(
        "UPDATE campaign_missions
         SET path_id = ?2, name = ?3, sort_order = ?4, setup_narrative = ?5,
             objectives = ?6, battle_mechanics = ?7
         WHERE id = ?1",
        params![
            id,
            path_id,
            name,
            sort_order,
            setup_narrative,
            objectives,
            battle_mechanics
        ],
    )?;
    get_mission(conn, id)
}

pub fn set_mission_status(
    conn: &Connection,
    id: &str,
    status: &str,
) -> rusqlite::Result<CampaignMission> {
    conn.execute(
        "UPDATE campaign_missions SET status = ?2 WHERE id = ?1",
        params![id, status],
    )?;
    get_mission(conn, id)
}

pub fn remove_mission(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM campaign_missions WHERE id = ?1", params![id])?;
    Ok(())
}

// ---------------- Mission outcomes ----------------

const OUTCOME_COLUMNS: &str = "id, mission_id, condition_label, reward_credits, reward_notes, sort_order";

fn row_to_outcome(row: &Row) -> rusqlite::Result<CampaignMissionOutcome> {
    Ok(CampaignMissionOutcome {
        id: row.get(0)?,
        mission_id: row.get(1)?,
        condition_label: row.get(2)?,
        reward_credits: row.get(3)?,
        reward_notes: row.get(4)?,
        sort_order: row.get(5)?,
    })
}

pub fn get_outcome(conn: &Connection, id: &str) -> rusqlite::Result<CampaignMissionOutcome> {
    conn.query_row(
        &format!("SELECT {OUTCOME_COLUMNS} FROM campaign_mission_outcomes WHERE id = ?1"),
        params![id],
        row_to_outcome,
    )
}

pub fn list_outcomes_for_mission(
    conn: &Connection,
    mission_id: &str,
) -> rusqlite::Result<Vec<CampaignMissionOutcome>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {OUTCOME_COLUMNS} FROM campaign_mission_outcomes WHERE mission_id = ?1 ORDER BY sort_order"
    ))?;
    let rows = stmt.query_map(params![mission_id], row_to_outcome)?;
    rows.collect()
}

pub fn add_outcome(
    conn: &Connection,
    id: &str,
    mission_id: &str,
    condition_label: &str,
    reward_credits: i32,
    reward_notes: Option<&str>,
    sort_order: i32,
) -> rusqlite::Result<CampaignMissionOutcome> {
    conn.execute(
        "INSERT INTO campaign_mission_outcomes
            (id, mission_id, condition_label, reward_credits, reward_notes, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, mission_id, condition_label, reward_credits, reward_notes, sort_order],
    )?;
    get_outcome(conn, id)
}

pub fn update_outcome(
    conn: &Connection,
    id: &str,
    condition_label: &str,
    reward_credits: i32,
    reward_notes: Option<&str>,
    sort_order: i32,
) -> rusqlite::Result<CampaignMissionOutcome> {
    conn.execute(
        "UPDATE campaign_mission_outcomes
         SET condition_label = ?2, reward_credits = ?3, reward_notes = ?4, sort_order = ?5
         WHERE id = ?1",
        params![id, condition_label, reward_credits, reward_notes, sort_order],
    )?;
    get_outcome(conn, id)
}

pub fn remove_outcome(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_mission_outcomes WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

// ---------------- Upgrade options ----------------

const UPGRADE_OPTION_COLUMNS: &str = "id, campaign_id, path_id, name, tier, effect, is_trophy, sort_order";

fn row_to_upgrade_option(row: &Row) -> rusqlite::Result<CampaignUpgradeOption> {
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
}

pub fn get_upgrade_option(conn: &Connection, id: &str) -> rusqlite::Result<CampaignUpgradeOption> {
    conn.query_row(
        &format!("SELECT {UPGRADE_OPTION_COLUMNS} FROM campaign_upgrade_options WHERE id = ?1"),
        params![id],
        row_to_upgrade_option,
    )
}

#[allow(clippy::too_many_arguments)]
pub fn add_upgrade_option(
    conn: &Connection,
    id: &str,
    campaign_id: &str,
    path_id: Option<&str>,
    name: &str,
    tier: i32,
    effect: Option<&str>,
    is_trophy: bool,
    sort_order: i32,
) -> rusqlite::Result<CampaignUpgradeOption> {
    conn.execute(
        "INSERT INTO campaign_upgrade_options
            (id, campaign_id, path_id, name, tier, effect, is_trophy, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, campaign_id, path_id, name, tier, effect, is_trophy as i32, sort_order],
    )?;
    get_upgrade_option(conn, id)
}

#[allow(clippy::too_many_arguments)]
pub fn update_upgrade_option(
    conn: &Connection,
    id: &str,
    path_id: Option<&str>,
    name: &str,
    tier: i32,
    effect: Option<&str>,
    is_trophy: bool,
    sort_order: i32,
) -> rusqlite::Result<CampaignUpgradeOption> {
    conn.execute(
        "UPDATE campaign_upgrade_options
         SET path_id = ?2, name = ?3, tier = ?4, effect = ?5, is_trophy = ?6, sort_order = ?7
         WHERE id = ?1",
        params![id, path_id, name, tier, effect, is_trophy as i32, sort_order],
    )?;
    get_upgrade_option(conn, id)
}

pub fn remove_upgrade_option(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_upgrade_options WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

// ---------------- Store items + modifiers ----------------

const STORE_ITEM_COLUMNS: &str =
    "id, campaign_id, unit_id, display_name, base_cost, unlock_spend_threshold, unlock_only, max_count, sort_order";
const MODIFIER_COLUMNS: &str = "id, store_item_id, label, cost, sort_order";

fn row_to_modifier(row: &Row) -> rusqlite::Result<CampaignStoreItemModifier> {
    Ok(CampaignStoreItemModifier {
        id: row.get(0)?,
        store_item_id: row.get(1)?,
        label: row.get(2)?,
        cost: row.get(3)?,
        sort_order: row.get(4)?,
    })
}

fn row_to_store_item_without_modifiers(row: &Row) -> rusqlite::Result<CampaignStoreItem> {
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
}

pub fn list_modifiers_for_item(
    conn: &Connection,
    store_item_id: &str,
) -> rusqlite::Result<Vec<CampaignStoreItemModifier>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {MODIFIER_COLUMNS} FROM campaign_store_item_modifiers WHERE store_item_id = ?1 ORDER BY sort_order"
    ))?;
    let rows = stmt.query_map(params![store_item_id], row_to_modifier)?;
    rows.collect()
}

pub fn get_store_item(conn: &Connection, id: &str) -> rusqlite::Result<CampaignStoreItem> {
    let mut item = conn.query_row(
        &format!("SELECT {STORE_ITEM_COLUMNS} FROM campaign_store_items WHERE id = ?1"),
        params![id],
        row_to_store_item_without_modifiers,
    )?;
    item.modifiers = list_modifiers_for_item(conn, id)?;
    Ok(item)
}

#[allow(clippy::too_many_arguments)]
pub fn add_store_item(
    conn: &Connection,
    id: &str,
    campaign_id: &str,
    unit_id: Option<&str>,
    display_name: &str,
    base_cost: i32,
    unlock_spend_threshold: Option<i32>,
    unlock_only: bool,
    max_count: Option<i32>,
    sort_order: i32,
) -> rusqlite::Result<CampaignStoreItem> {
    conn.execute(
        "INSERT INTO campaign_store_items
            (id, campaign_id, unit_id, display_name, base_cost, unlock_spend_threshold, unlock_only, max_count, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            campaign_id,
            unit_id,
            display_name,
            base_cost,
            unlock_spend_threshold,
            unlock_only as i32,
            max_count,
            sort_order
        ],
    )?;
    get_store_item(conn, id)
}

#[allow(clippy::too_many_arguments)]
pub fn update_store_item(
    conn: &Connection,
    id: &str,
    unit_id: Option<&str>,
    display_name: &str,
    base_cost: i32,
    unlock_spend_threshold: Option<i32>,
    unlock_only: bool,
    max_count: Option<i32>,
    sort_order: i32,
) -> rusqlite::Result<CampaignStoreItem> {
    conn.execute(
        "UPDATE campaign_store_items
         SET unit_id = ?2, display_name = ?3, base_cost = ?4, unlock_spend_threshold = ?5,
             unlock_only = ?6, max_count = ?7, sort_order = ?8
         WHERE id = ?1",
        params![
            id,
            unit_id,
            display_name,
            base_cost,
            unlock_spend_threshold,
            unlock_only as i32,
            max_count,
            sort_order
        ],
    )?;
    get_store_item(conn, id)
}

pub fn remove_store_item(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_store_items WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn add_store_item_modifier(
    conn: &Connection,
    id: &str,
    store_item_id: &str,
    label: &str,
    cost: i32,
    sort_order: i32,
) -> rusqlite::Result<CampaignStoreItemModifier> {
    conn.execute(
        "INSERT INTO campaign_store_item_modifiers (id, store_item_id, label, cost, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, store_item_id, label, cost, sort_order],
    )?;
    conn.query_row(
        &format!("SELECT {MODIFIER_COLUMNS} FROM campaign_store_item_modifiers WHERE id = ?1"),
        params![id],
        row_to_modifier,
    )
}

pub fn remove_store_item_modifier(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_store_item_modifiers WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}
