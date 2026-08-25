import { useCallback, useEffect, useState } from "react";
import {
  addOrUpdateOwnedExpansion,
  getUserUnitOwnership,
  listOwnedExpansions,
  removeOwnedExpansion,
  removeUnitOverride,
  setUnitOverride,
} from "../../../lib/api/collection";
import { listExpansions, listUnits } from "../../../lib/api/reference";
import type {
  Expansion,
  Unit,
  UserCollectionEntry,
  UserUnitOwnership,
} from "../../../lib/types/manual_seed";

interface CollectionState {
  loading: boolean;
  error: string | null;
  expansions: Expansion[];
  units: Unit[];
  owned: UserCollectionEntry[];
  ownership: UserUnitOwnership[];
}

const INITIAL_STATE: CollectionState = {
  loading: true,
  error: null,
  expansions: [],
  units: [],
  owned: [],
  ownership: [],
};

/**
 * Loads the reference catalog (expansions/units) plus `userId`'s collection
 * state, and exposes the collection.ts mutations re-synced against the
 * derived `user_unit_ownership` view after each write. `userId` comes from
 * the ProfilePicker (see App.tsx) -- this hook no longer resolves a user on
 * its own.
 */
export function useCollection(userId: string) {
  const [state, setState] = useState<CollectionState>(INITIAL_STATE);

  const refreshOwnership = useCallback(async () => {
    const [owned, ownership] = await Promise.all([
      listOwnedExpansions(userId),
      getUserUnitOwnership(userId),
    ]);
    setState((s) => ({ ...s, owned, ownership }));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [expansions, units] = await Promise.all([listExpansions(), listUnits()]);
        const [owned, ownership] = await Promise.all([
          listOwnedExpansions(userId),
          getUserUnitOwnership(userId),
        ]);
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          expansions,
          units,
          owned,
          ownership,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: String(err) }));
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addExpansion = useCallback(
    async (expansionId: string, quantity: number) => {
      await addOrUpdateOwnedExpansion(userId, expansionId, quantity);
      await refreshOwnership();
    },
    [userId, refreshOwnership]
  );

  const removeExpansion = useCallback(
    async (expansionId: string) => {
      await removeOwnedExpansion(userId, expansionId);
      await refreshOwnership();
    },
    [userId, refreshOwnership]
  );

  const adjustUnitOverride = useCallback(
    async (unitId: string, delta: number, reason?: string) => {
      await setUnitOverride(userId, unitId, delta, reason);
      await refreshOwnership();
    },
    [userId, refreshOwnership]
  );

  const clearUnitOverride = useCallback(
    async (unitId: string) => {
      await removeUnitOverride(userId, unitId);
      await refreshOwnership();
    },
    [userId, refreshOwnership]
  );

  return {
    ...state,
    addExpansion,
    removeExpansion,
    adjustUnitOverride,
    clearUnitOverride,
  };
}
