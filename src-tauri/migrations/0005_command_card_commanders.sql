-- 0005_command_card_commanders.sql
-- Replaces command_cards.commander_unit_id (a single nullable TEXT
-- column) with a real command_card_commanders join table, plus a new
-- command_cards.commander_ownership column.
--
-- Real card data (the 2026-08-24 command-card expansion pass, resolved
-- further 2026-08-25) proved a card's ownership doesn't always fit "zero
-- or one commander": some cards are jointly owned by two named units,
-- both required (e.g. "Fifth Brother & Seventh Sister"), and some are
-- owned by either of two, one sufficing (e.g. "Jedi Knight or Jedi Knight
-- General"). A single nullable id column can't represent either shape --
-- see docs/TODO.md's "Command cards library gaps" and docs/ROADMAP.md's
-- P1 entry for the full data breakdown.
--
-- Same rebuild procedure as 0004 (SQLite can't add/drop a column with a
-- FOREIGN KEY in one ALTER TABLE): create-new / copy / drop-old / rename.
-- `army_list_command_cards` and `expansion_contents_command_cards`
-- reference `command_cards` by table NAME, which is unchanged, so neither
-- needs to be touched. The new join table is created (and backfilled from
-- the OLD commander_unit_id column) BEFORE the old command_cards table is
-- dropped, so its own FK into command_cards(id) resolves correctly
-- throughout -- same ordering trick 0004 relied on for the tables that
-- already referenced command_cards.

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

CREATE TABLE command_card_commanders (
    command_card_id  TEXT NOT NULL REFERENCES command_cards(id) ON DELETE CASCADE,
    unit_id          TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    PRIMARY KEY (command_card_id, unit_id)
);

INSERT INTO command_card_commanders (command_card_id, unit_id)
SELECT id, commander_unit_id FROM command_cards WHERE commander_unit_id IS NOT NULL;

CREATE TABLE command_cards_new (
    id                            TEXT PRIMARY KEY,
    name                          TEXT NOT NULL,
    category                      TEXT NOT NULL CHECK (category IN ('generic', 'commander-specific')),
    commander_ownership           TEXT CHECK (commander_ownership IN ('all', 'any') OR commander_ownership IS NULL),
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

INSERT INTO command_cards_new (
    id, name, category, pips, units_activated, unit_activation_restriction,
    faction_restriction, battle_force_restriction, effect_description,
    effect_verified, roster_verified, roster_source, source, notes
)
SELECT
    id, name, category, pips, units_activated, unit_activation_restriction,
    faction_restriction, battle_force_restriction, effect_description,
    effect_verified, roster_verified, roster_source, source, notes
FROM command_cards;

DROP TABLE command_cards;
ALTER TABLE command_cards_new RENAME TO command_cards;

CREATE INDEX idx_command_card_commanders_unit ON command_card_commanders(unit_id);

COMMIT;

PRAGMA foreign_keys = ON;
