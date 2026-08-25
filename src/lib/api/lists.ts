// Mirrors src-tauri/src/commands/lists.rs -- see lib/api/_PURPOSE.md.

import { invoke } from "@tauri-apps/api/core";
import type {
  ArmyList,
  ArmyListEntry,
  ArmyListMode,
  ArmyListWithEntries,
} from "../types/manual_seed";

export function createList(
  userId: string,
  name: string,
  mode: ArmyListMode,
  faction?: string | null
): Promise<ArmyList> {
  return invoke<ArmyList>("create_list", { userId, name, mode, faction: faction ?? null });
}

export function updateListHeader(
  listId: string,
  name: string,
  mode: ArmyListMode,
  faction?: string | null
): Promise<ArmyList> {
  return invoke<ArmyList>("update_list_header", {
    listId,
    name,
    mode,
    faction: faction ?? null,
  });
}

export function deleteList(listId: string): Promise<void> {
  return invoke<void>("delete_list", { listId });
}

export function listListsForUser(userId: string): Promise<ArmyList[]> {
  return invoke<ArmyList[]>("list_lists_for_user", { userId });
}

export function getListWithEntries(listId: string): Promise<ArmyListWithEntries> {
  return invoke<ArmyListWithEntries>("get_list_with_entries", { listId });
}

export function addListEntry(listId: string, unitId: string): Promise<ArmyListEntry> {
  return invoke<ArmyListEntry>("add_list_entry", { listId, unitId });
}

export function updateListEntryCount(entryId: number, count: number): Promise<ArmyListEntry> {
  return invoke<ArmyListEntry>("update_list_entry_count", { entryId, count });
}

export function updateListEntryUpgrades(
  entryId: number,
  upgradeIds: string[]
): Promise<ArmyListEntry> {
  return invoke<ArmyListEntry>("update_list_entry_upgrades", { entryId, upgradeIds });
}

export function removeListEntry(entryId: number): Promise<void> {
  return invoke<void>("remove_list_entry", { entryId });
}

export function addListCommandCard(listId: string, commandCardId: string): Promise<void> {
  return invoke<void>("add_list_command_card", { listId, commandCardId });
}

export function removeListCommandCard(listId: string, commandCardId: string): Promise<void> {
  return invoke<void>("remove_list_command_card", { listId, commandCardId });
}

export function addListBattleDeckCard(
  listId: string,
  scenarioObjectiveId: string
): Promise<void> {
  return invoke<void>("add_list_battle_deck_card", { listId, scenarioObjectiveId });
}

export function removeListBattleDeckCard(
  listId: string,
  scenarioObjectiveId: string
): Promise<void> {
  return invoke<void>("remove_list_battle_deck_card", { listId, scenarioObjectiveId });
}
