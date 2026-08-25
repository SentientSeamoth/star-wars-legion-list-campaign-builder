-- 0001_init.sql
-- Initial schema for the Legion app's local SQLite database.
--
-- Mirrors the JSON seed data shapes in data/*.json and the Rust types in
-- src-tauri/src/types/*.rs. Array-valued JSON fields (e.g. Unit.factions,
-- Unit.unit_types) become join tables here rather than JSON-blob columns,
-- so they stay queryable and constrainable with real foreign keys -- this
-- is the db/ layer's job per docs/FILE_STRUCTURE.md: storage only, real
-- relational structure, no business logic.
--
-- NOT YET EXECUTED AGAINST A REAL APPLICATION -- this sandbox has no Rust/
-- Tauri toolchain to run it through the app itself, but it HAS been run
-- directly against SQLite (see docs/TODO.md for the validation note) to
-- confirm the SQL itself is syntactically valid and self-consistent.
--
-- 2026-08-23: edited directly (not via a new numbered migration) to add
-- the Faction rename (mercenary -> shadow_collective) and the new
-- units.* stat columns from the card-extraction data batch. db/_PURPOSE.md
-- says migrations are append-only "once shipped" -- this schema has never
-- actually been executed by a compiled build (no toolchain has ever
-- existed in this project to run one), so there's no real deployed
-- database whose migration history this would break. Recreating 4 tables
-- via SQLite's ALTER-via-recreate dance to preserve strict immutability
-- would be real, untestable complexity for no practical benefit here.
-- Once a real build exists and this has actually shipped, go back to
-- strictly append-only. See docs/DECISIONS.md.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Keywords
-- ============================================================

CREATE TABLE keywords (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('unit', 'weapon', 'upgrade')),
    parameterized       INTEGER NOT NULL CHECK (parameterized IN (0, 1)),
    stacks              INTEGER CHECK (stacks IN (0, 1) OR stacks IS NULL),
    description         TEXT NOT NULL,
    rules_note          TEXT,
    verified            INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
    verification_note   TEXT
);

-- ============================================================
-- Units
-- ============================================================

CREATE TABLE units (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    is_unique              INTEGER NOT NULL CHECK (is_unique IN (0, 1)), -- "unique" is a SQL reserved word
    unique_verified        INTEGER DEFAULT 0 CHECK (unique_verified IN (0, 1)),
    affiliation            TEXT,
    affiliation_verified   INTEGER DEFAULT 0 CHECK (affiliation_verified IN (0, 1)),
    rank                   TEXT NOT NULL CHECK (rank IN ('commander','operative','corps','special-forces','support','heavy','attached')),
    unit_types_verified    INTEGER DEFAULT 0 CHECK (unit_types_verified IN (0, 1)),
    legality               TEXT NOT NULL CHECK (legality IN ('active', 'removed')),
    roster_verified        INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source          TEXT,
    roster_source_note     TEXT,
    subtitle                TEXT,      -- flavor title under the name, e.g. "Master Tactician" (added 2026-08-23)

    -- stats (UnitStats in unit.rs) -- flattened onto the unit row since it's
    -- a 1:1 relationship, not a separate concept with its own identity
    base_count             INTEGER,
    base_size              TEXT,
    points                 INTEGER,
    points_verified         INTEGER NOT NULL DEFAULT 0 CHECK (points_verified IN (0, 1)),   -- added 2026-08-23; independent of stats_verified below
    points_source            TEXT,      -- added 2026-08-23
    wound_threshold        INTEGER,
    courage                TEXT,       -- stored as text; may be an int-as-string or short phrase, see IntOrText in common.rs
    resilience               INTEGER,   -- added 2026-08-23; vehicles use this instead of courage
    speed                  INTEGER,
    defense_die            TEXT CHECK (defense_die IN ('white', 'red') OR defense_die IS NULL),
    attack_surge              TEXT,      -- added 2026-08-23
    defense_surge             TEXT,      -- added 2026-08-23
    surge_chart_json       TEXT,       -- raw JSON blob until the real shape is known (see unit.rs UnitStats.surge_chart)
    weapons_json            TEXT,      -- raw JSON blob until the real shape is known
    weapons_verified          INTEGER NOT NULL DEFAULT 0 CHECK (weapons_verified IN (0, 1)),   -- added 2026-08-23
    keywords_json             TEXT,      -- added 2026-08-23: raw printed keyword strings (NOT resolved ids -- see keywords_resolved_to_library and unit_keywords below)
    keywords_resolved_to_library INTEGER NOT NULL DEFAULT 0 CHECK (keywords_resolved_to_library IN (0, 1)),   -- added 2026-08-23
    upgrade_bar_json       TEXT,       -- JSON array of upgrade-bar slot categories

    stats_verified          INTEGER NOT NULL DEFAULT 0 CHECK (stats_verified IN (0, 1)),
    stats_note              TEXT,
    expansion                TEXT,
    notes                    TEXT
);

-- Unit.factions is an array in the JSON -- join table, not a CSV column,
-- so "which units are in faction X" stays a real indexed query.
-- RENAMED 2026-08-23: 'mercenary' -> 'shadow_collective', matching the
-- rename in data/units.json and types/common.rs::Faction. See
-- docs/DECISIONS.md.
CREATE TABLE unit_factions (
    unit_id   TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    faction   TEXT NOT NULL CHECK (faction IN ('empire','separatist','rebel','republic','shadow_collective')),
    PRIMARY KEY (unit_id, faction)
);
CREATE INDEX idx_unit_factions_faction ON unit_factions(faction);

-- Unit.unit_types is an array in the JSON -- same reasoning.
CREATE TABLE unit_type_tags (
    unit_id     TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    unit_type   TEXT NOT NULL CHECK (unit_type IN ('trooper','vehicle','droid','creature','emplacement')),
    PRIMARY KEY (unit_id, unit_type)
);
CREATE INDEX idx_unit_type_tags_type ON unit_type_tags(unit_type);

-- UnitStats.keywords -- real foreign key to keywords(id) so a bad keyword
-- reference fails loudly, same principle as command_cards.commander_unit_id
-- below. Deliberately UNPOPULATED as of 2026-08-23: the card-extraction
-- batches store raw printed keyword strings (e.g. "Full Pivot"), not ids
-- that resolve against this table -- see units.keywords_json /
-- keywords_resolved_to_library above. This table is ready for a future
-- pass that actually resolves those strings to real keyword ids.
CREATE TABLE unit_keywords (
    unit_id      TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    keyword_id   TEXT NOT NULL REFERENCES keywords(id) ON DELETE RESTRICT,
    PRIMARY KEY (unit_id, keyword_id)
);

-- ============================================================
-- Upgrades
-- ============================================================

CREATE TABLE upgrades (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    category               TEXT NOT NULL CHECK (category IN (
                                'armament','command','comms','crew','force','gear',
                                'generator','grenades','hardpoint','heavy-weapon',
                                'ordnance','personnel','programming','pilot','training','doctrine'
                            )),
    unique_card            INTEGER NOT NULL CHECK (unique_card IN (0, 1)),
    restriction            TEXT NOT NULL CHECK (restriction IN ('generic','faction','character','affiliation','battle-force')),
    restricted_to_json     TEXT,   -- raw JSON: string, array, or null depending on restriction scope
    points                 INTEGER,
    points_verified        INTEGER NOT NULL DEFAULT 0 CHECK (points_verified IN (0, 1)),
    effect_description     TEXT,
    effect_verified        INTEGER NOT NULL DEFAULT 0 CHECK (effect_verified IN (0, 1)),
    weapon_profile_json    TEXT,
    source                 TEXT,
    roster_verified        INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source          TEXT,
    notes                  TEXT
);

CREATE TABLE upgrade_keywords_granted (
    upgrade_id   TEXT NOT NULL REFERENCES upgrades(id) ON DELETE CASCADE,
    keyword_id   TEXT NOT NULL REFERENCES keywords(id) ON DELETE RESTRICT,
    PRIMARY KEY (upgrade_id, keyword_id)
);

-- ============================================================
-- Command cards
-- ============================================================

CREATE TABLE command_cards (
    id                            TEXT PRIMARY KEY,
    name                          TEXT NOT NULL,
    category                      TEXT NOT NULL CHECK (category IN ('generic', 'commander-specific')),
    commander_unit_id             TEXT REFERENCES units(id) ON DELETE RESTRICT,
    -- NULL where a current primary source did not expose the printed pip
    -- value (added 2026-08-24 by the command-card expansion pass -- see
    -- each such card's `notes`). 0 is a real printed value used by cards
    -- explicitly treated as a lower pip cost while building the command
    -- hand (see e.g. "Sorry About the Mess").
    pips                          INTEGER CHECK (pips BETWEEN 0 AND 4),
    -- NULL for the same "source didn't expose it" reason as pips.
    units_activated               TEXT,  -- int-as-text or short phrase, see IntOrText in common.rs
    unit_activation_restriction   TEXT,
    faction_restriction           TEXT CHECK (faction_restriction IN ('empire','separatist','rebel','republic','shadow_collective') OR faction_restriction IS NULL),
    battle_force_restriction      TEXT,
    effect_description            TEXT,
    effect_verified               INTEGER NOT NULL DEFAULT 0 CHECK (effect_verified IN (0, 1)),
    roster_verified                INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source                  TEXT,
    source                         TEXT,
    notes                          TEXT

    -- 2026-08-24: dropped the old "commander-specific MUST name its
    -- commander" CHECK. Real official card data (the command-card
    -- expansion pass) disproved the one-card-one-commander assumption it
    -- encoded: some commander-specific cards are jointly owned by two
    -- named units (e.g. "Fifth Brother & Seventh Sister"), some by
    -- either of two ("Jedi Knight or Jedi Knight General"), and a handful
    -- name a real character (e.g. Grand Admiral Thrawn) who isn't in
    -- units.json yet. commander_unit_id is populated wherever it
    -- resolves to exactly one real unit id (117 of 173 commander-specific
    -- cards as of this pass); the remainder are a documented, honest gap
    -- -- see docs/TODO.md -- not silently guessed at.
);
CREATE INDEX idx_command_cards_commander ON command_cards(commander_unit_id);

-- ============================================================
-- Scenario / objective cards
-- ============================================================

CREATE TABLE scenario_objectives (
    id                              TEXT PRIMARY KEY,
    name                            TEXT NOT NULL,
    category                        TEXT NOT NULL CHECK (category IN ('primary','secondary','advantage','recon','narrative-scenario')),
    game_format                     TEXT NOT NULL CHECK (game_format IN ('standard-1000','recon-600','narrative')),
    game_format_verified            INTEGER NOT NULL DEFAULT 0 CHECK (game_format_verified IN (0, 1)),
    roster_verified                 INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source                   TEXT,
    map_card                        TEXT,
    deployment_note                 TEXT,
    points_of_interest_json         TEXT,
    points_of_interest_verified     INTEGER NOT NULL DEFAULT 0 CHECK (points_of_interest_verified IN (0, 1)),
    victory_condition                TEXT,
    victory_condition_verified       INTEGER NOT NULL DEFAULT 0 CHECK (victory_condition_verified IN (0, 1)),
    notes                            TEXT
);
CREATE INDEX idx_scenario_objectives_category ON scenario_objectives(category);

-- ============================================================
-- App state: users, army lists (local profiles, per docs/DECISIONS.md)
-- ============================================================

CREATE TABLE users (
    id             TEXT PRIMARY KEY,
    display_name   TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE army_lists (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    mode           TEXT NOT NULL CHECK (mode IN ('official', 'freeform')),
    faction        TEXT CHECK (faction IN ('empire','separatist','rebel','republic','shadow_collective') OR faction IS NULL),
    points_total   INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_army_lists_user ON army_lists(user_id);

CREATE TABLE army_list_entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id        TEXT NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    unit_id        TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    count          INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
    upgrades_json  TEXT   -- JSON array of upgrade ids equipped to this entry
);
CREATE INDEX idx_army_list_entries_list ON army_list_entries(list_id);
CREATE INDEX idx_army_list_entries_unit ON army_list_entries(unit_id);

CREATE TABLE army_list_command_cards (
    list_id           TEXT NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    command_card_id   TEXT NOT NULL REFERENCES command_cards(id) ON DELETE RESTRICT,
    PRIMARY KEY (list_id, command_card_id)
);

CREATE TABLE army_list_battle_deck (
    list_id               TEXT NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    scenario_objective_id TEXT NOT NULL REFERENCES scenario_objectives(id) ON DELETE RESTRICT,
    PRIMARY KEY (list_id, scenario_objective_id)
);

-- ============================================================
-- Rules-update checker audit log (see src-tauri/src/scraper/_PURPOSE.md --
-- this table backs the "review a diff, don't silently auto-patch" design)
-- ============================================================

CREATE TABLE rules_updates_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    checked_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    source_url     TEXT NOT NULL,
    version_found  TEXT,
    diff_summary   TEXT,
    applied        INTEGER NOT NULL DEFAULT 0 CHECK (applied IN (0, 1))
);

-- ============================================================
-- Campaigns -- PLACEHOLDER ONLY, per explicit project-owner instruction.
-- Do not add columns beyond this minimal shape until the feature is
-- actually specced. See docs/TODO.md and docs/DECISIONS.md.
-- ============================================================

CREATE TABLE campaigns (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
