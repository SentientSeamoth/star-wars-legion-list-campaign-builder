use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::User;
use tauri::State;

#[tauri::command]
pub fn create_user(state: State<DbState>, display_name: String) -> Result<User, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let id = uuid::Uuid::new_v4().to_string();
    Ok(queries::accounts::create_user(&conn, &id, &display_name)?)
}

#[tauri::command]
pub fn list_users(state: State<DbState>) -> Result<Vec<User>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::accounts::list_users(&conn)?)
}
