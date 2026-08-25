//! Thin Tauri wrappers over db::queries::campaigns_core -- see
//! commands/_PURPOSE.md. `mode`/`status`/`role` are taken as plain
//! strings, validated entirely by the schema's CHECK constraints, same
//! policy as commands/lists.rs.

use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::{Campaign, CampaignMeter, CampaignParticipant};
use tauri::State;

#[tauri::command]
pub fn create_campaign(
    state: State<DbState>,
    name: String,
    summary: Option<String>,
    mode: String,
) -> Result<Campaign, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_core::create_campaign(
        &conn,
        &id,
        &name,
        summary.as_deref(),
        &mode,
    )?)
}

#[tauri::command]
pub fn update_campaign_header(
    state: State<DbState>,
    campaign_id: String,
    name: String,
    summary: Option<String>,
    mode: String,
    status: String,
) -> Result<Campaign, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::update_campaign_header(
        &conn,
        &campaign_id,
        &name,
        summary.as_deref(),
        &mode,
        &status,
    )?)
}

#[tauri::command]
pub fn delete_campaign(state: State<DbState>, campaign_id: String) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::delete_campaign(&conn, &campaign_id)?)
}

#[tauri::command]
pub fn list_campaigns_for_user(
    state: State<DbState>,
    user_id: String,
) -> Result<Vec<Campaign>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::list_campaigns_for_user(&conn, &user_id)?)
}

#[tauri::command]
pub fn add_campaign_participant(
    state: State<DbState>,
    campaign_id: String,
    user_id: String,
    role: String,
    side_name: Option<String>,
) -> Result<CampaignParticipant, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_core::add_participant(
        &conn,
        &id,
        &campaign_id,
        &user_id,
        &role,
        side_name.as_deref(),
    )?)
}

#[tauri::command]
pub fn remove_campaign_participant(
    state: State<DbState>,
    participant_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::remove_participant(&conn, &participant_id)?)
}

#[tauri::command]
pub fn update_participant_credits(
    state: State<DbState>,
    participant_id: String,
    credits_balance: i32,
) -> Result<CampaignParticipant, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::update_participant_credits(
        &conn,
        &participant_id,
        credits_balance,
    )?)
}

#[tauri::command]
pub fn set_participant_chosen_path(
    state: State<DbState>,
    participant_id: String,
    path_id: Option<String>,
) -> Result<CampaignParticipant, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::set_participant_chosen_path(
        &conn,
        &participant_id,
        path_id.as_deref(),
    )?)
}

#[tauri::command]
pub fn upsert_campaign_meter(
    state: State<DbState>,
    participant_id: String,
    name: String,
    current_value: i32,
    description: Option<String>,
) -> Result<CampaignMeter, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::campaigns_core::upsert_meter(
        &conn,
        &id,
        &participant_id,
        &name,
        current_value,
        description.as_deref(),
    )?)
}

#[tauri::command]
pub fn remove_campaign_meter(
    state: State<DbState>,
    participant_id: String,
    name: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_core::remove_meter(&conn, &participant_id, &name)?)
}
