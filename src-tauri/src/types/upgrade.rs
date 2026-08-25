//! Mirrors data/schema/upgrade.schema.json and data/upgrades.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UpgradeCategory {
    Armament,
    Command,
    Comms,
    Crew,
    Force,
    Gear,
    Generator,
    Grenades,
    Hardpoint,
    #[serde(rename = "heavy-weapon")]
    HeavyWeapon,
    Ordnance,
    Personnel,
    Programming,
    Pilot,
    Training,
    /// New card sub-type as of the Sept 2025 Customizable Jedi General/Knight
    /// kit. Flagged provisional in data/upgrades.json's _meta -- confirm this
    /// is really a distinct category (vs a Training subtype) before relying
    /// on it. See docs/TODO.md.
    Doctrine,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UpgradeRestriction {
    Generic,
    Faction,
    Character,
    Affiliation,
    #[serde(rename = "battle-force")]
    BattleForce,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Upgrade {
    pub id: String,
    pub name: String,
    pub category: UpgradeCategory,
    pub unique_card: bool,
    pub restriction: UpgradeRestriction,

    /// String, array of strings, or null in the source JSON depending on
    /// scope (a single faction id vs multiple unit ids, etc). Left as raw
    /// JSON here rather than forcing a shape -- narrow this once real
    /// faction/unit-specific cards are populated and the actual pattern is
    /// clear.
    #[serde(default)]
    pub restricted_to: Option<Value>,

    #[serde(default)]
    pub points: Option<i32>,

    pub points_verified: bool,

    #[serde(default)]
    pub effect_description: Option<String>,

    pub effect_verified: bool,

    /// References Keyword.id values in data/keywords.json (not yet enforced
    /// as a cross-reference at build time the way command_card's
    /// commander_unit_id is -- add that check once this field is populated).
    #[serde(default)]
    pub keywords_granted: Option<Vec<String>>,

    #[serde(default)]
    pub weapon_profile: Option<Value>,

    #[serde(default)]
    pub source: Option<String>,

    pub roster_verified: bool,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeLibraryMeta {
    pub description: String,
    pub categories: Vec<String>,

    #[serde(default)]
    pub categories_source: Option<String>,

    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,
}

/// Top-level shape of data/upgrades.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeLibrary {
    #[serde(rename = "_meta")]
    pub meta: UpgradeLibraryMeta,
    pub upgrades: Vec<Upgrade>,
}
