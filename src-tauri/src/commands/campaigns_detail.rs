//! Thin Tauri wrapper over db::queries::campaigns_detail -- see
//! commands/_PURPOSE.md. Split into its own file since it's a distinct
//! "read the whole campaign" concern from campaigns_core.rs's CRUD.

use crate::db::{queries, DbState};
use crate::error::AppError;
use crate::types::CampaignDetail;
use tauri::State;

#[tauri::command]
pub fn get_campaign_detail(
    state: State<DbState>,
    campaign_id: String,
) -> Result<CampaignDetail, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    Ok(queries::campaigns_detail::get_campaign_detail(&conn, &campaign_id)?)
}
