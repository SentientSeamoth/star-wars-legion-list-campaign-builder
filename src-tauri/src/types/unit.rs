//! Mirrors data/schema/unit.schema.json and data/units.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use super::common::{DefenseDie, Faction, IntOrText, Legality, Rank, UnitType};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// All numeric/mechanical card stats. Every field is optional because, as of
/// this handoff, NONE of them are populated in data/units.json -- see
/// `stats_verified` on the parent Unit and docs/TODO.md. The shape exists so
/// the rest of the app (list validation, card rendering) can be built against
/// a stable contract before the numbers themselves are sourced.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UnitStats {
    #[serde(default)]
    pub base_count: Option<i32>,

    #[serde(default)]
    pub base_size: Option<String>,

    #[serde(default)]
    pub points: Option<i32>,

    /// Independent of the coarser `Unit.stats_verified` -- a unit can have
    /// a confirmed points cost while still missing speed/defense/surge
    /// (see the Rebel/Separatist/Shadow Collective extraction batches in
    /// docs/TODO.md), so this is the field to gate honest point-cost UI
    /// display on, not `stats_verified`.
    #[serde(default)]
    pub points_verified: bool,

    #[serde(default)]
    pub points_source: Option<String>,

    #[serde(default)]
    pub wound_threshold: Option<i32>,

    #[serde(default)]
    pub courage: Option<IntOrText>,

    /// Distinct from `courage` -- vehicles use resilience per real card
    /// data, mutually exclusive with courage in practice.
    #[serde(default)]
    pub resilience: Option<i32>,

    #[serde(default)]
    pub speed: Option<i32>,

    #[serde(default)]
    pub defense_die: Option<DefenseDie>,

    #[serde(default)]
    pub attack_surge: Option<String>,

    #[serde(default)]
    pub defense_surge: Option<String>,

    /// Loosely typed on purpose: a surge chart's shape (which faces convert to
    /// what) isn't finalized yet. Tighten this to a real struct once the first
    /// real unit's stats are transcribed and the shape is actually known.
    #[serde(default)]
    pub surge_chart: Option<Value>,

    #[serde(default)]
    pub weapons: Option<Value>,

    #[serde(default)]
    pub weapons_verified: bool,

    /// Raw printed keyword strings (e.g. "Full Pivot", "Precise 1") --
    /// NOT resolved ids into data/keywords.json. See
    /// `keywords_resolved_to_library` below and the note in
    /// db/seed.rs::seed_units on why this is stored as a JSON blob
    /// (`keywords_json`) rather than written into the `unit_keywords`
    /// join table.
    #[serde(default)]
    pub keywords: Option<Vec<String>>,

    /// false means `keywords` above is raw printed text, not
    /// cross-referenced against data/keywords.json ids. True for every
    /// unit as of the 2026-08-23 card-extraction batches -- resolving
    /// these is real, tracked future work (docs/TODO.md).
    #[serde(default)]
    pub keywords_resolved_to_library: bool,

    #[serde(default)]
    pub upgrade_bar: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Unit {
    pub id: String,
    pub name: String,

    /// Flavor title printed under the name (e.g. "Master Tactician"),
    /// distinct from the parenthetical variant tags already folded into
    /// some units' `name` (e.g. "Stormtroopers (Heavy Response Unit)").
    #[serde(default)]
    pub subtitle: Option<String>,

    pub unique: bool,

    #[serde(default)]
    pub unique_verified: Option<bool>,

    pub factions: Vec<Faction>,

    #[serde(default)]
    pub affiliation: Option<String>,

    #[serde(default)]
    pub affiliation_verified: Option<bool>,

    pub rank: Rank,
    pub unit_types: Vec<UnitType>,

    #[serde(default)]
    pub unit_types_verified: Option<bool>,

    pub legality: Legality,
    pub roster_verified: bool,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub roster_source_note: Option<String>,

    pub stats: UnitStats,
    pub stats_verified: bool,

    #[serde(default)]
    pub stats_note: Option<String>,

    #[serde(default)]
    pub expansion: Option<String>,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitLibraryMeta {
    pub description: String,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub roster_fetched: Option<String>,

    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,

    #[serde(default)]
    pub mercenary_faction_note: Option<String>,
}

/// Top-level shape of data/units.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitLibrary {
    #[serde(rename = "_meta")]
    pub meta: UnitLibraryMeta,
    pub units: Vec<Unit>,
}
