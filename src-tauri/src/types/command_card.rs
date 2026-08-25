//! Mirrors data/schema/command-card.schema.json and data/command-cards.json.
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use super::common::{Faction, IntOrText};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CommandCardCategory {
    Generic,
    CommanderSpecific,
}

/// Only meaningful when `commander_unit_ids` has 2+ entries -- see that
/// field's doc comment. Added 2026-08-25 when real card data (joint-owner
/// cards like "Fifth Brother & Seventh Sister" vs. either-owner cards like
/// "Jedi Knight or Jedi Knight General") proved a single nullable id
/// couldn't represent every card's real ownership shape.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CommandCardOwnership {
    All,
    Any,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandCard {
    pub id: String,
    pub name: String,
    pub category: CommandCardCategory,

    /// References Unit.id(s) in data/units.json. Empty = not yet resolved
    /// to a real unit -- a documented gap (see the card's `notes`), not a
    /// claim that the card has no owner. One entry is the common case for
    /// a resolved commander-specific card. Two entries means either joint
    /// ownership (both required) or either-ownership (one suffices) --
    /// see `commander_ownership`. Real per-row foreign keys into
    /// `units(id)` are enforced via the `command_card_commanders` join
    /// table (migrations/0005_command_card_commanders.sql), not just a
    /// convention -- was a single `Option<String>` column before this.
    #[serde(default)]
    pub commander_unit_ids: Vec<String>,

    #[serde(default)]
    pub commander_ownership: Option<CommandCardOwnership>,

    /// `None` where a current primary source did not expose the printed
    /// pip value at data-build time (see the card's `notes`) -- added
    /// 2026-08-24 when a real command-card expansion pass produced several
    /// such cards. Was a bare `u8` before this.
    #[serde(default)]
    pub pips: Option<u8>,

    #[serde(default)]
    pub units_activated: Option<IntOrText>,

    #[serde(default)]
    pub unit_activation_restriction: Option<String>,

    #[serde(default)]
    pub faction_restriction: Option<Faction>,

    #[serde(default)]
    pub battle_force_restriction: Option<String>,

    #[serde(default)]
    pub effect_description: Option<String>,

    pub effect_verified: bool,
    pub roster_verified: bool,

    #[serde(default)]
    pub roster_source: Option<String>,

    #[serde(default)]
    pub source: Option<String>,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandCardLibraryMeta {
    pub description: String,
    pub command_hand_rule: String,
    pub command_hand_rule_verified: bool,
    pub priority_rule: String,
    pub priority_rule_verified: bool,
    pub last_reviewed: String,

    #[serde(default)]
    pub verification_status: Option<String>,
}

/// Top-level shape of data/command-cards.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandCardLibrary {
    #[serde(rename = "_meta")]
    pub meta: CommandCardLibraryMeta,
    pub command_cards: Vec<CommandCard>,
}
