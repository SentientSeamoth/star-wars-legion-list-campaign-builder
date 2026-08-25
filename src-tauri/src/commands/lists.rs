//! Thin Tauri wrappers over db::queries::lists -- see commands/_PURPOSE.md.
//! `mode`/`faction` are taken as plain strings, not the typed
//! ArmyListMode/Faction enums: validation is entirely the schema's CHECK
//! constraints (same principle as every other command in this app), so
//! there's nothing to enforce here before handing the value to SQL.

use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::{ArmyList, ArmyListEntry, ArmyListWithEntries};
use tauri::State;

#[tauri::command]
pub fn create_list(
    state: State<DbState>,
    user_id: String,
    name: String,
    mode: String,
    faction: Option<String>,
) -> Result<ArmyList, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::lists::create_list(
        &conn,
        &id,
        &user_id,
        &name,
        &mode,
        faction.as_deref(),
    )?)
}

#[tauri::command]
pub fn update_list_header(
    state: State<DbState>,
    list_id: String,
    name: String,
    mode: String,
    faction: Option<String>,
) -> Result<ArmyList, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::update_list_header(
        &conn,
        &list_id,
        &name,
        &mode,
        faction.as_deref(),
    )?)
}

#[tauri::command]
pub fn delete_list(state: State<DbState>, list_id: String) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::delete_list(&conn, &list_id)?)
}

#[tauri::command]
pub fn list_lists_for_user(
    state: State<DbState>,
    user_id: String,
) -> Result<Vec<ArmyList>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::list_lists_for_user(&conn, &user_id)?)
}

#[tauri::command]
pub fn get_list_with_entries(
    state: State<DbState>,
    list_id: String,
) -> Result<ArmyListWithEntries, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::get_list_with_entries(&conn, &list_id)?)
}

#[tauri::command]
pub fn add_list_entry(
    state: State<DbState>,
    list_id: String,
    unit_id: String,
) -> Result<ArmyListEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::add_entry(&conn, &list_id, &unit_id)?)
}

#[tauri::command]
pub fn update_list_entry_count(
    state: State<DbState>,
    entry_id: i64,
    count: i32,
) -> Result<ArmyListEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::update_entry_count(&conn, entry_id, count)?)
}

#[tauri::command]
pub fn remove_list_entry(state: State<DbState>, entry_id: i64) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::remove_entry(&conn, entry_id)?)
}

#[tauri::command]
pub fn update_list_entry_upgrades(
    state: State<DbState>,
    entry_id: i64,
    upgrade_ids: Vec<String>,
) -> Result<ArmyListEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::update_entry_upgrades(
        &conn,
        entry_id,
        &upgrade_ids,
    )?)
}

#[tauri::command]
pub fn add_list_command_card(
    state: State<DbState>,
    list_id: String,
    command_card_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::add_command_card(
        &conn,
        &list_id,
        &command_card_id,
    )?)
}

#[tauri::command]
pub fn remove_list_command_card(
    state: State<DbState>,
    list_id: String,
    command_card_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::remove_command_card(
        &conn,
        &list_id,
        &command_card_id,
    )?)
}

#[tauri::command]
pub fn add_list_battle_deck_card(
    state: State<DbState>,
    list_id: String,
    scenario_objective_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::add_battle_deck_card(
        &conn,
        &list_id,
        &scenario_objective_id,
    )?)
}

#[tauri::command]
pub fn remove_list_battle_deck_card(
    state: State<DbState>,
    list_id: String,
    scenario_objective_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::lists::remove_battle_deck_card(
        &conn,
        &list_id,
        &scenario_objective_id,
    )?)
}
