//! Mirrors the app-state tables in src-tauri/migrations/0002_collection.sql.
//! Unlike the other types in this module, these aren't backed by a JSON seed
//! file under data/ -- they represent user-owned, per-installation state
//! that lives only in the local SQLite database. Still defined here as the
//! canonical shape so db/ and commands/ share one definition instead of
//! each inventing their own row struct.
//!
//! See src-tauri/src/types/common.rs for the toolchain-not-validated note.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCollectionEntry {
    pub user_id: String,
    pub expansion_id: String,
    pub quantity_owned: u32,
    pub acquired_at: String,

    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitOwnershipOverride {
    pub user_id: String,
    pub unit_id: String,

    /// Can be negative -- see the design note at the top of
    /// 0002_collection.sql for why (lost/damaged models, proxies, trades).
    pub delta: i32,

    #[serde(default)]
    pub reason: Option<String>,
}

/// Result shape of the `user_unit_ownership` SQL view. Read-only from the
/// application's perspective -- computed by the view, never written to
/// directly. This is the ONE place "how many of this unit does the user
/// actually have minis for" gets computed; domain/ code should query this
/// view rather than re-deriving the join+override logic in Rust.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserUnitOwnership {
    pub user_id: String,
    pub unit_id: String,
    pub from_products: i64,
    pub override_delta: i64,
    pub total_owned: i64,
}
