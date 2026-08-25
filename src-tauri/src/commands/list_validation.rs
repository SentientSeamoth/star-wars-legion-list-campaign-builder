//! Thin Tauri wrapper combining a saved list's actual rank counts with
//! the real standard-army rank-requirement bounds and
//! domain::list_validation for the check itself. See commands/_PURPOSE.md
//! -- this file only orchestrates (load list, load units, load
//! requirements, call the pure domain function); no rule logic lives
//! here.
//!
//! Reuses commands::reference::list_units() rather than re-parsing
//! units.json a second time (it's already a `pub fn`, not just a
//! `#[tauri::command]` -- calling it directly is a normal Rust call, no
//! IPC involved).

use crate::commands::reference;
use crate::db::{queries, DbState};
use crate::domain::list_validation;
use crate::error::AppError;
use crate::types::common::Rank;
use crate::types::{FactionsFile, ValidationIssue};
use std::collections::HashMap;
use tauri::State;

const FACTIONS_JSON: &str = include_str!("../../../data/factions.json");

/// Only meaningful for official-mode lists -- freeform has no rank
/// constraints, so this returns an empty (never-failing) result for one
/// rather than making every caller remember to skip the check.
#[tauri::command]
pub fn validate_list(state: State<DbState>, list_id: String) -> Result<Vec<ValidationIssue>, AppError> {
    let conn = state.0.lock().expect("db mutex poisoned");
    let list = queries::lists::get_list_with_entries(&conn, &list_id)?;

    if list.list.mode != crate::types::ArmyListMode::Official {
        return Ok(Vec::new());
    }

    let units = reference::list_units()?;
    let rank_by_unit: HashMap<&str, Rank> = units.iter().map(|u| (u.id.as_str(), u.rank)).collect();

    let mut counts: HashMap<Rank, i32> = HashMap::new();
    for entry in &list.entries {
        if let Some(&rank) = rank_by_unit.get(entry.unit_id.as_str()) {
            *counts.entry(rank).or_insert(0) += entry.count;
        }
    }

    let factions_file: FactionsFile = serde_json::from_str(FACTIONS_JSON)?;
    Ok(list_validation::validate_rank_counts(
        &counts,
        &factions_file.standard_army_rank_requirements,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Confirms FactionsFile actually parses the REAL embedded
    /// data/factions.json, not just synthetic test fixtures (those live
    /// in domain::list_validation::tests) -- catches any drift between
    /// the Rust struct and the real, restructured JSON shape.
    #[test]
    fn parses_the_real_standard_army_rank_requirements() {
        let file: FactionsFile = serde_json::from_str(FACTIONS_JSON).unwrap();
        let req = file.standard_army_rank_requirements;
        assert_eq!((req.commander.min, req.commander.max), (Some(1), Some(2)));
        assert_eq!((req.operative.min, req.operative.max), (Some(0), Some(2)));
        assert_eq!((req.corps.min, req.corps.max), (Some(3), Some(6)));
        assert_eq!((req.special_forces.min, req.special_forces.max), (Some(0), Some(3)));
        assert_eq!((req.support.min, req.support.max), (Some(0), Some(3)));
        assert_eq!((req.heavy.min, req.heavy.max), (Some(0), Some(2)));
    }
}
