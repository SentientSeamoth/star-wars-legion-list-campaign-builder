//! Shared enum types referenced by more than one data type in this module.
//! Defining these once here (rather than per-file) is the concrete
//! implementation of the "single source of truth" rule in
//! docs/FILE_STRUCTURE.md -- e.g. `Faction` is used by both `unit::Unit`
//! and `command_card::CommandCard`, so it can't drift between the two.
//!
//! NOTE: this file has NOT been compiled. The sandbox that generated it has
//! no Rust toolchain (no `rustc`/`cargo`, no network to fetch crates), so
//! this is hand-written, carefully-reviewed Rust that has not been checked
//! by the compiler. Treat it as a strong starting draft, not a guarantee --
//! CC should run `cargo check` as the very first step after receiving this
//! file. See docs/TODO.md.

use serde::{Deserialize, Serialize};

/// RENAMED 2026-08-23: the fifth variant was `Mercenary`, now
/// `ShadowCollective` (serializes "shadow_collective"), per explicit
/// instruction reflected in data/units.json. `rename_all` is `snake_case`
/// rather than `lowercase` specifically so this multi-word variant
/// serializes with the underscore -- the single-word variants are
/// unaffected either way. data/factions.json and battle-forces.json were
/// reconciled to `shadow_collective` too (2026-08-23, see
/// docs/DECISIONS.md); data/affiliations.json deliberately still says
/// "mercenary" -- that's the real, distinct Legion affiliation/keyword
/// term for hireable unaligned units (see data/keywords.json's
/// "mercenary" entry), not this enum's id, and was left alone on
/// purpose. None of the three files are consumed by this enum, so
/// neither was ever a parse-time issue.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Faction {
    Empire,
    Separatist,
    Rebel,
    Republic,
    ShadowCollective,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Rank {
    Commander,
    Operative,
    Corps,
    SpecialForces,
    Support,
    Heavy,
    /// Companion/detachment units not independently chosen in list
    /// building (e.g. Grogu, Omega, Iden's ID10 Seeker Droid) -- added
    /// 2026-08-23 when real card-extraction data included units of this
    /// kind. See data/schema/unit.schema.json's description.
    Attached,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UnitType {
    Trooper,
    Vehicle,
    Droid,
    Creature,
    Emplacement,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Legality {
    Active,
    Removed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DefenseDie {
    White,
    Red,
}

/// `army_lists.mode` -- CHECK-constrained in 0001_init.sql the same way
/// Faction/Rank/etc. are, so it gets a typed enum rather than a raw
/// String, matching every other constrained field in this module.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ArmyListMode {
    Official,
    Freeform,
}

/// Some fields in the seed JSON (e.g. Unit.stats.courage, CommandCard.units_activated)
/// are "usually an integer, but sometimes a short descriptive string" in the source
/// data, because a handful of advanced cards use conditional wording instead of a
/// flat number. Modeled here as an untagged enum so both shapes deserialize cleanly
/// without forcing every normal case through a string.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum IntOrText {
    Int(i64),
    Text(String),
}
