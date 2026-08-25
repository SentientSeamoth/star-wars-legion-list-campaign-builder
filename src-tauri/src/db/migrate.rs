//! Applies src-tauri/migrations/*.sql in order, tracked by a
//! schema_migrations table so re-launching the app doesn't re-run them.
//! Migration files are embedded at compile time (include_str!) rather than
//! read from disk at runtime, so a packaged install doesn't need to locate
//! them relative to some unknown working directory.

use rusqlite::{params, Connection};

const MIGRATION_0001: &str = include_str!("../../migrations/0001_init.sql");
const MIGRATION_0002: &str = include_str!("../../migrations/0002_collection.sql");
const MIGRATION_0003: &str = include_str!("../../migrations/0003_campaigns.sql");
const MIGRATION_0004: &str = include_str!("../../migrations/0004_repair_command_cards_check.sql");
const MIGRATION_0005: &str = include_str!("../../migrations/0005_command_card_commanders.sql");

/// (version, name, sql), applied in order. Numbered to match the
/// migrations/ directory per db/_PURPOSE.md -- once shipped, a migration's
/// SQL never changes; a schema change is always a new numbered file.
const MIGRATIONS: &[(i64, &str, &str)] = &[
    (1, "0001_init", MIGRATION_0001),
    (2, "0002_collection", MIGRATION_0002),
    (3, "0003_campaigns", MIGRATION_0003),
    (4, "0004_repair_command_cards_check", MIGRATION_0004),
    (5, "0005_command_card_commanders", MIGRATION_0005),
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Reproduces the exact bug found 2026-08-25: a database whose
    /// `command_cards` table still has the pre-2026-08-24 constraints
    /// (the ones that used to live in 0001_init.sql before it was edited
    /// in place) must be repaired by migration 0004, without losing data
    /// or breaking the foreign-key relationship other tables have into
    /// `command_cards`. This is the schema subset that actually matters
    /// for the bug -- not a full 0001-0003 replay.
    #[test]
    fn repairs_a_pre_0004_command_cards_table_without_losing_referencing_data() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

        conn.execute_batch(
            "CREATE TABLE units (id TEXT PRIMARY KEY);

             CREATE TABLE command_cards (
                 id                            TEXT PRIMARY KEY,
                 name                          TEXT NOT NULL,
                 category                      TEXT NOT NULL CHECK (category IN ('generic', 'commander-specific')),
                 commander_unit_id             TEXT REFERENCES units(id) ON DELETE RESTRICT,
                 pips                          INTEGER NOT NULL CHECK (pips BETWEEN 1 AND 4),
                 units_activated               TEXT NOT NULL,
                 unit_activation_restriction   TEXT,
                 faction_restriction           TEXT CHECK (faction_restriction IN ('empire','separatist','rebel','republic','shadow_collective') OR faction_restriction IS NULL),
                 battle_force_restriction      TEXT,
                 effect_description            TEXT,
                 effect_verified               INTEGER NOT NULL DEFAULT 0 CHECK (effect_verified IN (0, 1)),
                 roster_verified               INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
                 roster_source                 TEXT,
                 source                        TEXT,
                 notes                         TEXT,
                 CHECK (category != 'commander-specific' OR commander_unit_id IS NOT NULL)
             );

             CREATE TABLE expansion_contents_command_cards (
                 expansion_id     TEXT NOT NULL,
                 command_card_id  TEXT NOT NULL REFERENCES command_cards(id) ON DELETE RESTRICT,
                 quantity         INTEGER NOT NULL DEFAULT 1,
                 PRIMARY KEY (expansion_id, command_card_id)
             );

             INSERT INTO command_cards (id, name, category, commander_unit_id, pips, units_activated, effect_verified, roster_verified)
             VALUES ('ambush', 'Ambush', 'generic', NULL, 1, '1', 1, 1);

             INSERT INTO expansion_contents_command_cards (expansion_id, command_card_id)
             VALUES ('upgrade-card-pack', 'ambush');",
        )
        .unwrap();

        // Prove the "before" state is real: the old table-level CHECK
        // really does reject a commander-specific card with no commander
        // and null pips, the exact shape of row the 2026-08-24 command-
        // card expansion needs to insert.
        let rejected_before_repair = conn.execute(
            "INSERT INTO command_cards (id, name, category, commander_unit_id, pips, units_activated, effect_verified, roster_verified)
             VALUES ('unresolved-card', 'Unresolved', 'commander-specific', NULL, 1, '1', 1, 1)",
            [],
        );
        assert!(
            rejected_before_repair.is_err(),
            "test setup didn't reproduce the old CHECK constraint -- test would be meaningless"
        );

        conn.execute_batch(MIGRATION_0004).unwrap();

        // The same shape of row -- including null pips, which the old
        // schema also would have rejected via its NOT NULL -- must now
        // succeed.
        conn.execute(
            "INSERT INTO command_cards (id, name, category, commander_unit_id, pips, units_activated, effect_verified, roster_verified)
             VALUES ('unresolved-card', 'Unresolved', 'commander-specific', NULL, NULL, NULL, 1, 1)",
            [],
        )
        .expect("repair migration should allow null commander_unit_id/pips/units_activated");

        // The pre-existing row, and the OTHER table's foreign key into
        // it, must have survived the drop/recreate intact.
        let survived: String = conn
            .query_row(
                "SELECT command_card_id FROM expansion_contents_command_cards WHERE expansion_id = 'upgrade-card-pack'",
                [],
                |row| row.get(0),
            )
            .expect("expansion_contents_command_cards row should survive the rebuild");
        assert_eq!(survived, "ambush");

        let ambush_still_there: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM command_cards WHERE id = 'ambush')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(ambush_still_there, "pre-existing command_cards row should survive the rebuild");
    }

    /// Migration 0005 replaces the single-owner `commander_unit_id` column
    /// with a real `command_card_commanders` join table, because real card
    /// data (resolved 2026-08-25) proved some cards need TWO owners (joint
    /// or either-ownership) -- a shape the old column could never
    /// represent at all. Starts from a post-0004 schema (nullable pips/
    /// units_activated, relaxed CHECK, but still the single
    /// commander_unit_id column) since that's the real state any database
    /// migrated through 0004 but not yet 0005 would be in.
    #[test]
    fn moves_single_owner_data_into_the_join_table_and_allows_multiple_owners() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

        conn.execute_batch(
            "CREATE TABLE units (id TEXT PRIMARY KEY);
             INSERT INTO units (id) VALUES ('fifth-brother'), ('seventh-sister');

             CREATE TABLE command_cards (
                 id                            TEXT PRIMARY KEY,
                 name                          TEXT NOT NULL,
                 category                      TEXT NOT NULL CHECK (category IN ('generic', 'commander-specific')),
                 commander_unit_id             TEXT REFERENCES units(id) ON DELETE RESTRICT,
                 pips                          INTEGER CHECK (pips BETWEEN 0 AND 4),
                 units_activated               TEXT,
                 unit_activation_restriction   TEXT,
                 faction_restriction           TEXT,
                 battle_force_restriction      TEXT,
                 effect_description            TEXT,
                 effect_verified               INTEGER NOT NULL DEFAULT 0,
                 roster_verified               INTEGER NOT NULL DEFAULT 0,
                 roster_source                 TEXT,
                 source                        TEXT,
                 notes                         TEXT
             );

             CREATE TABLE expansion_contents_command_cards (
                 expansion_id     TEXT NOT NULL,
                 command_card_id  TEXT NOT NULL REFERENCES command_cards(id) ON DELETE RESTRICT,
                 quantity         INTEGER NOT NULL DEFAULT 1,
                 PRIMARY KEY (expansion_id, command_card_id)
             );

             INSERT INTO command_cards (id, name, category, commander_unit_id, pips, units_activated, effect_verified, roster_verified)
             VALUES ('die-at-my-hand', 'Die at My Hand', 'commander-specific', 'fifth-brother', 3, '1', 1, 1);

             INSERT INTO expansion_contents_command_cards (expansion_id, command_card_id)
             VALUES ('some-pack', 'die-at-my-hand');",
        )
        .unwrap();

        conn.execute_batch(MIGRATION_0005).unwrap();

        // The pre-existing single-owner row's data must have moved into
        // the new join table.
        let owner: String = conn
            .query_row(
                "SELECT unit_id FROM command_card_commanders WHERE command_card_id = 'die-at-my-hand'",
                [],
                |row| row.get(0),
            )
            .expect("existing commander_unit_id data should be backfilled into the join table");
        assert_eq!(owner, "fifth-brother");

        // The old column must be gone (this insert would have silently
        // dropped a would-be second owner before 0005 -- there was nowhere
        // to put it).
        let old_column_gone = conn.execute(
            "UPDATE command_cards SET commander_unit_id = 'x' WHERE id = 'die-at-my-hand'",
            [],
        );
        assert!(old_column_gone.is_err(), "commander_unit_id column should no longer exist");

        // The whole point: a card can now have a SECOND owner, which the
        // old schema could never represent.
        conn.execute(
            "INSERT INTO command_card_commanders (command_card_id, unit_id) VALUES ('die-at-my-hand', 'seventh-sister')",
            [],
        )
        .expect("join table should allow a second owner for a joint-ownership card");
        conn.execute(
            "UPDATE command_cards SET commander_ownership = 'all' WHERE id = 'die-at-my-hand'",
            [],
        )
        .expect("commander_ownership column should exist and accept 'all'");

        let owner_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM command_card_commanders WHERE command_card_id = 'die-at-my-hand'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(owner_count, 2);

        // The FK-referencing child table must still resolve after the
        // rebuild.
        let survived: String = conn
            .query_row(
                "SELECT command_card_id FROM expansion_contents_command_cards WHERE expansion_id = 'some-pack'",
                [],
                |row| row.get(0),
            )
            .expect("expansion_contents_command_cards row should survive the rebuild");
        assert_eq!(survived, "die-at-my-hand");
    }
}
