// Mirrors src-tauri/src/commands/campaigns_content.rs -- see lib/api/_PURPOSE.md.
// The GM-authored "template" side of Campaign Mode: paths, missions,
// mission outcomes, upgrade options, store items and their modifiers.

import { invoke } from "@tauri-apps/api/core";
import type {
  CampaignMission,
  CampaignMissionOutcome,
  CampaignPath,
  CampaignStoreItem,
  CampaignStoreItemModifier,
  CampaignUpgradeOption,
  MissionStatus,
} from "../types/manual_seed";

// ---------------- Paths ----------------

export function addCampaignPath(
  campaignId: string,
  name: string,
  styleSummary: string | null,
  narrative: string | null,
  sortOrder: number
): Promise<CampaignPath> {
  return invoke<CampaignPath>("add_campaign_path", { campaignId, name, styleSummary, narrative, sortOrder });
}

export function updateCampaignPath(
  pathId: string,
  name: string,
  styleSummary: string | null,
  narrative: string | null,
  sortOrder: number
): Promise<CampaignPath> {
  return invoke<CampaignPath>("update_campaign_path", { pathId, name, styleSummary, narrative, sortOrder });
}

export function removeCampaignPath(pathId: string): Promise<void> {
  return invoke<void>("remove_campaign_path", { pathId });
}

// ---------------- Missions ----------------

export function addCampaignMission(
  campaignId: string,
  pathId: string | null,
  name: string,
  sortOrder: number,
  setupNarrative: string | null,
  objectives: string | null,
  battleMechanics: string | null
): Promise<CampaignMission> {
  return invoke<CampaignMission>("add_campaign_mission", {
    campaignId,
    pathId,
    name,
    sortOrder,
    setupNarrative,
    objectives,
    battleMechanics,
  });
}

export function updateCampaignMission(
  missionId: string,
  pathId: string | null,
  name: string,
  sortOrder: number,
  setupNarrative: string | null,
  objectives: string | null,
  battleMechanics: string | null
): Promise<CampaignMission> {
  return invoke<CampaignMission>("update_campaign_mission", {
    missionId,
    pathId,
    name,
    sortOrder,
    setupNarrative,
    objectives,
    battleMechanics,
  });
}

export function setCampaignMissionStatus(
  missionId: string,
  status: MissionStatus
): Promise<CampaignMission> {
  return invoke<CampaignMission>("set_campaign_mission_status", { missionId, status });
}

export function removeCampaignMission(missionId: string): Promise<void> {
  return invoke<void>("remove_campaign_mission", { missionId });
}

// ---------------- Mission outcomes ----------------

export function addCampaignMissionOutcome(
  missionId: string,
  conditionLabel: string,
  rewardCredits: number,
  rewardNotes: string | null,
  sortOrder: number
): Promise<CampaignMissionOutcome> {
  return invoke<CampaignMissionOutcome>("add_campaign_mission_outcome", {
    missionId,
    conditionLabel,
    rewardCredits,
    rewardNotes,
    sortOrder,
  });
}

export function updateCampaignMissionOutcome(
  outcomeId: string,
  conditionLabel: string,
  rewardCredits: number,
  rewardNotes: string | null,
  sortOrder: number
): Promise<CampaignMissionOutcome> {
  return invoke<CampaignMissionOutcome>("update_campaign_mission_outcome", {
    outcomeId,
    conditionLabel,
    rewardCredits,
    rewardNotes,
    sortOrder,
  });
}

export function removeCampaignMissionOutcome(outcomeId: string): Promise<void> {
  return invoke<void>("remove_campaign_mission_outcome", { outcomeId });
}

// ---------------- Upgrade options ----------------

export function addCampaignUpgradeOption(
  campaignId: string,
  pathId: string | null,
  name: string,
  tier: number,
  effect: string | null,
  isTrophy: boolean,
  sortOrder: number
): Promise<CampaignUpgradeOption> {
  return invoke<CampaignUpgradeOption>("add_campaign_upgrade_option", {
    campaignId,
    pathId,
    name,
    tier,
    effect,
    isTrophy,
    sortOrder,
  });
}

export function updateCampaignUpgradeOption(
  upgradeOptionId: string,
  pathId: string | null,
  name: string,
  tier: number,
  effect: string | null,
  isTrophy: boolean,
  sortOrder: number
): Promise<CampaignUpgradeOption> {
  return invoke<CampaignUpgradeOption>("update_campaign_upgrade_option", {
    upgradeOptionId,
    pathId,
    name,
    tier,
    effect,
    isTrophy,
    sortOrder,
  });
}

export function removeCampaignUpgradeOption(upgradeOptionId: string): Promise<void> {
  return invoke<void>("remove_campaign_upgrade_option", { upgradeOptionId });
}

// ---------------- Store items + modifiers ----------------

export function addCampaignStoreItem(
  campaignId: string,
  unitId: string | null,
  displayName: string,
  baseCost: number,
  unlockSpendThreshold: number | null,
  unlockOnly: boolean,
  maxCount: number | null,
  sortOrder: number
): Promise<CampaignStoreItem> {
  return invoke<CampaignStoreItem>("add_campaign_store_item", {
    campaignId,
    unitId,
    displayName,
    baseCost,
    unlockSpendThreshold,
    unlockOnly,
    maxCount,
    sortOrder,
  });
}

export function updateCampaignStoreItem(
  storeItemId: string,
  unitId: string | null,
  displayName: string,
  baseCost: number,
  unlockSpendThreshold: number | null,
  unlockOnly: boolean,
  maxCount: number | null,
  sortOrder: number
): Promise<CampaignStoreItem> {
  return invoke<CampaignStoreItem>("update_campaign_store_item", {
    storeItemId,
    unitId,
    displayName,
    baseCost,
    unlockSpendThreshold,
    unlockOnly,
    maxCount,
    sortOrder,
  });
}

export function removeCampaignStoreItem(storeItemId: string): Promise<void> {
  return invoke<void>("remove_campaign_store_item", { storeItemId });
}

export function addCampaignStoreItemModifier(
  storeItemId: string,
  label: string,
  cost: number,
  sortOrder: number
): Promise<CampaignStoreItemModifier> {
  return invoke<CampaignStoreItemModifier>("add_campaign_store_item_modifier", {
    storeItemId,
    label,
    cost,
    sortOrder,
  });
}

export function removeCampaignStoreItemModifier(modifierId: string): Promise<void> {
  return invoke<void>("remove_campaign_store_item_modifier", { modifierId });
}
