/**
 * TEMPORARY, HAND-WRITTEN mirror of src-tauri/src/types/*.rs.
 *
 * This file exists so the frontend has real types to build against before
 * a Rust->TypeScript codegen pipeline (tauri-specta or ts-rs -- see
 * docs/TODO.md, the tooling choice is still open) is wired up.
 *
 * RULES:
 * - Do NOT let this file quietly become the permanent source of truth.
 *   Once codegen exists, delete this file entirely and replace all its
 *   imports with imports from generated.ts. Don't let both files exist
 *   side by side long-term -- that's exactly the drift
 *   docs/FILE_STRUCTURE.md's "Type generation" section exists to prevent.
 * - Field names intentionally match the Rust struct fields (and therefore
 *   the JSON) exactly, snake_case included, rather than converting to
 *   camelCase -- so a straight visual diff against the .rs files is
 *   possible. Decide on a naming convention when real codegen is set up;
 *   tauri-specta defaults to preserving Rust field names as-is unless
 *   configured otherwise.
 * - This file has not been typechecked against a real TypeScript compiler
 *   in this environment (no Node/tsc available in the sandbox that
 *   generated it). Review it and run `tsc --noEmit` as an early step.
 */

// ---------- shared / common.rs ----------

// RENAMED 2026-08-23: "mercenary" -> "shadow_collective", matching
// types/common.rs::Faction. See docs/DECISIONS.md.
export type Faction = "empire" | "separatist" | "rebel" | "republic" | "shadow_collective";
// "attached" added 2026-08-23 for companion/detachment units (e.g. Grogu,
// Omega) not independently chosen in list building.
export type Rank = "commander" | "operative" | "corps" | "special-forces" | "support" | "heavy" | "attached";
export type UnitType = "trooper" | "vehicle" | "droid" | "creature" | "emplacement";
export type Legality = "active" | "removed";
export type DefenseDie = "white" | "red";
export type IntOrText = number | string;

// ---------- keyword.rs ----------

export type KeywordType = "unit" | "weapon" | "upgrade";

export interface Keyword {
  id: string;
  name: string;
  type: KeywordType;
  parameterized: boolean;
  stacks: boolean | null;
  description: string;
  rules_note?: string;
  verified?: boolean;
  verification_note?: string;
}

export interface KeywordLibrary {
  _meta: {
    description: string;
    source_notes?: string;
    rules_baseline: string;
    last_reviewed: string;
    verification_status?: string;
  };
  keywords: Keyword[];
}

// ---------- unit.rs ----------

export interface UnitStats {
  base_count: number | null;
  base_size: string | null;
  points: number | null;
  /** Independent of the coarser Unit.stats_verified -- gate honest
   *  point-cost display on this, not stats_verified. Added 2026-08-23. */
  points_verified: boolean;
  points_source: string | null;
  wound_threshold: number | null;
  courage: IntOrText | null;
  /** Distinct from courage -- vehicles use this instead. Added 2026-08-23. */
  resilience: number | null;
  speed: number | null;
  defense_die: DefenseDie | null;
  attack_surge: string | null;
  defense_surge: string | null;
  surge_chart: unknown | null;
  weapons: unknown | null;
  weapons_verified: boolean;
  /** Raw printed keyword strings (e.g. "Full Pivot") -- NOT resolved ids
   *  into keywords.json. See keywords_resolved_to_library. */
  keywords: string[] | null;
  keywords_resolved_to_library: boolean;
  upgrade_bar: string[] | null;
}

export interface Unit {
  id: string;
  name: string;
  /** Flavor title under the name, e.g. "Master Tactician". Added 2026-08-23. */
  subtitle?: string | null;
  unique: boolean;
  unique_verified?: boolean;
  factions: Faction[];
  affiliation: string | null;
  affiliation_verified?: boolean;
  rank: Rank;
  unit_types: UnitType[];
  unit_types_verified?: boolean;
  legality: Legality;
  roster_verified: boolean;
  roster_source?: string;
  roster_source_note?: string;
  stats: UnitStats;
  stats_verified: boolean;
  stats_note?: string;
  expansion: string | null;
  notes: string | null;
}

export interface UnitLibrary {
  _meta: {
    description: string;
    roster_source?: string;
    roster_fetched?: string;
    last_reviewed: string;
    verification_status?: string;
    mercenary_faction_note?: string;
  };
  units: Unit[];
}

// ---------- upgrade.rs ----------

export type UpgradeCategory =
  | "armament" | "command" | "comms" | "crew" | "force" | "gear"
  | "generator" | "grenades" | "hardpoint" | "heavy-weapon" | "ordnance"
  | "personnel" | "programming" | "pilot" | "training" | "doctrine";

export type UpgradeRestriction = "generic" | "faction" | "character" | "affiliation" | "battle-force";

export interface Upgrade {
  id: string;
  name: string;
  category: UpgradeCategory;
  unique_card: boolean;
  restriction: UpgradeRestriction;
  restricted_to: string | string[] | null;
  points: number | null;
  points_verified: boolean;
  effect_description: string | null;
  effect_verified: boolean;
  /** References Keyword.id in keywords.json */
  keywords_granted: string[] | null;
  weapon_profile: unknown | null;
  source: string | null;
  roster_verified: boolean;
  roster_source?: string;
  notes: string | null;
}

export interface UpgradeLibrary {
  _meta: {
    description: string;
    categories: string[];
    categories_source?: string;
    last_reviewed: string;
    verification_status?: string;
  };
  upgrades: Upgrade[];
}

// ---------- command_card.rs ----------

export type CommandCardCategory = "generic" | "commander-specific";
export type CommandCardOwnership = "all" | "any";

export interface CommandCard {
  id: string;
  name: string;
  category: CommandCardCategory;
  /** References Unit.id(s) in units.json. Empty = not yet resolved (a
   *  documented gap, not "no owner"). Two entries means either joint
   *  ownership (commander_ownership: "all") or either-ownership
   *  ("any") -- see that field. */
  commander_unit_ids: string[];
  /** Only meaningful when commander_unit_ids has 2+ entries. */
  commander_ownership: CommandCardOwnership | null;
  /** Null where a current primary source did not expose the printed pip value (see notes). */
  pips: number | null;
  units_activated: IntOrText | null;
  unit_activation_restriction: string | null;
  faction_restriction: Faction | null;
  battle_force_restriction: string | null;
  effect_description: string | null;
  effect_verified: boolean;
  roster_verified: boolean;
  roster_source?: string;
  source: string | null;
  notes: string | null;
}

export interface CommandCardLibrary {
  _meta: {
    description: string;
    command_hand_rule: string;
    command_hand_rule_verified: boolean;
    priority_rule: string;
    priority_rule_verified: boolean;
    last_reviewed: string;
    verification_status?: string;
  };
  command_cards: CommandCard[];
}

// ---------- scenario.rs ----------

export type ObjectiveCategory = "primary" | "secondary" | "advantage" | "recon" | "narrative-scenario";
export type GameFormat = "standard-1000" | "recon-600" | "narrative";

export interface ScenarioObjective {
  id: string;
  name: string;
  category: ObjectiveCategory;
  game_format: GameFormat;
  game_format_verified: boolean;
  roster_verified: boolean;
  roster_source?: string;
  map_card: string | null;
  deployment_note: string | null;
  points_of_interest: unknown | null;
  points_of_interest_verified: boolean;
  victory_condition: string | null;
  victory_condition_verified: boolean;
  notes: string | null;
}

export interface ScenarioLibrary {
  _meta: {
    description: string;
    deprecated_system_warning?: string;
    distinct_from_campaigns_feature?: string;
    last_reviewed: string;
    verification_status?: string;
  };
  primary_objectives: ScenarioObjective[];
  secondary_objectives: ScenarioObjective[];
  advantage_cards: ScenarioObjective[];
  recon_format_cards: ScenarioObjective[];
  official_narrative_scenarios: ScenarioObjective[];
}

// ---------- expansion.rs ----------

export type ProductType =
  | "core-set" | "unit-expansion" | "commander-expansion" | "operative-expansion"
  | "battle-force-starter-set" | "upgrade-card-pack" | "battle-card-pack" | "other";

export interface ExpansionUnitEntry {
  unit_id: string;
  quantity: number;
}

export interface Expansion {
  id: string;
  name: string;
  product_type: ProductType;
  release_date: string | null;
  contains_units: ExpansionUnitEntry[];
  /** References Upgrade.id in upgrades.json */
  contains_upgrades: string[];
  /** References CommandCard.id in command-cards.json */
  contains_command_cards: string[];
  roster_verified: boolean;
  roster_source?: string;
  notes: string | null;
}

export interface ExpansionLibrary {
  _meta: {
    description: string;
    product_types: string[];
    last_reviewed: string;
    verification_status?: string;
  };
  expansions: Expansion[];
}

// ---------- collection.rs ----------
// Not backed by a JSON seed file -- these mirror the app-state SQL tables
// in src-tauri/migrations/0002_collection.sql (per-installation user data,
// not shipped content).

export interface UserCollectionEntry {
  user_id: string;
  expansion_id: string;
  quantity_owned: number;
  acquired_at: string;
  notes?: string;
}

export interface UnitOwnershipOverride {
  user_id: string;
  unit_id: string;
  /** Can be negative -- lost/damaged models, proxies, trades. */
  delta: number;
  reason?: string;
}

/** Result shape of the `user_unit_ownership` SQL view -- read-only. */
export interface UserUnitOwnership {
  user_id: string;
  unit_id: string;
  from_products: number;
  override_delta: number;
  total_owned: number;
}

// ---------- user.rs ----------
// Mirrors the `users` table in 0001_init.sql -- app-state, not data/*.json
// seed content, same as the collection.rs types above.

export interface User {
  id: string;
  display_name: string;
  created_at: string;
}

// ---------- army_list.rs ----------
// Mirrors army_lists/army_list_entries in 0001_init.sql -- app-state, same
// as collection.rs/user.rs above. Command cards and the battle deck are
// NOT modeled yet -- see the note at the top of army_list.rs.

export type ArmyListMode = "official" | "freeform";

export interface ArmyList {
  id: string;
  user_id: string;
  name: string;
  mode: ArmyListMode;
  faction: Faction | null;
  points_total: number;
  created_at: string;
  updated_at: string;
}

export interface ArmyListEntry {
  id: number;
  list_id: string;
  unit_id: string;
  count: number;
  upgrades: string[];
}

export interface ArmyListWithEntries extends ArmyList {
  entries: ArmyListEntry[];
  /** References CommandCard.id values in command-cards.json. */
  command_cards: string[];
  /** References ScenarioObjective.id values in scenarios.json. */
  battle_deck: string[];
}

// ---------- list_validation.rs ----------
// Official-mode rank-count validation. Freeform lists always get an
// empty result server-side (see commands/list_validation.rs) -- no
// rank constraints apply there.

export interface ValidationIssue {
  rank: Rank;
  message: string;
}

// ---------- campaign.rs ----------
// Mirrors the campaign_* tables in 0003_campaigns.sql -- app-state, same
// category as army_list.rs/collection.rs/user.rs above. This is a
// bookkeeping/journal system, not a rules engine -- freeform string
// fields (narrative, objectives, battle_mechanics, effect...) carry
// homebrew content this app doesn't simulate. See docs/DECISIONS.md's
// 2026-08-24 Campaign Mode entry.

export type CampaignMode = "solo" | "two-player" | "gm-player";
export type CampaignStatus = "active" | "completed" | "abandoned";
export type ParticipantRole = "player" | "gm" | "opponent";
export type MissionStatus = "not-started" | "completed";

export interface Campaign {
  id: string;
  name: string;
  summary: string | null;
  mode: CampaignMode;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CampaignPath {
  id: string;
  campaign_id: string;
  name: string;
  style_summary: string | null;
  narrative: string | null;
  sort_order: number;
}

export interface CampaignParticipant {
  id: string;
  campaign_id: string;
  user_id: string;
  role: ParticipantRole;
  side_name: string | null;
  credits_balance: number;
  chosen_path_id: string | null;
  /** Non-banking rule: completing a mission sets this true; spending the
   *  opportunity (or letting the next mission overwrite it) sets it back
   *  to false. Never accumulates. */
  upgrade_purchase_available: boolean;
}

export interface CampaignMission {
  id: string;
  campaign_id: string;
  path_id: string | null;
  name: string;
  sort_order: number;
  setup_narrative: string | null;
  objectives: string | null;
  battle_mechanics: string | null;
  status: MissionStatus;
}

export interface CampaignMissionOutcome {
  id: string;
  mission_id: string;
  condition_label: string;
  reward_credits: number;
  reward_notes: string | null;
  sort_order: number;
}

export interface CampaignMissionWithOutcomes extends CampaignMission {
  outcomes: CampaignMissionOutcome[];
}

export interface CampaignRosterEntry {
  id: string;
  participant_id: string;
  /** Nullable, matching CampaignStoreItem.unit_id -- fall back to
   *  nickname/the originating store item's display_name when null. */
  unit_id: string | null;
  nickname: string | null;
  models_total: number;
  models_lost: number;
  is_specialty: boolean;
  upgrades: string[];
  acquired_mission_id: string | null;
  retired: boolean;
}

export interface CampaignBattleReportCasualty {
  id: string;
  battle_report_id: string;
  roster_entry_id: string | null;
  label: string;
  models_lost: number;
}

export interface CampaignBattleReport {
  id: string;
  mission_id: string;
  participant_id: string;
  narrative: string | null;
  credits_awarded: number;
  notes: string | null;
  created_at: string;
  outcome_ids: string[];
  casualties: CampaignBattleReportCasualty[];
}

export interface CampaignMeter {
  id: string;
  participant_id: string;
  name: string;
  current_value: number;
  description: string | null;
}

/** `tier` is a power/tier label only, not a spendable currency -- purchase
 *  eligibility is gated entirely by CampaignParticipant.upgrade_purchase_available. */
export interface CampaignUpgradeOption {
  id: string;
  campaign_id: string;
  /** null = a "core" upgrade available regardless of chosen path. */
  path_id: string | null;
  name: string;
  tier: number;
  effect: string | null;
  is_trophy: boolean;
  sort_order: number;
}

export interface CampaignStoreItemModifier {
  id: string;
  store_item_id: string;
  label: string;
  cost: number;
  sort_order: number;
}

/** unlock_spend_threshold gates on the participant's CUMULATIVE credits
 *  spent, not a free grant -- base_cost is still charged once it's met. */
export interface CampaignStoreItem {
  id: string;
  campaign_id: string;
  unit_id: string | null;
  display_name: string;
  base_cost: number;
  unlock_spend_threshold: number | null;
  unlock_only: boolean;
  max_count: number | null;
  sort_order: number;
  modifiers: CampaignStoreItemModifier[];
}

export interface CampaignPurchase {
  id: string;
  participant_id: string;
  store_item_id: string;
  roster_entry_id: string | null;
  credits_spent: number;
  purchased_at: string;
}

export interface ParticipantUpgrade {
  participant_id: string;
  upgrade_option_id: string;
}

/** Command-input shape for one casualty line in logBattleReport. */
export interface CasualtyInput {
  label: string;
  models_lost: number;
  roster_entry_id?: string | null;
}

export interface PurchaseResult {
  purchase: CampaignPurchase;
  roster_entry: CampaignRosterEntry;
}

export interface CampaignDetail extends Campaign {
  participants: CampaignParticipant[];
  paths: CampaignPath[];
  missions: CampaignMissionWithOutcomes[];
  roster_entries: CampaignRosterEntry[];
  meters: CampaignMeter[];
  upgrade_options: CampaignUpgradeOption[];
  participant_upgrades: ParticipantUpgrade[];
  store_items: CampaignStoreItem[];
  /** Raw purchase log across every participant -- derive cumulative
   *  spend (for unlock-threshold progress display) by filtering/summing
   *  this client-side. */
  purchases: CampaignPurchase[];
  /** Every battle report across the whole campaign, chronological --
   *  backs the Story tab's writeup. */
  battle_reports: CampaignBattleReport[];
}
