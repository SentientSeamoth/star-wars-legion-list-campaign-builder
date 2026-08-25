//! Thin Tauri wrappers over db::queries::campaigns_content -- see
//! commands/_PURPOSE.md. This is the GM-authored "template" side of
//! Campaign Mode: paths, missions, mission outcomes, upgrade options,
//! store items and their modifiers.

use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::{
    CampaignMission, CampaignMissionOutcome, CampaignPath, CampaignStoreItem,
    CampaignStoreItemModifier, CampaignUpgradeOption,
};
use tauri::State;

// ---------------- Paths ----------------

#[tauri::command]
pub fn add_campaign_path(
    state: State<DbState>,
    campaign_id: String,
    name: String,
    style_summary: Option<String>,
    narrative: Option<String>,
    sort_order: i32,
) -> Result<CampaignPath, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_path(
        &conn,
        &id,
        &campaign_id,
        &name,
        style_summary.as_deref(),
        narrative.as_deref(),
        sort_order,
    )?)
}

#[tauri::command]
pub fn update_campaign_path(
    state: State<DbState>,
    path_id: String,
    name: String,
    style_summary: Option<String>,
    narrative: Option<String>,
    sort_order: i32,
) -> Result<CampaignPath, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::update_path(
        &conn,
        &path_id,
        &name,
        style_summary.as_deref(),
        narrative.as_deref(),
        sort_order,
    )?)
}

#[tauri::command]
pub fn remove_campaign_path(state: State<DbState>, path_id: String) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_path(&conn, &path_id)?)
}

// ---------------- Missions ----------------

#[tauri::command]
pub fn add_campaign_mission(
    state: State<DbState>,
    campaign_id: String,
    path_id: Option<String>,
    name: String,
    sort_order: i32,
    setup_narrative: Option<String>,
    objectives: Option<String>,
    battle_mechanics: Option<String>,
) -> Result<CampaignMission, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_mission(
        &conn,
        &id,
        &campaign_id,
        path_id.as_deref(),
        &name,
        sort_order,
        setup_narrative.as_deref(),
        objectives.as_deref(),
        battle_mechanics.as_deref(),
    )?)
}

#[tauri::command]
pub fn update_campaign_mission(
    state: State<DbState>,
    mission_id: String,
    path_id: Option<String>,
    name: String,
    sort_order: i32,
    setup_narrative: Option<String>,
    objectives: Option<String>,
    battle_mechanics: Option<String>,
) -> Result<CampaignMission, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::update_mission(
        &conn,
        &mission_id,
        path_id.as_deref(),
        &name,
        sort_order,
        setup_narrative.as_deref(),
        objectives.as_deref(),
        battle_mechanics.as_deref(),
    )?)
}

#[tauri::command]
pub fn set_campaign_mission_status(
    state: State<DbState>,
    mission_id: String,
    status: String,
) -> Result<CampaignMission, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::set_mission_status(&conn, &mission_id, &status)?)
}

#[tauri::command]
pub fn remove_campaign_mission(state: State<DbState>, mission_id: String) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_mission(&conn, &mission_id)?)
}

// ---------------- Mission outcomes ----------------

#[tauri::command]
pub fn add_campaign_mission_outcome(
    state: State<DbState>,
    mission_id: String,
    condition_label: String,
    reward_credits: i32,
    reward_notes: Option<String>,
    sort_order: i32,
) -> Result<CampaignMissionOutcome, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_outcome(
        &conn,
        &id,
        &mission_id,
        &condition_label,
        reward_credits,
        reward_notes.as_deref(),
        sort_order,
    )?)
}

#[tauri::command]
pub fn update_campaign_mission_outcome(
    state: State<DbState>,
    outcome_id: String,
    condition_label: String,
    reward_credits: i32,
    reward_notes: Option<String>,
    sort_order: i32,
) -> Result<CampaignMissionOutcome, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::update_outcome(
        &conn,
        &outcome_id,
        &condition_label,
        reward_credits,
        reward_notes.as_deref(),
        sort_order,
    )?)
}

#[tauri::command]
pub fn remove_campaign_mission_outcome(
    state: State<DbState>,
    outcome_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_outcome(&conn, &outcome_id)?)
}

// ---------------- Upgrade options ----------------

#[tauri::command]
pub fn add_campaign_upgrade_option(
    state: State<DbState>,
    campaign_id: String,
    path_id: Option<String>,
    name: String,
    tier: i32,
    effect: Option<String>,
    is_trophy: bool,
    sort_order: i32,
) -> Result<CampaignUpgradeOption, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_upgrade_option(
        &conn,
        &id,
        &campaign_id,
        path_id.as_deref(),
        &name,
        tier,
        effect.as_deref(),
        is_trophy,
        sort_order,
    )?)
}

#[tauri::command]
pub fn update_campaign_upgrade_option(
    state: State<DbState>,
    upgrade_option_id: String,
    path_id: Option<String>,
    name: String,
    tier: i32,
    effect: Option<String>,
    is_trophy: bool,
    sort_order: i32,
) -> Result<CampaignUpgradeOption, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::update_upgrade_option(
        &conn,
        &upgrade_option_id,
        path_id.as_deref(),
        &name,
        tier,
        effect.as_deref(),
        is_trophy,
        sort_order,
    )?)
}

#[tauri::command]
pub fn remove_campaign_upgrade_option(
    state: State<DbState>,
    upgrade_option_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_upgrade_option(&conn, &upgrade_option_id)?)
}

// ---------------- Store items + modifiers ----------------

#[tauri::command]
pub fn add_campaign_store_item(
    state: State<DbState>,
    campaign_id: String,
    unit_id: Option<String>,
    display_name: String,
    base_cost: i32,
    unlock_spend_threshold: Option<i32>,
    unlock_only: bool,
    max_count: Option<i32>,
    sort_order: i32,
) -> Result<CampaignStoreItem, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_store_item(
        &conn,
        &id,
        &campaign_id,
        unit_id.as_deref(),
        &display_name,
        base_cost,
        unlock_spend_threshold,
        unlock_only,
        max_count,
        sort_order,
    )?)
}

#[tauri::command]
pub fn update_campaign_store_item(
    state: State<DbState>,
    store_item_id: String,
    unit_id: Option<String>,
    display_name: String,
    base_cost: i32,
    unlock_spend_threshold: Option<i32>,
    unlock_only: bool,
    max_count: Option<i32>,
    sort_order: i32,
) -> Result<CampaignStoreItem, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::update_store_item(
        &conn,
        &store_item_id,
        unit_id.as_deref(),
        &display_name,
        base_cost,
        unlock_spend_threshold,
        unlock_only,
        max_count,
        sort_order,
    )?)
}

#[tauri::command]
pub fn remove_campaign_store_item(
    state: State<DbState>,
    store_item_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_store_item(&conn, &store_item_id)?)
}

#[tauri::command]
pub fn add_campaign_store_item_modifier(
    state: State<DbState>,
    store_item_id: String,
    label: String,
    cost: i32,
    sort_order: i32,
) -> Result<CampaignStoreItemModifier, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_content::add_store_item_modifier(
        &conn,
        &id,
        &store_item_id,
        &label,
        cost,
        sort_order,
    )?)
}

#[tauri::command]
pub fn remove_campaign_store_item_modifier(
    state: State<DbState>,
    modifier_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_content::remove_store_item_modifier(&conn, &modifier_id)?)
}
