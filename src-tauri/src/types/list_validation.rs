//! Types for official-mode army-list rank validation. `RankRequirement`/
//! `RankRequirements`/`FactionsFile` are a deliberately PARTIAL model of
//! `data/factions.json` -- only the `standard_army_rank_requirements`
//! sub-object this feature actually needs, not the full file (unlike the
//! `*Library` wrapper types in the other type files, which model their
//! whole source file because commands/reference.rs hands the complete
//! parsed content back to the frontend). Extra JSON fields (`_meta`,
//! `factions`, the `text`/`verified`/`source` siblings inside
//! `standard_army_rank_requirements` itself) are simply ignored by serde
//! rather than modeled, since nothing here needs them.

use super::common::Rank;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, Deserialize)]
pub struct RankRequirement {
    pub min: Option<i32>,
    pub max: Option<i32>,
}

/// Mirrors `data/factions.json`'s `standard_army_rank_requirements`
/// object. No `attached` field -- deliberately unconstrained, see that
/// file's own `structure_note`.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct RankRequirements {
    pub commander: RankRequirement,
    pub operative: RankRequirement,
    pub corps: RankRequirement,
    pub special_forces: RankRequirement,
    pub support: RankRequirement,
    pub heavy: RankRequirement,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FactionsFile {
    pub standard_army_rank_requirements: RankRequirements,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationIssue {
    pub rank: Rank,
    pub message: String,
}
