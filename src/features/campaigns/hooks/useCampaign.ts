import { useCallback, useEffect, useState } from "react";
import { getCampaignDetail } from "../../../lib/api/campaignsDetail";
import {
  addCampaignParticipant,
  removeCampaignParticipant,
  removeCampaignMeter,
  setParticipantChosenPath,
  updateCampaignHeader,
  updateParticipantCredits,
  upsertCampaignMeter,
} from "../../../lib/api/campaignsCore";
import {
  addCampaignMission,
  addCampaignMissionOutcome,
  addCampaignPath,
  addCampaignStoreItem,
  addCampaignStoreItemModifier,
  addCampaignUpgradeOption,
  removeCampaignMission,
  removeCampaignMissionOutcome,
  removeCampaignPath,
  removeCampaignStoreItem,
  removeCampaignStoreItemModifier,
  removeCampaignUpgradeOption,
  updateCampaignMission,
  updateCampaignMissionOutcome,
  updateCampaignPath,
  updateCampaignStoreItem,
  updateCampaignUpgradeOption,
} from "../../../lib/api/campaignsContent";
import {
  addRosterEntry,
  logBattleReport,
  purchaseStoreItem,
  purchaseUpgradeOption,
  recordRosterCasualty,
  removeRosterEntry,
  setRosterEntryRetired,
  updateRosterEntryUpgrades,
} from "../../../lib/api/campaignsPlay";
import { listUnits } from "../../../lib/api/reference";
import { listUsers } from "../../../lib/api/accounts";
import type {
  Campaign,
  CampaignDetail,
  CampaignMode,
  CampaignParticipant,
  CampaignStatus,
  CasualtyInput,
  ParticipantRole,
  Unit,
  User,
} from "../../../lib/types/manual_seed";

/**
 * Owns a single campaign's full state -- everything the dashboard and its
 * sub-panels need, loaded in one Promise.all on mount (mirrors
 * useArmyListBuilder.ts's init pattern). Simple 1:1 CRUD (paths, missions,
 * outcomes, upgrade options, store items, meters, participant credits)
 * patches its own local slice from the returned row, same
 * persist-then-merge pattern as useArmyListBuilder. Multi-table plays
 * (store purchases, upgrade purchases, battle reports -- each of which
 * touches credits, the roster, and/or mission status together) call
 * `refresh()` afterward instead of hand-patching every affected slice --
 * simpler and just as correct given how much a single play action can
 * touch at once.
 */
export function useCampaign(campaignId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getCampaignDetail(campaignId);
      setDetail(fresh);
    } catch (err) {
      setError(String(err));
    }
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [fresh, allUnits, allUsers] = await Promise.all([
          getCampaignDetail(campaignId),
          listUnits(),
          listUsers(),
        ]);
        if (cancelled) return;
        setDetail(fresh);
        setUnits(allUnits);
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
  }, [campaignId]);

  function patchCampaign(campaign: Campaign) {
    setDetail((d) => (d ? { ...d, ...campaign } : d));
  }

  const saveCampaignHeader = useCallback(
    async (name: string, summary: string | null, mode: CampaignMode, status: CampaignStatus) => {
      try {
        patchCampaign(await updateCampaignHeader(campaignId, name, summary, mode, status));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  const addParticipant = useCallback(
    async (userId: string, role: ParticipantRole, sideName: string | null) => {
      try {
        const participant = await addCampaignParticipant(campaignId, userId, role, sideName);
        setDetail((d) => (d ? { ...d, participants: [...d.participants, participant] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  const removeParticipant = useCallback(async (participantId: string) => {
    try {
      await removeCampaignParticipant(participantId);
      setDetail((d) =>
        d ? { ...d, participants: d.participants.filter((p) => p.id !== participantId) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  function patchParticipant(updated: CampaignParticipant) {
    setDetail((d) =>
      d ? { ...d, participants: d.participants.map((p) => (p.id === updated.id ? updated : p)) } : d
    );
  }

  const setCredits = useCallback(async (participantId: string, creditsBalance: number) => {
    try {
      patchParticipant(await updateParticipantCredits(participantId, creditsBalance));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const chooseParticipantPath = useCallback(async (participantId: string, pathId: string | null) => {
    try {
      patchParticipant(await setParticipantChosenPath(participantId, pathId));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const saveMeter = useCallback(
    async (participantId: string, name: string, currentValue: number, description: string | null) => {
      try {
        const meter = await upsertCampaignMeter(participantId, name, currentValue, description);
        setDetail((d) =>
          d
            ? {
                ...d,
                meters: [...d.meters.filter((m) => m.id !== meter.id), meter],
              }
            : d
        );
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deleteMeter = useCallback(async (participantId: string, name: string) => {
    try {
      await removeCampaignMeter(participantId, name);
      setDetail((d) =>
        d ? { ...d, meters: d.meters.filter((m) => !(m.participant_id === participantId && m.name === name)) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Paths ----------------

  const addPath = useCallback(
    async (name: string, styleSummary: string | null, narrative: string | null, sortOrder: number) => {
      try {
        const path = await addCampaignPath(campaignId, name, styleSummary, narrative, sortOrder);
        setDetail((d) => (d ? { ...d, paths: [...d.paths, path] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  const savePath = useCallback(
    async (
      pathId: string,
      name: string,
      styleSummary: string | null,
      narrative: string | null,
      sortOrder: number
    ) => {
      try {
        const path = await updateCampaignPath(pathId, name, styleSummary, narrative, sortOrder);
        setDetail((d) => (d ? { ...d, paths: d.paths.map((p) => (p.id === path.id ? path : p)) } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deletePath = useCallback(async (pathId: string) => {
    try {
      await removeCampaignPath(pathId);
      setDetail((d) => (d ? { ...d, paths: d.paths.filter((p) => p.id !== pathId) } : d));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Missions ----------------

  const addMission = useCallback(
    async (
      pathId: string | null,
      name: string,
      sortOrder: number,
      setupNarrative: string | null,
      objectives: string | null,
      battleMechanics: string | null
    ) => {
      try {
        const mission = await addCampaignMission(
          campaignId,
          pathId,
          name,
          sortOrder,
          setupNarrative,
          objectives,
          battleMechanics
        );
        setDetail((d) => (d ? { ...d, missions: [...d.missions, { ...mission, outcomes: [] }] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  function patchMission(updated: { id: string }, patch: Partial<CampaignDetail["missions"][number]>) {
    setDetail((d) =>
      d
        ? { ...d, missions: d.missions.map((m) => (m.id === updated.id ? { ...m, ...patch } : m)) }
        : d
    );
  }

  const saveMission = useCallback(
    async (
      missionId: string,
      pathId: string | null,
      name: string,
      sortOrder: number,
      setupNarrative: string | null,
      objectives: string | null,
      battleMechanics: string | null
    ) => {
      try {
        const mission = await updateCampaignMission(
          missionId,
          pathId,
          name,
          sortOrder,
          setupNarrative,
          objectives,
          battleMechanics
        );
        patchMission(mission, mission);
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deleteMission = useCallback(async (missionId: string) => {
    try {
      await removeCampaignMission(missionId);
      setDetail((d) => (d ? { ...d, missions: d.missions.filter((m) => m.id !== missionId) } : d));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const addOutcome = useCallback(
    async (missionId: string, conditionLabel: string, rewardCredits: number, rewardNotes: string | null, sortOrder: number) => {
      try {
        const outcome = await addCampaignMissionOutcome(missionId, conditionLabel, rewardCredits, rewardNotes, sortOrder);
        setDetail((d) =>
          d
            ? {
                ...d,
                missions: d.missions.map((m) =>
                  m.id === missionId ? { ...m, outcomes: [...m.outcomes, outcome] } : m
                ),
              }
            : d
        );
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const saveOutcome = useCallback(
    async (
      outcomeId: string,
      missionId: string,
      conditionLabel: string,
      rewardCredits: number,
      rewardNotes: string | null,
      sortOrder: number
    ) => {
      try {
        const outcome = await updateCampaignMissionOutcome(outcomeId, conditionLabel, rewardCredits, rewardNotes, sortOrder);
        setDetail((d) =>
          d
            ? {
                ...d,
                missions: d.missions.map((m) =>
                  m.id === missionId
                    ? { ...m, outcomes: m.outcomes.map((o) => (o.id === outcome.id ? outcome : o)) }
                    : m
                ),
              }
            : d
        );
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deleteOutcome = useCallback(async (missionId: string, outcomeId: string) => {
    try {
      await removeCampaignMissionOutcome(outcomeId);
      setDetail((d) =>
        d
          ? {
              ...d,
              missions: d.missions.map((m) =>
                m.id === missionId ? { ...m, outcomes: m.outcomes.filter((o) => o.id !== outcomeId) } : m
              ),
            }
          : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Upgrade options ----------------

  const addUpgradeOption = useCallback(
    async (pathId: string | null, name: string, tier: number, effect: string | null, isTrophy: boolean, sortOrder: number) => {
      try {
        const option = await addCampaignUpgradeOption(campaignId, pathId, name, tier, effect, isTrophy, sortOrder);
        setDetail((d) => (d ? { ...d, upgrade_options: [...d.upgrade_options, option] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  const saveUpgradeOption = useCallback(
    async (
      upgradeOptionId: string,
      pathId: string | null,
      name: string,
      tier: number,
      effect: string | null,
      isTrophy: boolean,
      sortOrder: number
    ) => {
      try {
        const option = await updateCampaignUpgradeOption(upgradeOptionId, pathId, name, tier, effect, isTrophy, sortOrder);
        setDetail((d) =>
          d ? { ...d, upgrade_options: d.upgrade_options.map((o) => (o.id === option.id ? option : o)) } : d
        );
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deleteUpgradeOption = useCallback(async (upgradeOptionId: string) => {
    try {
      await removeCampaignUpgradeOption(upgradeOptionId);
      setDetail((d) =>
        d ? { ...d, upgrade_options: d.upgrade_options.filter((o) => o.id !== upgradeOptionId) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Store items ----------------

  const addStoreItem = useCallback(
    async (
      unitId: string | null,
      displayName: string,
      baseCost: number,
      unlockSpendThreshold: number | null,
      unlockOnly: boolean,
      maxCount: number | null,
      sortOrder: number
    ) => {
      try {
        const item = await addCampaignStoreItem(
          campaignId,
          unitId,
          displayName,
          baseCost,
          unlockSpendThreshold,
          unlockOnly,
          maxCount,
          sortOrder
        );
        setDetail((d) => (d ? { ...d, store_items: [...d.store_items, item] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    [campaignId]
  );

  const saveStoreItem = useCallback(
    async (
      storeItemId: string,
      unitId: string | null,
      displayName: string,
      baseCost: number,
      unlockSpendThreshold: number | null,
      unlockOnly: boolean,
      maxCount: number | null,
      sortOrder: number
    ) => {
      try {
        const item = await updateCampaignStoreItem(
          storeItemId,
          unitId,
          displayName,
          baseCost,
          unlockSpendThreshold,
          unlockOnly,
          maxCount,
          sortOrder
        );
        setDetail((d) => (d ? { ...d, store_items: d.store_items.map((i) => (i.id === item.id ? item : i)) } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const deleteStoreItem = useCallback(async (storeItemId: string) => {
    try {
      await removeCampaignStoreItem(storeItemId);
      setDetail((d) => (d ? { ...d, store_items: d.store_items.filter((i) => i.id !== storeItemId) } : d));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const addStoreModifier = useCallback(async (storeItemId: string, label: string, cost: number, sortOrder: number) => {
    try {
      const modifier = await addCampaignStoreItemModifier(storeItemId, label, cost, sortOrder);
      setDetail((d) =>
        d
          ? {
              ...d,
              store_items: d.store_items.map((i) =>
                i.id === storeItemId ? { ...i, modifiers: [...i.modifiers, modifier] } : i
              ),
            }
          : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const deleteStoreModifier = useCallback(async (storeItemId: string, modifierId: string) => {
    try {
      await removeCampaignStoreItemModifier(modifierId);
      setDetail((d) =>
        d
          ? {
              ...d,
              store_items: d.store_items.map((i) =>
                i.id === storeItemId ? { ...i, modifiers: i.modifiers.filter((m) => m.id !== modifierId) } : i
              ),
            }
          : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Roster ----------------

  const addFreeRosterEntry = useCallback(
    async (
      participantId: string,
      unitId: string | null,
      nickname: string | null,
      modelsTotal: number,
      isSpecialty: boolean
    ) => {
      try {
        const entry = await addRosterEntry(participantId, unitId, nickname, modelsTotal, isSpecialty, null);
        setDetail((d) => (d ? { ...d, roster_entries: [...d.roster_entries, entry] } : d));
      } catch (err) {
        setError(String(err));
      }
    },
    []
  );

  const setRosterUpgrades = useCallback(async (rosterEntryId: string, upgradeIds: string[]) => {
    try {
      const entry = await updateRosterEntryUpgrades(rosterEntryId, upgradeIds);
      setDetail((d) =>
        d ? { ...d, roster_entries: d.roster_entries.map((e) => (e.id === entry.id ? entry : e)) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const applyCasualty = useCallback(async (rosterEntryId: string, modelsLostDelta: number) => {
    try {
      const entry = await recordRosterCasualty(rosterEntryId, modelsLostDelta);
      setDetail((d) =>
        d ? { ...d, roster_entries: d.roster_entries.map((e) => (e.id === entry.id ? entry : e)) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const retireEntry = useCallback(async (rosterEntryId: string, retired: boolean) => {
    try {
      const entry = await setRosterEntryRetired(rosterEntryId, retired);
      setDetail((d) =>
        d ? { ...d, roster_entries: d.roster_entries.map((e) => (e.id === entry.id ? entry : e)) } : d
      );
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const deleteRosterEntry = useCallback(async (rosterEntryId: string) => {
    try {
      await removeRosterEntry(rosterEntryId);
      setDetail((d) => (d ? { ...d, roster_entries: d.roster_entries.filter((e) => e.id !== rosterEntryId) } : d));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  // ---------------- Purchases (multi-table -> full refresh) ----------------

  const buyStoreItem = useCallback(
    async (
      participantId: string,
      storeItemId: string,
      creditsSpent: number,
      modelsTotal: number,
      nickname: string | null,
      isSpecialty: boolean
    ) => {
      try {
        await purchaseStoreItem(participantId, storeItemId, creditsSpent, modelsTotal, nickname, isSpecialty);
        await refresh();
      } catch (err) {
        setError(String(err));
      }
    },
    [refresh]
  );

  const buyUpgradeOption = useCallback(
    async (participantId: string, upgradeOptionId: string, acquiredMissionId: string | null) => {
      try {
        await purchaseUpgradeOption(participantId, upgradeOptionId, acquiredMissionId);
        await refresh();
      } catch (err) {
        setError(String(err));
      }
    },
    [refresh]
  );

  const submitBattleReport = useCallback(
    async (
      missionId: string,
      participantId: string,
      narrative: string | null,
      outcomeIds: string[],
      creditsAwarded: number,
      notes: string | null,
      casualties: CasualtyInput[]
    ) => {
      try {
        await logBattleReport(missionId, participantId, narrative, outcomeIds, creditsAwarded, notes, casualties);
        await refresh();
      } catch (err) {
        setError(String(err));
      }
    },
    [refresh]
  );

  return {
    loading,
    error,
    setError,
    detail,
    units,
    users,
    refresh,
    saveCampaignHeader,
    addParticipant,
    removeParticipant,
    setCredits,
    chooseParticipantPath,
    saveMeter,
    deleteMeter,
    addPath,
    savePath,
    deletePath,
    addMission,
    saveMission,
    deleteMission,
    addOutcome,
    saveOutcome,
    deleteOutcome,
    addUpgradeOption,
    saveUpgradeOption,
    deleteUpgradeOption,
    addStoreItem,
    saveStoreItem,
    deleteStoreItem,
    addStoreModifier,
    deleteStoreModifier,
    addFreeRosterEntry,
    setRosterUpgrades,
    applyCasualty,
    retireEntry,
    deleteRosterEntry,
    buyStoreItem,
    buyUpgradeOption,
    submitBattleReport,
  };
}
