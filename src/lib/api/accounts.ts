import { invoke } from "@tauri-apps/api/core";
import type { User } from "../types/manual_seed";

export function createUser(displayName: string): Promise<User> {
  return invoke<User>("create_user", { displayName });
}

export function listUsers(): Promise<User[]> {
  return invoke<User[]>("list_users");
}
