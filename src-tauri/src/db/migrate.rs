//! Applies src-tauri/migrations/*.sql in order, tracked by a
//! schema_migrations table so re-launching the app doesn't re-run them.
//! Migration files are embedded at compile time (include_str!) rather than
//! read from disk at runtime, so a packaged install doesn't need to locate
//! them relative to some unknown working directory.

use rusqlite::{params, Connection};

const MIGRATION_0001: &str = include_str!("../../migrations/0001_init.sql");
const MIGRATION_0002: &str = include_str!("../../migrations/0002_collection.sql");
const MIGRATION_0003: &str = include_str!("../../migrations/0003_campaigns.sql");

/// (version, name, sql), applied in order. Numbered to match the
/// migrations/ directory per db/_PURPOSE.md -- once shipped, a migration's
/// SQL never changes; a schema change is always a new numbered file.
const MIGRATIONS: &[(i64, &str, &str)] = &[
    (1, "0001_init", MIGRATION_0001),
    (2, "0002_collection", MIGRATION_0002),
    (3, "0003_campaigns", MIGRATION_0003),
];

pub fn run(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );",
    )?;

    for &(version, name, sql) in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
            params![version],
            |row| row.get(0),
        )?;
        if already_applied {
            continue;
        }
        conn.execute_batch(sql)?;
        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
            params![version, name],
        )?;
    }
    Ok(())
}
