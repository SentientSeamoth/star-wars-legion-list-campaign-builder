//! Mirrors data/schema/scenario.schema.json and data/scenarios.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ObjectiveCategory {
    Primary,
    Secondary,
    Advantage,
    Recon,
    NarrativeScenario,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GameFormat {
    #[serde(rename = "standard-1000")]
    Standard1000,
    #[serde(rename = "recon-600")]
    Recon600,
    Narrative,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioObjective {
    pub id: String,
    pub name: String,
    pub category: ObjectiveCategory,
    pub game_format: GameFormat,
    pub game_format_verified: bool,
    pub roster_verified: bool,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub map_card: Option<String>,

    #[serde(default)]
    pub deployment_note: Option<String>,

    #[serde(default)]
    pub points_of_interest: Option<Value>,

    pub points_of_interest_verified: bool,

    #[serde(default)]
    pub victory_condition: Option<String>,

    pub victory_condition_verified: bool,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioLibraryMeta {
    pub description: String,

    #[serde(default)]
    pub deprecated_system_warning: Option<String>,

    #[serde(default)]
    pub distinct_from_campaigns_feature: Option<String>,

    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,
}

/// Top-level shape of data/scenarios.json. Five separate lists rather than
/// one flat array with a category filter, matching the JSON file directly --
/// keeps "which deck does this belong to" unambiguous at the type level.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioLibrary {
    #[serde(rename = "_meta")]
    pub meta: ScenarioLibraryMeta,
    pub primary_objectives: Vec<ScenarioObjective>,
    pub secondary_objectives: Vec<ScenarioObjective>,
    pub advantage_cards: Vec<ScenarioObjective>,
    pub recon_format_cards: Vec<ScenarioObjective>,
    pub official_narrative_scenarios: Vec<ScenarioObjective>,
}
