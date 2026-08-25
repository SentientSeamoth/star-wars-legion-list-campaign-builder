// Mirrors src-tauri/src/commands/reference.rs -- read-only catalog lookups
// (expansions/units/keywords/upgrades/command cards/scenario objectives),
// served from the same embedded data/*.json content the backend seeds its
// DB from. See lib/api/_PURPOSE.md.

import { invoke } from "@tauri-apps/api/core";
import type {
  CommandCard,
  Expansion,
  Keyword,
  ScenarioObjective,
  Unit,
  Upgrade,
} from "../types/manual_seed";

export function listExpansions(): Promise<Expansion[]> {
  return invoke<Expansion[]>("list_expansions");
}

export function listUnits(): Promise<Unit[]> {
  return invoke<Unit[]>("list_units");
}

export function listKeywords(): Promise<Keyword[]> {
  return invoke<Keyword[]>("list_keywords");
}

export function listUpgrades(): Promise<Upgrade[]> {
  return invoke<Upgrade[]>("list_upgrades");
}

export function listCommandCards(): Promise<CommandCard[]> {
  return invoke<CommandCard[]>("list_command_cards");
}

export function listScenarios(): Promise<ScenarioObjective[]> {
  return invoke<ScenarioObjective[]>("list_scenarios");
}
