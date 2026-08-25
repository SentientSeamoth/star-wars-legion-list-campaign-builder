// Mirrors src-tauri/src/commands/campaigns_core.rs -- see lib/api/_PURPOSE.md.

import { invoke } from "@tauri-apps/api/core";
import type {
  Campaign,
  CampaignMeter,
  CampaignMode,
  CampaignParticipant,
  CampaignStatus,
  ParticipantRole,
} from "../types/manual_seed";

export function createCampaign(
  name: string,
  summary: string | null,
  mode: CampaignMode
): Promise<Campaign> {
  return invoke<Campaign>("create_campaign", { name, summary, mode });
}

export function updateCampaignHeader(
  campaignId: string,
  name: string,
  summary: string | null,
  mode: CampaignMode,
  status: CampaignStatus
): Promise<Campaign> {
  return invoke<Campaign>("update_campaign_header", { campaignId, name, summary, mode, status });
}

export function deleteCampaign(campaignId: string): Promise<void> {
  return invoke<void>("delete_campaign", { campaignId });
}

export function listCampaignsForUser(userId: string): Promise<Campaign[]> {
  return invoke<Campaign[]>("list_campaigns_for_user", { userId });
}

export function addCampaignParticipant(
  campaignId: string,
  userId: string,
  role: ParticipantRole,
  sideName: string | null
): Promise<CampaignParticipant> {
  return invoke<CampaignParticipant>("add_campaign_participant", {
    campaignId,
    userId,
    role,
    sideName,
  });
}

export function removeCampaignParticipant(participantId: string): Promise<void> {
  return invoke<void>("remove_campaign_participant", { participantId });
}

export function updateParticipantCredits(
  participantId: string,
  creditsBalance: number
): Promise<CampaignParticipant> {
  return invoke<CampaignParticipant>("update_participant_credits", {
    participantId,
    creditsBalance,
  });
}

export function setParticipantChosenPath(
  participantId: string,
  pathId: string | null
): Promise<CampaignParticipant> {
  return invoke<CampaignParticipant>("set_participant_chosen_path", { participantId, pathId });
}

export function upsertCampaignMeter(
  participantId: string,
  name: string,
  currentValue: number,
  description: string | null
): Promise<CampaignMeter> {
  return invoke<CampaignMeter>("upsert_campaign_meter", {
    participantId,
    name,
    currentValue,
    description,
  });
}

export function removeCampaignMeter(participantId: string, name: string): Promise<void> {
  return invoke<void>("remove_campaign_meter", { participantId, name });
}
