//! Shared error type for every #[tauri::command] in commands/. Wraps the
//! lower-level errors that can occur in db/ so they cross the Tauri IPC
//! boundary as a real message instead of the command handler panicking.

use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// A domain/ business-rule violation (e.g. a campaign store purchase
    /// blocked by an unlock threshold) -- not a storage/parse failure, so
    /// it gets its own variant rather than being forced through Database.
    #[error("{0}")]
    Rule(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
