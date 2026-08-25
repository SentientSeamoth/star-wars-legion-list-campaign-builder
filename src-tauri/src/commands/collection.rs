//! Thin Tauri wrappers over db::queries::collection -- see
//! commands/_PURPOSE.md. No SQL and no business logic here; collection
//! tracking has none beyond what the schema's own CHECK constraints
//! enforce (see the design note in migrations/0002_collection.sql), so
//! there's no domain/ call to make either.

use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::{UnitOwnershipOverride, UserCollectionEntry, UserUnitOwnership};
use tauri::State;

#[tauri::command]
pub fn add_or_update_owned_expansion(
    state: State<DbState>,
    user_id: String,
    expansion_id: String,
    quantity_owned: u32,
    notes: Option<String>,
) -> Result<UserCollectionEntry, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::add_or_update_owned_expansion(
        &conn,
        &user_id,
        &expansion_id,
        quantity_owned,
        notes.as_deref(),
    )?)
}

#[tauri::command]
pub fn remove_owned_expansion(
    state: State<DbState>,
    user_id: String,
    expansion_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::remove_owned_expansion(
        &conn,
        &user_id,
        &expansion_id,
    )?)
}

#[tauri::command]
pub fn list_owned_expansions(
    state: State<DbState>,
    user_id: String,
) -> Result<Vec<UserCollectionEntry>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::list_owned_expansions(&conn, &user_id)?)
}

#[tauri::command]
pub fn set_unit_override(
    state: State<DbState>,
    user_id: String,
    unit_id: String,
    delta: i32,
    reason: Option<String>,
) -> Result<UnitOwnershipOverride, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::set_unit_override(
        &conn,
        &user_id,
        &unit_id,
        delta,
        reason.as_deref(),
    )?)
}

#[tauri::command]
pub fn remove_unit_override(
    state: State<DbState>,
    user_id: String,
    unit_id: String,
) -> Result<(), AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::remove_unit_override(
        &conn, &user_id, &unit_id,
    )?)
}

#[tauri::command]
pub fn list_unit_overrides(
    state: State<DbState>,
    user_id: String,
) -> Result<Vec<UnitOwnershipOverride>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::list_unit_overrides(&conn, &user_id)?)
}

#[tauri::command]
pub fn get_user_unit_ownership(
    state: State<DbState>,
    user_id: String,
) -> Result<Vec<UserUnitOwnership>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::collection::get_user_unit_ownership(
        &conn, &user_id,
    )?)
}
