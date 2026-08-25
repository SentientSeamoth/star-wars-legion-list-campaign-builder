-- 0004_repair_command_cards_check.sql
-- Repairs the `command_cards` table on databases created before the
-- 2026-08-24 command-card expansion pass. That pass edited
-- 0001_init.sql *in place* to relax `pips`/`units_activated` to nullable
-- and drop the old "commander-specific MUST name its commander" CHECK --
-- but SQLite migrations are tracked as applied-once per database
-- (schema_migrations), so any database that already ran 0001_init.sql
-- before that edit kept the OLD, stricter table definition forever. In
-- practice this meant the app crashed on launch for any existing install
-- the moment it tried to seed a commander-specific command card with a
-- null commander_unit_id or a null pips/units_activated value --
-- reproduced for real on 2026-08-25 during a full audit pass (see
-- docs/DECISIONS.md and docs/ROADMAP.md's P0 entry).
--
-- This migration converges EVERY database -- old-schema, already-current
-- (a database created after the in-place edit), and brand-new -- to the
-- exact same `command_cards` schema currently defined in 0001_init.sql.
-- On an already-current database this is a harmless no-op rebuild (same
-- columns, same constraints, data copied straight across).
--
-- Uses SQLite's documented 12-step "arbitrary schema change" procedure
-- (https://www.sqlite.org/lang_altertable.html#otheralter) rather than
-- ALTER TABLE, since SQLite can't drop/relax a CHECK constraint in place.
-- No other table's schema is affected -- `expansion_contents_command_cards`
-- and `army_list_command_cards` reference `command_cards` by table NAME,
-- which is unchanged (create-new / copy / drop-old / rename-new-to-old),
-- so neither needs to be touched.
--
-- Lesson learned, logged here rather than just in prose: 0001_init.sql
-- should not be edited in place again now that real installs exist.
-- Every future schema change is a new numbered migration, full stop.

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

CREATE TABLE command_cards_new (
    id                            TEXT PRIMARY KEY,
    name                          TEXT NOT NULL,
    category                      TEXT NOT NULL CHECK (category IN ('generic', 'commander-specific')),
    commander_unit_id             TEXT REFERENCES units(id) ON DELETE RESTRICT,
    pips                          INTEGER CHECK (pips BETWEEN 0 AND 4),
    units_activated               TEXT,
    unit_activation_restriction   TEXT,
    faction_restriction           TEXT CHECK (faction_restriction IN ('empire','separatist','rebel','republic','shadow_collective') OR faction_restriction IS NULL),
    battle_force_restriction      TEXT,
    effect_description            TEXT,
    effect_verified               INTEGER NOT NULL DEFAULT 0 CHECK (effect_verified IN (0, 1)),
    roster_verified                INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source                  TEXT,
    source                         TEXT,
    notes                          TEXT
);

-- Every existing row already satisfied the OLD, stricter constraints, and
-- the new constraints are a strict relaxation of the old ones -- so every
-- row is guaranteed to still be valid here. No column list mismatch is
-- possible: no column was added, removed, or reordered by the 2026-08-24
-- edit, only constraints were relaxed.
INSERT INTO command_cards_new SELECT * FROM command_cards;

DROP TABLE command_cards;
ALTER TABLE command_cards_new RENAME TO command_cards;

CREATE INDEX idx_command_cards_commander ON command_cards(commander_unit_id);

COMMIT;

PRAGMA foreign_keys = ON;
