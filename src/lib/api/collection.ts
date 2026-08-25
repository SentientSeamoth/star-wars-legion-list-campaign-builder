// Mirrors src-tauri/src/commands/collection.rs -- see lib/api/_PURPOSE.md:
// this is the ONLY place the frontend is allowed to call invoke() for
// collection-tracking data. Tauri camelCases command argument keys
// automatically, so calls here pass camelCase even though the Rust params
// and the returned row shapes (manual_seed.ts) are snake_case.

import { invoke } from "@tauri-apps/api/core";
import type {
  UnitOwnershipOverride,
  UserCollectionEntry,
  UserUnitOwnership,
} from "../types/manual_seed";

export function addOrUpdateOwnedExpansion(
  userId: string,
  expansionId: string,
  quantityOwned: number,
  notes?: string
): Promise<UserCollectionEntry> {
  return invoke<UserCollectionEntry>("add_or_update_owned_expansion", {
    userId,
    expansionId,
    quantityOwned,
    notes: notes ?? null,
  });
}

export function removeOwnedExpansion(userId: string, expansionId: string): Promise<void> {
  return invoke<void>("remove_owned_expansion", { userId, expansionId });
}

export function listOwnedExpansions(userId: string): Promise<UserCollectionEntry[]> {
  return invoke<UserCollectionEntry[]>("list_owned_expansions", { userId });
}

export function setUnitOverride(
  userId: string,
  unitId: string,
  delta: number,
  reason?: string
): Promise<UnitOwnershipOverride> {
  return invoke<UnitOwnershipOverride>("set_unit_override", {
    userId,
    unitId,
    delta,
    reason: reason ?? null,
  });
}

export function removeUnitOverride(userId: string, unitId: string): Promise<void> {
  return invoke<void>("remove_unit_override", { userId, unitId });
}

export function listUnitOverrides(userId: string): Promise<UnitOwnershipOverride[]> {
  return invoke<UnitOwnershipOverride[]>("list_unit_overrides", { userId });
}

export function getUserUnitOwnership(userId: string): Promise<UserUnitOwnership[]> {
  return invoke<UserUnitOwnership[]>("get_user_unit_ownership", { userId });
}
