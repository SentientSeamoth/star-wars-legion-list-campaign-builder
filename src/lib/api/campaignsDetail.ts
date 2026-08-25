// Mirrors src-tauri/src/commands/campaigns_detail.rs -- see lib/api/_PURPOSE.md.

import { invoke } from "@tauri-apps/api/core";
import type { CampaignDetail } from "../types/manual_seed";

export function getCampaignDetail(campaignId: string): Promise<CampaignDetail> {
  return invoke<CampaignDetail>("get_campaign_detail", { campaignId });
}
