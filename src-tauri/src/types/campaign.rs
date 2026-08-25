//! Mirrors the `campaign_*` tables in
//! src-tauri/migrations/0003_campaigns.sql. Not backed by a JSON seed
//! file -- user-authored campaign content and played state, same category
//! as army_list.rs/collection.rs/user.rs.
//!
//! GOVERNING PRINCIPLE (see docs/DECISIONS.md's 2026-08-24 Campaign Mode
//! entry): this is a bookkeeping/journal system, not a rules engine.
//! Countable facts get real typed fields; bespoke narrative/mechanical
//! text this app doesn't simulate (path fluff, custom battle mechanics,
//! upgrade effects) is a plain `Option<String>` the GM authors by hand.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CampaignMode {
    Solo,
    TwoPlayer,
    GmPlayer,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CampaignStatus {
    Active,
    Completed,
    Abandoned,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ParticipantRole {
    Player,
    Gm,
    Opponent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MissionStatus {
    NotStarted,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Campaign {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub summary: Option<String>,
    pub mode: CampaignMode,
    pub status: CampaignStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignPath {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    #[serde(default)]
    pub style_summary: Option<String>,
    #[serde(default)]
    pub narrative: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignParticipant {
    pub id: String,
    pub campaign_id: String,
    pub user_id: String,
    pub role: ParticipantRole,
    #[serde(default)]
    pub side_name: Option<String>,
    pub credits_balance: i32,
    #[serde(default)]
    pub chosen_path_id: Option<String>,
    /// Implements the confirmed non-banking upgrade-purchase rule -- see
    /// domain::campaign_rules::can_purchase_upgrade.
    pub upgrade_purchase_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignMission {
    pub id: String,
    pub campaign_id: String,
    #[serde(default)]
    pub path_id: Option<String>,
    pub name: String,
    pub sort_order: i32,
    #[serde(default)]
    pub setup_narrative: Option<String>,
    #[serde(default)]
    pub objectives: Option<String>,
    #[serde(default)]
    pub battle_mechanics: Option<String>,
    pub status: MissionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignMissionOutcome {
    pub id: String,
    pub mission_id: String,
    pub condition_label: String,
    pub reward_credits: i32,
    #[serde(default)]
    pub reward_notes: Option<String>,
    pub sort_order: i32,
}

/// A mission plus its possible outcomes -- avoids a second round trip per
/// mission when loading the campaign-detail aggregate below.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignMissionWithOutcomes {
    #[serde(flatten)]
    pub mission: CampaignMission,
    pub outcomes: Vec<CampaignMissionOutcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignRosterEntry {
    pub id: String,
    pub participant_id: String,
    /// Nullable, matching CampaignStoreItem.unit_id -- a roster entry
    /// bought from a store item that doesn't map to a catalogued unit
    /// still gets a row; display falls back to nickname/the store item's
    /// display_name.
    #[serde(default)]
    pub unit_id: Option<String>,
    #[serde(default)]
    pub nickname: Option<String>,
    pub models_total: i32,
    pub models_lost: i32,
    pub is_specialty: bool,

    /// Typed form of the `upgrades_json` TEXT column, same pattern as
    /// ArmyListEntry.upgrades in army_list.rs.
    #[serde(default)]
    pub upgrades: Vec<String>,

    #[serde(default)]
    pub acquired_mission_id: Option<String>,
    pub retired: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignBattleReportCasualty {
    pub id: String,
    pub battle_report_id: String,
    #[serde(default)]
    pub roster_entry_id: Option<String>,
    pub label: String,
    pub models_lost: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignBattleReport {
    pub id: String,
    pub mission_id: String,
    pub participant_id: String,
    #[serde(default)]
    pub narrative: Option<String>,
    pub credits_awarded: i32,
    #[serde(default)]
    pub notes: Option<String>,
    pub created_at: String,
    pub outcome_ids: Vec<String>,
    pub casualties: Vec<CampaignBattleReportCasualty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignMeter {
    pub id: String,
    pub participant_id: String,
    pub name: String,
    pub current_value: i32,
    #[serde(default)]
    pub description: Option<String>,
}

/// `tier` is the source material's "N Points" label -- confirmed with the
/// project owner to be a power/tier label only, not a spendable currency
/// (see docs/DECISIONS.md). Purchase eligibility is gated entirely by
/// CampaignParticipant.upgrade_purchase_available, not by this value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignUpgradeOption {
    pub id: String,
    pub campaign_id: String,
    /// NULL = a "core" upgrade available regardless of chosen path.
    #[serde(default)]
    pub path_id: Option<String>,
    pub name: String,
    pub tier: i32,
    #[serde(default)]
    pub effect: Option<String>,
    /// A unique narrative-triggered unlock (e.g. defeating a named
    /// rival), rather than a normal store-style purchase.
    pub is_trophy: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignStoreItemModifier {
    pub id: String,
    pub store_item_id: String,
    pub label: String,
    pub cost: i32,
    pub sort_order: i32,
}

/// Confirmed with the project owner: `unlock_spend_threshold` gates
/// purchasability on the participant's CUMULATIVE credits spent (see
/// campaign_participant_totals in the migration) -- reaching it does not
/// grant the item for free, `base_cost` is still charged. `modifiers` are
/// a genuinely open list (not a fixed 2-slot shape) -- see the migration's
/// comment on campaign_store_item_modifiers for why.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignStoreItem {
    pub id: String,
    pub campaign_id: String,
    #[serde(default)]
    pub unit_id: Option<String>,
    pub display_name: String,
    pub base_cost: i32,
    #[serde(default)]
    pub unlock_spend_threshold: Option<i32>,
    pub unlock_only: bool,
    #[serde(default)]
    pub max_count: Option<i32>,
    pub sort_order: i32,
    pub modifiers: Vec<CampaignStoreItemModifier>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignPurchase {
    pub id: String,
    pub participant_id: String,
    pub store_item_id: String,
    #[serde(default)]
    pub roster_entry_id: Option<String>,
    pub credits_spent: i32,
    pub purchased_at: String,
}

/// Flat participant-id/upgrade-option-id pairs -- the frontend joins these
/// against `upgrade_options` itself, same "ids only" pattern
/// ArmyListWithEntries uses for command_cards/battle_deck.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantUpgrade {
    pub participant_id: String,
    pub upgrade_option_id: String,
}

/// Command-input shape for one casualty line in `log_battle_report` --
/// not a persisted row on its own (id/battle_report_id are filled in
/// during processing); see commands/campaigns_play.rs.
#[derive(Debug, Clone, Deserialize)]
pub struct CasualtyInput {
    pub label: String,
    pub models_lost: i32,
    #[serde(default)]
    pub roster_entry_id: Option<String>,
}

/// Return shape of `purchase_store_item` -- a purchase always creates
/// exactly one new roster entry (see commands/campaigns_play.rs).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseResult {
    pub purchase: CampaignPurchase,
    pub roster_entry: CampaignRosterEntry,
}

/// The full aggregate a campaign's dashboard screen loads in one call --
/// mirrors ArmyListWithEntries's "one GET assembles everything the screen
/// needs" idiom.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CampaignDetail {
    #[serde(flatten)]
    pub campaign: Campaign,
    pub participants: Vec<CampaignParticipant>,
    pub paths: Vec<CampaignPath>,
    pub missions: Vec<CampaignMissionWithOutcomes>,
    pub roster_entries: Vec<CampaignRosterEntry>,
    pub meters: Vec<CampaignMeter>,
    pub upgrade_options: Vec<CampaignUpgradeOption>,
    pub participant_upgrades: Vec<ParticipantUpgrade>,
    pub store_items: Vec<CampaignStoreItem>,
    /// Raw purchase log across every participant -- lets the frontend
    /// derive each participant's cumulative spend (for unlock-threshold
    /// progress display) without a dedicated command, same "ids/rows
    /// only, frontend joins" pattern as participant_upgrades.
    pub purchases: Vec<CampaignPurchase>,
    /// Every battle report across the whole campaign (not just one
    /// mission) -- backs the Story tab's chronological writeup.
    pub battle_reports: Vec<CampaignBattleReport>,
}
