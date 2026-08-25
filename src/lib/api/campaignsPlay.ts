// Mirrors src-tauri/src/commands/campaigns_play.rs -- see lib/api/_PURPOSE.md.
// The played side of Campaign Mode: permadeath roster entries, store
// purchases, hero upgrade purchases, and battle reports.

import { invoke } from "@tauri-apps/api/core";
import type {
  CampaignBattleReport,
  CampaignParticipant,
  CampaignRosterEntry,
  CasualtyInput,
  PurchaseResult,
} from "../types/manual_seed";

// ---------------- Roster ----------------

export function addRosterEntry(
  participantId: string,
  unitId: string | null,
  nickname: string | null,
  modelsTotal: number,
  isSpecialty: boolean,
  acquiredMissionId: string | null
): Promise<CampaignRosterEntry> {
  return invoke<CampaignRosterEntry>("add_roster_entry", {
    participantId,
    unitId,
    nickname,
    modelsTotal,
    isSpecialty,
    acquiredMissionId,
  });
}

export function updateRosterEntryUpgrades(
  rosterEntryId: string,
  upgradeIds: string[]
): Promise<CampaignRosterEntry> {
  return invoke<CampaignRosterEntry>("update_roster_entry_upgrades", { rosterEntryId, upgradeIds });
}

/** `modelsLostDelta` can be negative to undo a mistaken entry. */
export function recordRosterCasualty(
  rosterEntryId: string,
  modelsLostDelta: number
): Promise<CampaignRosterEntry> {
  return invoke<CampaignRosterEntry>("record_roster_casualty", { rosterEntryId, modelsLostDelta });
}

export function setRosterEntryRetired(
  rosterEntryId: string,
  retired: boolean
): Promise<CampaignRosterEntry> {
  return invoke<CampaignRosterEntry>("set_roster_entry_retired", { rosterEntryId, retired });
}

export function removeRosterEntry(rosterEntryId: string): Promise<void> {
  return invoke<void>("remove_roster_entry", { rosterEntryId });
}

// ---------------- Store purchases ----------------

/** Blocked server-side (via domain::campaign_rules) if the unlock-spend
 *  threshold isn't met yet, the max copy count is reached, or the
 *  balance is insufficient -- the rejection surfaces as a thrown error
 *  with a human-readable message. */
export function purchaseStoreItem(
  participantId: string,
  storeItemId: string,
  creditsSpent: number,
  modelsTotal: number,
  nickname: string | null,
  isSpecialty: boolean
): Promise<PurchaseResult> {
  return invoke<PurchaseResult>("purchase_store_item", {
    participantId,
    storeItemId,
    creditsSpent,
    modelsTotal,
    nickname,
    isSpecialty,
  });
}

// ---------------- Hero upgrade purchases ----------------

/** Blocked server-side unless the participant currently has an
 *  upgrade-purchase opportunity available (granted by logBattleReport). */
export function purchaseUpgradeOption(
  participantId: string,
  upgradeOptionId: string,
  acquiredMissionId: string | null
): Promise<CampaignParticipant> {
  return invoke<CampaignParticipant>("purchase_upgrade_option", {
    participantId,
    upgradeOptionId,
    acquiredMissionId,
  });
}

// ---------------- Battle reports ----------------

export function listBattleReportsForMission(missionId: string): Promise<CampaignBattleReport[]> {
  return invoke<CampaignBattleReport[]>("list_battle_reports_for_mission", { missionId });
}

/** `creditsAwarded` should be computed client-side (sum of the chosen
 *  outcomes' reward_credits, editable before submitting) -- the backend
 *  persists whatever is passed rather than re-deriving it. Logging a
 *  report also awards the participant one upgrade-purchase opportunity
 *  and marks the mission completed. */
export function logBattleReport(
  missionId: string,
  participantId: string,
  narrative: string | null,
  outcomeIds: string[],
  creditsAwarded: number,
  notes: string | null,
  casualties: CasualtyInput[]
): Promise<CampaignBattleReport> {
  return invoke<CampaignBattleReport>("log_battle_report", {
    missionId,
    participantId,
    narrative,
    outcomeIds,
    creditsAwarded,
    notes,
    casualties,
  });
}
