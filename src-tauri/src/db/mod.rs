//! Storage layer entry point. See _PURPOSE.md in this directory: this
//! module and its children own SQL and connection setup only, no
//! business/game-rules logic.

pub mod migrate;
pub mod queries;
pub mod seed;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Tauri-managed application state: a single shared SQLite connection.
/// Wrapped in a Mutex because rusqlite::Connection is Send but not Sync --
/// this app's write volume is low enough that a single mutex-guarded
/// connection is simpler than a connection pool.
pub struct DbState(pub Mutex<Connection>);

impl DbState {
    pub fn init(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("legion-app.sqlite3");

        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        migrate::run(&conn)?;
        seed::run(&conn)?;

        Ok(DbState(Mutex::new(conn)))
    }
}
