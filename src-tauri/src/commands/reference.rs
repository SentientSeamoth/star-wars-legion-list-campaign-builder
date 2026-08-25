//! Read-only catalog lookups. These parse the same embedded data/*.json
//! content the DB was seeded from directly, rather than reverse-joining SQL
//! rows back into nested structs -- data/ is already the single source of
//! truth for catalog content (see docs/FILE_STRUCTURE.md), the DB is only
//! authoritative for user-owned state (see commands/collection.rs).

use crate::error::AppError;
use crate::types::{
    CommandCard, CommandCardLibrary, Expansion, ExpansionLibrary, Keyword, KeywordLibrary,
    ScenarioLibrary, ScenarioObjective, Unit, UnitLibrary, Upgrade, UpgradeLibrary,
};

const EXPANSIONS_JSON: &str = include_str!("../../../data/expansions.json");
const UNITS_JSON: &str = include_str!("../../../data/units.json");
const KEYWORDS_JSON: &str = include_str!("../../../data/keywords.json");
const UPGRADES_JSON: &str = include_str!("../../../data/upgrades.json");
const COMMAND_CARDS_JSON: &str = include_str!("../../../data/command-cards.json");
const SCENARIOS_JSON: &str = include_str!("../../../data/scenarios.json");

#[tauri::command]
pub fn list_expansions() -> Result<Vec<Expansion>, AppError> {
    let lib: ExpansionLibrary = serde_json::from_str(EXPANSIONS_JSON)?;
    Ok(lib.expansions)
}

#[tauri::command]
pub fn list_units() -> Result<Vec<Unit>, AppError> {
    let lib: UnitLibrary = serde_json::from_str(UNITS_JSON)?;
    Ok(lib.units)
}

#[tauri::command]
pub fn list_keywords() -> Result<Vec<Keyword>, AppError> {
    let lib: KeywordLibrary = serde_json::from_str(KEYWORDS_JSON)?;
    Ok(lib.keywords)
}

#[tauri::command]
pub fn list_upgrades() -> Result<Vec<Upgrade>, AppError> {
    let lib: UpgradeLibrary = serde_json::from_str(UPGRADES_JSON)?;
    Ok(lib.upgrades)
}

#[tauri::command]
pub fn list_command_cards() -> Result<Vec<CommandCard>, AppError> {
    let lib: CommandCardLibrary = serde_json::from_str(COMMAND_CARDS_JSON)?;
    Ok(lib.command_cards)
}

/// Flattens the library's 5 separate arrays (see ScenarioLibrary's own doc
/// comment for why the JSON keeps them separate) into one Vec -- each item
/// already carries its own `category`, so the frontend filters on that the
/// same way it already filters CommandCard by `category`/`commander_unit_id`.
#[tauri::command]
pub fn list_scenarios() -> Result<Vec<ScenarioObjective>, AppError> {
    let lib: ScenarioLibrary = serde_json::from_str(SCENARIOS_JSON)?;
    let mut all = Vec::new();
    all.extend(lib.primary_objectives);
    all.extend(lib.secondary_objectives);
    all.extend(lib.advantage_cards);
    all.extend(lib.recon_format_cards);
    all.extend(lib.official_narrative_scenarios);
    Ok(all)
}
