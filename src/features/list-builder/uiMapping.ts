// Bridges this screen's UI-only vocabulary to the backend's real values.
// Neither mismatch gets "fixed" by renaming one side -- the UI keeps its
// established labels (see docs/UI_DESIGN.md's naming note), the DB keeps
// its real CHECK-constrained values (0001_init.sql / data/factions.json).
//
// - Faction: this screen displays "assassins"; the real id is
//   "shadow_collective" (renamed 2026-08-23 from "mercenary" -- see
//   docs/DECISIONS.md; data/factions.json/affiliations.json/
//   battle-forces.json still say "mercenary", not consumed here).
// - Mode: this screen's "traditional"/"custom" toggle maps to the schema's
//   "official"/"freeform" army_lists.mode.

import type { ArmyListMode, Faction } from "../../lib/types/manual_seed";

export type UiFactionId = "separatist" | "republic" | "rebel" | "empire" | "assassins";
export type UiMode = "traditional" | "custom";

const UI_TO_DB_FACTION: Record<UiFactionId, Faction> = {
  separatist: "separatist",
  republic: "republic",
  rebel: "rebel",
  empire: "empire",
  assassins: "shadow_collective",
};

const DB_TO_UI_FACTION: Record<Faction, UiFactionId> = {
  separatist: "separatist",
  republic: "republic",
  rebel: "rebel",
  empire: "empire",
  shadow_collective: "assassins",
};

export function toDbFaction(uiFactionId: UiFactionId): Faction {
  return UI_TO_DB_FACTION[uiFactionId];
}

export function toUiFaction(dbFaction: Faction | null): UiFactionId {
  return dbFaction ? DB_TO_UI_FACTION[dbFaction] : "separatist";
}

export function toDbMode(uiMode: UiMode): ArmyListMode {
  return uiMode === "traditional" ? "official" : "freeform";
}

export function toUiMode(dbMode: ArmyListMode): UiMode {
  return dbMode === "official" ? "traditional" : "custom";
}
