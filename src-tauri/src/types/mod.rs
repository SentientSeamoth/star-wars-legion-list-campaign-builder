//! Canonical data types for the Legion app. See _PURPOSE.md in this
//! directory and docs/FILE_STRUCTURE.md's "Type generation" section.
//!
//! These structs are the single source of truth for data shape. Once
//! tauri-specta (or ts-rs -- see docs/TODO.md for the still-open tooling
//! choice) is wired up, TypeScript types in src/lib/types/generated.ts
//! should be generated FROM these, not hand-written to match them.
//!
//! Until that pipeline exists, src/lib/types/manual_seed.ts is a hand-written
//! mirror of these structs, clearly marked temporary. Keep the two in sync
//! by hand in the meantime, and replace manual_seed.ts entirely once codegen
//! is set up -- don't let both exist long-term.

pub mod army_list;
pub mod campaign;
pub mod collection;
pub mod command_card;
pub mod common;
pub mod expansion;
pub mod keyword;
pub mod list_validation;
pub mod scenario;
pub mod unit;
pub mod upgrade;
pub mod user;

pub use army_list::{ArmyList, ArmyListEntry, ArmyListWithEntries};
pub use campaign::{
    Campaign, CampaignBattleReport, CampaignBattleReportCasualty, CampaignDetail,
    CampaignMeter, CampaignMission, CampaignMissionOutcome, CampaignMissionWithOutcomes,
    CampaignMode, CampaignParticipant, CampaignPath, CampaignPurchase, CampaignRosterEntry,
    CampaignStatus, CampaignStoreItem, CampaignStoreItemModifier, CampaignUpgradeOption,
    CasualtyInput, MissionStatus, ParticipantRole, ParticipantUpgrade, PurchaseResult,
};
pub use collection::{UnitOwnershipOverride, UserCollectionEntry, UserUnitOwnership};
pub use command_card::{CommandCard, CommandCardCategory, CommandCardLibrary};
pub use common::{ArmyListMode, DefenseDie, Faction, IntOrText, Legality, Rank, UnitType};
pub use expansion::{Expansion, ExpansionLibrary, ExpansionUnitEntry, ProductType};
pub use keyword::{Keyword, KeywordLibrary, KeywordType};
pub use list_validation::{FactionsFile, RankRequirement, RankRequirements, ValidationIssue};
pub use scenario::{GameFormat, ObjectiveCategory, ScenarioLibrary, ScenarioObjective};
pub use unit::{Unit, UnitLibrary, UnitStats};
pub use upgrade::{Upgrade, UpgradeCategory, UpgradeLibrary, UpgradeRestriction};
pub use user::User;
