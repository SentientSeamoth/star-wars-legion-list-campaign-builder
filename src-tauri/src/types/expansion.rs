//! Mirrors data/schema/expansion.schema.json and data/expansions.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProductType {
    CoreSet,
    UnitExpansion,
    CommanderExpansion,
    OperativeExpansion,
    BattleForceStarterSet,
    UpgradeCardPack,
    BattleCardPack,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpansionUnitEntry {
    pub unit_id: String,
    pub quantity: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expansion {
    pub id: String,
    pub name: String,
    pub product_type: ProductType,

    #[serde(default)]
    pub release_date: Option<String>,

    #[serde(default)]
    pub contains_units: Vec<ExpansionUnitEntry>,

    /// References Upgrade.id in data/upgrades.json.
    #[serde(default)]
    pub contains_upgrades: Vec<String>,

    /// References CommandCard.id in data/command-cards.json.
    #[serde(default)]
    pub contains_command_cards: Vec<String>,

    pub roster_verified: bool,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpansionLibraryMeta {
    pub description: String,
    pub product_types: Vec<String>,
    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,
}

/// Top-level shape of data/expansions.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpansionLibrary {
    #[serde(rename = "_meta")]
    pub meta: ExpansionLibraryMeta,
    pub expansions: Vec<Expansion>,
}
