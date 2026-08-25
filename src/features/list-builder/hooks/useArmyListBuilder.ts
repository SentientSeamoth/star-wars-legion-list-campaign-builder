import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addListBattleDeckCard,
  addListCommandCard,
  addListEntry,
  createList,
  getListWithEntries,
  listListsForUser,
  removeListBattleDeckCard,
  removeListCommandCard,
  removeListEntry,
  updateListEntryCount,
  updateListEntryUpgrades,
  updateListHeader,
} from "../../../lib/api/lists";
import {
  listCommandCards,
  listKeywords,
  listScenarios,
  listUnits,
  listUpgrades,
} from "../../../lib/api/reference";
import { getUserUnitOwnership, listOwnedExpansions } from "../../../lib/api/collection";
import { validateList } from "../../../lib/api/listValidation";
import type {
  ArmyList,
  CommandCard,
  Keyword,
  ScenarioObjective,
  Unit,
  Upgrade,
  ValidationIssue,
} from "../../../lib/types/manual_seed";
import {
  toDbFaction,
  toDbMode,
  toUiFaction,
  toUiMode,
  type UiFactionId,
  type UiMode,
} from "../uiMapping";

/**
 * One row in the builder. `entryId` is null until the row is actually
 * persisted (either the list hasn't been saved yet, or this row was added
 * before the first save) -- `localKey` is a stable React key that exists
 * either way, since entryId alone can't identify an unsaved row.
 * `upgrades` is a list of equipped upgrade ids -- see docs's 2026-08-23
 * "upgrade equipping" entry for why each entry (not each mini) owns its
 * own loadout.
 */
export interface BuilderEntry {
  localKey: number;
  entryId: number | null;
  unitId: string;
  count: number;
  upgrades: string[];
}

const DEFAULT_NAME = "Untitled Army";

/**
 * Owns the Army Builder's real state: the unit/keyword/upgrade catalogs,
 * the current (possibly unsaved) list being edited, and the user's other
 * saved lists for the load panel. See docs/DECISIONS.md for the
 * entry-persistence model (add always inserts a new row; nothing here
 * computes points -- see the honesty note in docs/UI_DESIGN.md). `userId`
 * comes from the ProfilePicker (see App.tsx) -- this hook no longer
 * resolves a user on its own.
 */
export function useArmyListBuilder(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [commandCards, setCommandCards] = useState<CommandCard[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioObjective[]>([]);
  const [savedLists, setSavedLists] = useState<ArmyList[]>([]);
  // Whether this profile has recorded ANY collection ownership at all --
  // gates the "you don't have a model for this" UI on/off. A profile that
  // has never touched the Collection screen should see the builder exactly
  // as before, not a wall of false "not owned" warnings for units it never
  // claimed to track.
  const [hasCollectionData, setHasCollectionData] = useState(false);
  const [ownedCountByUnitId, setOwnedCountByUnitId] = useState<Map<string, number>>(new Map());

  const [listId, setListId] = useState<string | null>(null);
  const [armyName, setArmyName] = useState(DEFAULT_NAME);
  const [factionId, setFactionId] = useState<UiFactionId>("separatist");
  const [mode, setMode] = useState<UiMode>("traditional");
  const [entries, setEntries] = useState<BuilderEntry[]>([]);
  const [selectedCommandCardIds, setSelectedCommandCardIds] = useState<string[]>([]);
  const [selectedBattleDeckIds, setSelectedBattleDeckIds] = useState<string[]>([]);
  // null = "not checked yet" (no saved list, or Custom mode has nothing
  // to check) -- distinct from an empty array ("checked, no issues").
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[] | null>(null);
  const nextLocalKey = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [
          allUnits,
          lists,
          allKeywords,
          allUpgrades,
          allCommandCards,
          allScenarios,
          ownedExpansions,
          ownership,
        ] = await Promise.all([
          listUnits(),
          listListsForUser(userId),
          listKeywords(),
          listUpgrades(),
          listCommandCards(),
          listScenarios(),
          listOwnedExpansions(userId),
          getUserUnitOwnership(userId),
        ]);
        if (cancelled) return;
        setUnits(allUnits);
        setSavedLists(lists);
        setKeywords(allKeywords);
        setUpgrades(allUpgrades);
        setCommandCards(allCommandCards);
        setScenarios(allScenarios);
        setHasCollectionData(ownedExpansions.length > 0);
        setOwnedCountByUnitId(new Map(ownership.map((o) => [o.unit_id, o.total_owned])));
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

  // Re-validates against the real backend rule check (see
  // commands/list_validation.rs) whenever the saved list's rank
  // composition could have changed. Only meaningful for a persisted,
  // official-mode list -- an unsaved draft has no list_id to validate
  // against yet, and freeform has no rank constraints. Depends on
  // `entries` by reference: every mutator below awaits its persist call
  // before calling setEntries, so by the time this effect re-runs the
  // backend already reflects what's being validated.
  useEffect(() => {
    if (!listId || toDbMode(mode) !== "official") {
      setValidationIssues(null);
      return;
    }
    let cancelled = false;
    validateList(listId)
      .then((issues) => {
        if (!cancelled) setValidationIssues(issues);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [listId, mode, entries]);

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const availableUnitsForRank = useCallback(
    (rank: string) => {
      const dbFaction = toDbFaction(factionId);
      return units.filter(
        (u) => u.rank === rank && u.legality === "active" && u.factions.includes(dbFaction)
      );
    },
    [units, factionId]
  );

  const addUnit = useCallback(
    async (unitId: string) => {
      const unit = unitsById.get(unitId);
      // A unique unit (e.g. a named character) can only appear once per
      // army, matching real Legion rules -- refuse a second entry rather
      // than silently allowing it (this is exactly how "50 Padmés" and
      // similar happened before).
      if (unit?.unique && entries.some((e) => e.unitId === unitId)) {
        setError(`${unit.name} is unique and can only be included once per army.`);
        return;
      }

      if (listId) {
        let created;
        try {
          created = await addListEntry(listId, unitId);
        } catch (err) {
          setError(String(err));
          return;
        }
        setEntries((es) => [
          ...es,
          {
            localKey: nextLocalKey.current++,
            entryId: created.id,
            unitId: created.unit_id,
            count: created.count,
            upgrades: created.upgrades,
          },
        ]);
      } else {
        setEntries((es) => [
          ...es,
          { localKey: nextLocalKey.current++, entryId: null, unitId, count: 1, upgrades: [] },
        ]);
      }
    },
    [listId, unitsById, entries]
  );

  const removeEntry = useCallback(
    async (localKey: number) => {
      const entry = entries.find((e) => e.localKey === localKey);
      if (entry?.entryId != null) {
        try {
          await removeListEntry(entry.entryId);
        } catch (err) {
          setError(String(err));
          return;
        }
      }
      setEntries((es) => es.filter((e) => e.localKey !== localKey));
    },
    [entries]
  );

  const setEntryCount = useCallback(
    async (localKey: number, count: number) => {
      if (count < 1) return;
      const entry = entries.find((e) => e.localKey === localKey);
      if (!entry) return;
      const unit = unitsById.get(entry.unitId);
      if (unit?.unique && count > 1) {
        setError(`${unit.name} is unique and can't have more than 1 copy.`);
        return;
      }
      if (entry.entryId != null) {
        try {
          await updateListEntryCount(entry.entryId, count);
        } catch (err) {
          setError(String(err));
          return;
        }
      }
      setEntries((es) => es.map((e) => (e.localKey === localKey ? { ...e, count } : e)));
    },
    [entries, unitsById]
  );

  const setEntryUpgrades = useCallback(
    async (localKey: number, upgradeIds: string[]) => {
      const entry = entries.find((e) => e.localKey === localKey);
      if (!entry) return;
      if (entry.entryId != null) {
        try {
          await updateListEntryUpgrades(entry.entryId, upgradeIds);
        } catch (err) {
          setError(String(err));
          return;
        }
      }
      setEntries((es) =>
        es.map((e) => (e.localKey === localKey ? { ...e, upgrades: upgradeIds } : e))
      );
    },
    [entries]
  );

  const toggleCommandCard = useCallback(
    async (commandCardId: string) => {
      const selected = selectedCommandCardIds.includes(commandCardId);
      if (listId) {
        try {
          if (selected) {
            await removeListCommandCard(listId, commandCardId);
          } else {
            await addListCommandCard(listId, commandCardId);
          }
        } catch (err) {
          setError(String(err));
          return;
        }
      }
      setSelectedCommandCardIds((ids) =>
        selected ? ids.filter((id) => id !== commandCardId) : [...ids, commandCardId]
      );
    },
    [listId, selectedCommandCardIds]
  );

  const toggleBattleDeckCard = useCallback(
    async (scenarioObjectiveId: string) => {
      const selected = selectedBattleDeckIds.includes(scenarioObjectiveId);
      if (listId) {
        try {
          if (selected) {
            await removeListBattleDeckCard(listId, scenarioObjectiveId);
          } else {
            await addListBattleDeckCard(listId, scenarioObjectiveId);
          }
        } catch (err) {
          setError(String(err));
          return;
        }
      }
      setSelectedBattleDeckIds((ids) =>
        selected ? ids.filter((id) => id !== scenarioObjectiveId) : [...ids, scenarioObjectiveId]
      );
    },
    [listId, selectedBattleDeckIds]
  );

  const saveList = useCallback(async () => {
    const dbMode = toDbMode(mode);
    const dbFaction = toDbFaction(factionId);
    try {
      if (!listId) {
        const list = await createList(userId, armyName, dbMode, dbFaction);
        const persisted: BuilderEntry[] = [];
        for (const entry of entries) {
          const created = await addListEntry(list.id, entry.unitId);
          if (entry.count > 1) {
            await updateListEntryCount(created.id, entry.count);
          }
          if (entry.upgrades.length > 0) {
            await updateListEntryUpgrades(created.id, entry.upgrades);
          }
          persisted.push({
            ...entry,
            entryId: created.id,
            count: entry.count,
            upgrades: entry.upgrades,
          });
        }
        for (const commandCardId of selectedCommandCardIds) {
          await addListCommandCard(list.id, commandCardId);
        }
        for (const scenarioObjectiveId of selectedBattleDeckIds) {
          await addListBattleDeckCard(list.id, scenarioObjectiveId);
        }
        setListId(list.id);
        setEntries(persisted);
        setSavedLists((ls) => [list, ...ls]);
      } else {
        const updated = await updateListHeader(listId, armyName, dbMode, dbFaction);
        setSavedLists((ls) => ls.map((l) => (l.id === updated.id ? updated : l)));
      }
    } catch (err) {
      setError(String(err));
    }
  }, [
    userId,
    listId,
    armyName,
    mode,
    factionId,
    entries,
    selectedCommandCardIds,
    selectedBattleDeckIds,
  ]);

  const loadList = useCallback(async (id: string) => {
    try {
      const {
        entries: loadedEntries,
        command_cards,
        battle_deck,
        ...list
      } = await getListWithEntries(id);
      setListId(list.id);
      setArmyName(list.name);
      setFactionId(toUiFaction(list.faction));
      setMode(toUiMode(list.mode));
      setEntries(
        loadedEntries.map((e) => ({
          localKey: nextLocalKey.current++,
          entryId: e.id,
          unitId: e.unit_id,
          count: e.count,
          upgrades: e.upgrades,
        }))
      );
      setSelectedCommandCardIds(command_cards);
      setSelectedBattleDeckIds(battle_deck);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const newList = useCallback(() => {
    setListId(null);
    setArmyName(DEFAULT_NAME);
    setFactionId("separatist");
    setMode("traditional");
    setEntries([]);
    setSelectedCommandCardIds([]);
    setSelectedBattleDeckIds([]);
  }, []);

  return {
    loading,
    error,
    units,
    unitsById,
    keywords,
    upgrades,
    commandCards,
    scenarios,
    savedLists,
    hasCollectionData,
    ownedCountByUnitId,
    listId,
    armyName,
    setArmyName,
    factionId,
    setFactionId,
    mode,
    setMode,
    entries,
    selectedCommandCardIds,
    selectedBattleDeckIds,
    validationIssues,
    availableUnitsForRank,
    addUnit,
    removeEntry,
    setEntryCount,
    setEntryUpgrades,
    toggleCommandCard,
    toggleBattleDeckCard,
    saveList,
    loadList,
    newList,
  };
}
