//! Crate root. Wires the layers described in docs/FILE_STRUCTURE.md
//! together: db/ owns storage, commands/ is the thin layer the frontend
//! actually calls. See each module's _PURPOSE.md for its own rules.

pub mod commands;
pub mod db;
pub mod domain;
pub mod error;
pub mod types;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_state = DbState::init(app.handle())?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::accounts::create_user,
            commands::accounts::list_users,
            commands::collection::add_or_update_owned_expansion,
            commands::collection::remove_owned_expansion,
            commands::collection::list_owned_expansions,
            commands::collection::set_unit_override,
            commands::collection::remove_unit_override,
            commands::collection::list_unit_overrides,
            commands::collection::get_user_unit_ownership,
            commands::lists::create_list,
            commands::lists::update_list_header,
            commands::lists::delete_list,
            commands::lists::list_lists_for_user,
            commands::lists::get_list_with_entries,
            commands::lists::add_list_entry,
            commands::lists::update_list_entry_count,
            commands::lists::update_list_entry_upgrades,
            commands::lists::remove_list_entry,
            commands::lists::add_list_command_card,
            commands::lists::remove_list_command_card,
            commands::lists::add_list_battle_deck_card,
            commands::lists::remove_list_battle_deck_card,
            commands::list_validation::validate_list,
            commands::reference::list_expansions,
            commands::reference::list_units,
            commands::reference::list_keywords,
            commands::reference::list_upgrades,
            commands::reference::list_command_cards,
            commands::reference::list_scenarios,
            commands::campaigns_core::create_campaign,
            commands::campaigns_core::update_campaign_header,
            commands::campaigns_core::delete_campaign,
            commands::campaigns_core::list_campaigns_for_user,
            commands::campaigns_core::add_campaign_participant,
            commands::campaigns_core::remove_campaign_participant,
            commands::campaigns_core::update_participant_credits,
            commands::campaigns_core::set_participant_chosen_path,
            commands::campaigns_core::upsert_campaign_meter,
            commands::campaigns_core::remove_campaign_meter,
            commands::campaigns_detail::get_campaign_detail,
            commands::campaigns_content::add_campaign_path,
            commands::campaigns_content::update_campaign_path,
            commands::campaigns_content::remove_campaign_path,
            commands::campaigns_content::add_campaign_mission,
            commands::campaigns_content::update_campaign_mission,
            commands::campaigns_content::set_campaign_mission_status,
            commands::campaigns_content::remove_campaign_mission,
            commands::campaigns_content::add_campaign_mission_outcome,
            commands::campaigns_content::update_campaign_mission_outcome,
            commands::campaigns_content::remove_campaign_mission_outcome,
            commands::campaigns_content::add_campaign_upgrade_option,
            commands::campaigns_content::update_campaign_upgrade_option,
            commands::campaigns_content::remove_campaign_upgrade_option,
            commands::campaigns_content::add_campaign_store_item,
            commands::campaigns_content::update_campaign_store_item,
            commands::campaigns_content::remove_campaign_store_item,
            commands::campaigns_content::add_campaign_store_item_modifier,
            commands::campaigns_content::remove_campaign_store_item_modifier,
            commands::campaigns_play::add_roster_entry,
            commands::campaigns_play::update_roster_entry_upgrades,
            commands::campaigns_play::record_roster_casualty,
            commands::campaigns_play::set_roster_entry_retired,
            commands::campaigns_play::remove_roster_entry,
            commands::campaigns_play::purchase_store_item,
            commands::campaigns_play::purchase_upgrade_option,
            commands::campaigns_play::list_battle_reports_for_mission,
            commands::campaigns_play::log_battle_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
