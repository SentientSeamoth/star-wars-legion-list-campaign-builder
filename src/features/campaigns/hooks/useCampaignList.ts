import { useCallback, useEffect, useState } from "react";
import {
  addCampaignParticipant,
  createCampaign,
  deleteCampaign,
  listCampaignsForUser,
} from "../../../lib/api/campaignsCore";
import { listUsers } from "../../../lib/api/accounts";
import type { Campaign, CampaignMode, ParticipantRole, User } from "../../../lib/types/manual_seed";

/**
 * Lighter hook for the campaign list/create screen -- mirrors
 * listListsForUser's role in useArmyListBuilder.ts, but standalone since
 * Campaign Mode's list screen doesn't share state with a single-campaign
 * detail view.
 */
export function useCampaignList(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [ownCampaigns, allUsers] = await Promise.all([listCampaignsForUser(userId), listUsers()]);
        if (cancelled) return;
        setCampaigns(ownCampaigns);
        setUsers(allUsers);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addCampaign = useCallback(
    async (
      name: string,
      summary: string | null,
      mode: CampaignMode,
      creatorRole: ParticipantRole,
      creatorSideName: string | null
    ) => {
      try {
        const campaign = await createCampaign(name, summary, mode);
        // The creator must be a participant, or the campaign would never
        // reappear in list_campaigns_for_user (which joins through
        // campaign_participants) -- see docs/DECISIONS.md.
        await addCampaignParticipant(campaign.id, userId, creatorRole, creatorSideName);
        setCampaigns((cs) => [campaign, ...cs]);
        return campaign;
      } catch (err) {
        setError(String(err));
        return null;
      }
    },
    [userId]
  );

  const removeCampaign = useCallback(async (campaignId: string) => {
    try {
      await deleteCampaign(campaignId);
      setCampaigns((cs) => cs.filter((c) => c.id !== campaignId));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  return { loading, error, campaigns, users, addCampaign, removeCampaign };
}
