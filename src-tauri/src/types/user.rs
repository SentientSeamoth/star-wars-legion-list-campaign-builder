//! Mirrors the `users` table in src-tauri/migrations/0001_init.sql. Not
//! shipped as data/*.json seed content -- this is app-state, like the types
//! in collection.rs. See common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub display_name: String,
    pub created_at: String,
}
