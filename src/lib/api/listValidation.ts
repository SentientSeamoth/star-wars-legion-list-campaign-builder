// Mirrors src-tauri/src/commands/list_validation.rs -- see lib/api/_PURPOSE.md.

import { invoke } from "@tauri-apps/api/core";
import type { ValidationIssue } from "../types/manual_seed";

export function validateList(listId: string): Promise<ValidationIssue[]> {
  return invoke<ValidationIssue[]>("validate_list", { listId });
}
