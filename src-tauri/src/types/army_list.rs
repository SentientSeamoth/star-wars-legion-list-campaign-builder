//! Mirrors the `army_lists`/`army_list_entries`/`army_list_command_cards`/
//! `army_list_battle_deck` tables in src-tauri/migrations/0001_init.sql.
//! Not backed by a JSON seed file -- app-state, like the types in
//! collection.rs and user.rs.

use super::common::{ArmyListMode, Faction};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArmyList {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub mode: ArmyListMode,

    #[serde(default)]
    pub faction: Option<Faction>,

    pub points_total: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArmyListEntry {
    pub id: i64,
    pub list_id: String,
    pub unit_id: String,
    pub count: i32,

    /// Typed form of the `upgrades_json` TEXT column -- parsed/serialized
    /// in db/queries/lists.rs. Wired end-to-end so future upgrade-picking
    /// UI doesn't need a schema or type change, even though nothing
    /// populates it yet.
    #[serde(default)]
    pub upgrades: Vec<String>,
}

/// The shape the frontend actually wants when loading a saved list into
/// the builder: the list's own fields plus its entries, picked command
/// cards (references CommandCard.id in data/command-cards.json), and
/// picked battle-deck cards (references ScenarioObjective.id in
/// data/scenarios.json) in one response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArmyListWithEntries {
    #[serde(flatten)]
    pub list: ArmyList,
    pub entries: Vec<ArmyListEntry>,
    pub command_cards: Vec<String>,
    pub battle_deck: Vec<String>,
}
