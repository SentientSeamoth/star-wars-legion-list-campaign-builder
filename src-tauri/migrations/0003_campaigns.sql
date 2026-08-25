-- 0003_campaigns.sql
-- Campaign Mode: narrative, warband-style campaigns with permadeath
-- rosters, a homebrew credits/store economy, and branching hero-unit
-- upgrade paths. See docs/DECISIONS.md's 2026-08-24 entry for the full
-- design rationale.
--
-- GOVERNING PRINCIPLE: this is a bookkeeping/journal system, not a rules
-- engine. Countable facts (credits, model counts, meter values, costs)
-- are real typed columns; bespoke narrative/mechanical text (path fluff,
-- custom battle mechanics, upgrade effects) is freeform TEXT the GM
-- authors by hand -- there is no fixed rule set to encode, since every
-- homebrew campaign invents its own.
--
-- Replaces the old `campaigns` placeholder table from 0001_init.sql (just
-- id/name/created_at, never referenced by any command). Migrations are
-- otherwise append-only once shipped, but that table has no real data and
-- nothing else references it, so dropping and recreating it here (rather
-- than editing 0001_init.sql in place) is the safe move -- see
-- docs/DECISIONS.md.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS campaigns;

-- ============================================================
-- Campaigns and participants
-- ============================================================

CREATE TABLE campaigns (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    summary      TEXT,   -- opening narrative summary
    mode         TEXT NOT NULL CHECK (mode IN ('solo', 'two-player', 'gm-player')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Branching narrative arcs (created before campaign_participants since a
-- participant's chosen_path_id references this table).
CREATE TABLE campaign_paths (
    id             TEXT PRIMARY KEY,
    campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    style_summary  TEXT,   -- one-line theme, e.g. "Formation control, droid synergy"
    narrative      TEXT,   -- the full descriptive text
    sort_order     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_paths_campaign ON campaign_paths(campaign_id);

-- A local user's participation in a campaign, with a role/side and their
-- own credits ledger -- supports solo (1 row), two-player (2 "player"
-- rows), or GM+player (1 "gm" row + 1 "player" row, or an "opponent" row
-- for an NPC-run side the GM tracks on the player's behalf).
CREATE TABLE campaign_participants (
    id                            TEXT PRIMARY KEY,
    campaign_id                   TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id                       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                          TEXT NOT NULL CHECK (role IN ('player', 'gm', 'opponent')),
    side_name                     TEXT,   -- flavor label for this participant's force, e.g. "Grievous"
    credits_balance               INTEGER NOT NULL DEFAULT 0,
    chosen_path_id                TEXT REFERENCES campaign_paths(id) ON DELETE SET NULL,
    -- Implements the confirmed non-banking upgrade-purchase rule (see
    -- docs/DECISIONS.md): completing a mission SETS this to 1 (never
    -- incremented), spending the purchase SETS it back to 0. An unused
    -- opportunity never carries over -- the next mission-complete just
    -- overwrites it back to 1.
    upgrade_purchase_available    INTEGER NOT NULL DEFAULT 0 CHECK (upgrade_purchase_available IN (0, 1)),
    UNIQUE (campaign_id, user_id)
);
CREATE INDEX idx_campaign_participants_campaign ON campaign_participants(campaign_id);

-- ============================================================
-- Missions and their outcomes
-- ============================================================

CREATE TABLE campaign_missions (
    id                TEXT PRIMARY KEY,
    campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    path_id           TEXT REFERENCES campaign_paths(id) ON DELETE SET NULL,
    name              TEXT NOT NULL,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    setup_narrative   TEXT,   -- the story text read before the battle
    objectives        TEXT,   -- freeform win conditions / mission rules
    battle_mechanics  TEXT,   -- bespoke spawn schedules, reinforcement rules, etc.
    status            TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'completed'))
);
CREATE INDEX idx_campaign_missions_campaign ON campaign_missions(campaign_id);

-- Possible branching reward outcomes for a mission (e.g. "If the bot
-- factory was saved" / "If the imperial base was saved") -- more than one
-- can apply to a single played battle report, see the join table below.
CREATE TABLE campaign_mission_outcomes (
    id                TEXT PRIMARY KEY,
    mission_id        TEXT NOT NULL REFERENCES campaign_missions(id) ON DELETE CASCADE,
    condition_label   TEXT NOT NULL,
    reward_credits    INTEGER NOT NULL DEFAULT 0,
    reward_notes      TEXT,   -- freeform: "+1 unit (2x B1, 1x STAP...), +1 Grievous upgrade"
    sort_order        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_mission_outcomes_mission ON campaign_mission_outcomes(mission_id);

-- ============================================================
-- Roster: permadeath units recruited into a participant's force
-- ============================================================

-- Deliberately a new, dedicated table rather than reusing
-- army_lists/army_list_entries -- campaign rosters need per-model loss
-- tracking, a specialty flag, and purchase provenance that don't fit the
-- list-builder shape, and army_lists.mode's CHECK constraint doesn't
-- include a campaign mode. See docs/DECISIONS.md.
-- unit_id is nullable, matching campaign_store_items.unit_id -- a roster
-- entry bought from a store item that doesn't map to a catalogued unit
-- still needs a row to live in (display falls back to nickname/the store
-- item's display_name).
CREATE TABLE campaign_roster_entries (
    id                     TEXT PRIMARY KEY,
    participant_id         TEXT NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    unit_id                TEXT REFERENCES units(id) ON DELETE RESTRICT,
    nickname               TEXT,   -- optional custom name for this specific squad/hero
    models_total           INTEGER NOT NULL DEFAULT 1 CHECK (models_total >= 1),
    models_lost            INTEGER NOT NULL DEFAULT 0 CHECK (models_lost >= 0),
    is_specialty           INTEGER NOT NULL DEFAULT 0 CHECK (is_specialty IN (0, 1)),
    upgrades_json          TEXT NOT NULL DEFAULT '[]',   -- equipped upgrade ids, mirrors army_list_entries.upgrades_json
    acquired_mission_id    TEXT REFERENCES campaign_missions(id) ON DELETE SET NULL,
    retired                INTEGER NOT NULL DEFAULT 0 CHECK (retired IN (0, 1))   -- fully destroyed/removed from play
);
CREATE INDEX idx_campaign_roster_entries_participant ON campaign_roster_entries(participant_id);

-- ============================================================
-- Battle reports: the recorded play history
-- ============================================================

-- participant_id: whose play-through of the mission this report is (the
-- credits award and upgrade-purchase opportunity apply to this
-- participant). A mission can be replayed by more than one participant in
-- two-player mode, each getting their own report row.
CREATE TABLE campaign_battle_reports (
    id                TEXT PRIMARY KEY,
    mission_id        TEXT NOT NULL REFERENCES campaign_missions(id) ON DELETE CASCADE,
    participant_id    TEXT NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    narrative         TEXT,   -- what actually happened, in the GM/players' own words
    credits_awarded   INTEGER NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_campaign_battle_reports_mission ON campaign_battle_reports(mission_id);
CREATE INDEX idx_campaign_battle_reports_participant ON campaign_battle_reports(participant_id);

-- Which outcome(s) actually triggered for a given played mission -- a
-- join table because the sample material shows more than one branch can
-- apply to a single mission (e.g. saving both the bot factory AND the
-- imperial base in the same battle).
CREATE TABLE campaign_battle_report_outcomes (
    battle_report_id   TEXT NOT NULL REFERENCES campaign_battle_reports(id) ON DELETE CASCADE,
    outcome_id         TEXT NOT NULL REFERENCES campaign_mission_outcomes(id) ON DELETE RESTRICT,
    PRIMARY KEY (battle_report_id, outcome_id)
);

-- Per-model casualty log, matching the real play logs' granularity (e.g.
-- "-4 rebel soldiers, -1 engineer, -1 AT-RT" within one battle).
-- roster_entry_id is nullable/SET NULL so a casualty can still be
-- recorded even for a unit that wasn't tracked as a roster entry (e.g. an
-- NPC-side loss the GM just wants noted for the story).
CREATE TABLE campaign_battle_report_casualties (
    id                  TEXT PRIMARY KEY,
    battle_report_id    TEXT NOT NULL REFERENCES campaign_battle_reports(id) ON DELETE CASCADE,
    roster_entry_id     TEXT REFERENCES campaign_roster_entries(id) ON DELETE SET NULL,
    label               TEXT NOT NULL,   -- freeform, e.g. "4 rebel soldiers"
    models_lost         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_battle_report_casualties_report ON campaign_battle_report_casualties(battle_report_id);

-- ============================================================
-- Meters: generic named narrative trackers (Heat, Territory, Reputation...)
-- ============================================================

-- Not hardcoded to "Heat" -- different homebrew campaigns use different
-- named pressure/progress trackers (see Grievous Campaign Paths: Heat,
-- territory captured, alliance strength, Reputation all appear across
-- different arcs). What changes a meter and what it does is freeform
-- rule text the GM defines per campaign, same governing principle as
-- the rest of this schema.
CREATE TABLE campaign_meters (
    id               TEXT PRIMARY KEY,
    participant_id   TEXT NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    current_value    INTEGER NOT NULL DEFAULT 0,
    description      TEXT,
    UNIQUE (participant_id, name)
);

-- ============================================================
-- Hero upgrade catalog (permanent, homebrew, freeform effect text)
-- ============================================================

-- path_id NULL = a "core" upgrade available regardless of chosen path;
-- non-null = only available once that path is chosen. tier is the
-- source material's "N Points" label -- confirmed with the project owner
-- to be a tier/power label only, not a spendable currency (see
-- docs/DECISIONS.md) -- purchase eligibility is gated purely by
-- campaign_participants.upgrade_purchase_available, not by tier cost.
CREATE TABLE campaign_upgrade_options (
    id             TEXT PRIMARY KEY,
    campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    path_id        TEXT REFERENCES campaign_paths(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    tier           INTEGER NOT NULL DEFAULT 1,
    effect         TEXT,
    is_trophy      INTEGER NOT NULL DEFAULT 0 CHECK (is_trophy IN (0, 1)),   -- unique narrative-triggered unlock (e.g. defeating a named rival)
    sort_order     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_upgrade_options_campaign ON campaign_upgrade_options(campaign_id);

CREATE TABLE campaign_participant_upgrades (
    participant_id        TEXT NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    upgrade_option_id     TEXT NOT NULL REFERENCES campaign_upgrade_options(id) ON DELETE RESTRICT,
    acquired_mission_id   TEXT REFERENCES campaign_missions(id) ON DELETE SET NULL,
    PRIMARY KEY (participant_id, upgrade_option_id)
);

-- ============================================================
-- Store: campaign-scoped purchasable units
-- ============================================================

-- unit_id is nullable/RESTRICT: a store item ideally maps to a real
-- units.json entry, but a homebrew campaign may reference a unit this
-- app hasn't catalogued yet -- display_name always carries the name
-- either way.
CREATE TABLE campaign_store_items (
    id                        TEXT PRIMARY KEY,
    campaign_id               TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    unit_id                   TEXT REFERENCES units(id) ON DELETE RESTRICT,
    display_name               TEXT NOT NULL,
    base_cost                  INTEGER NOT NULL CHECK (base_cost >= 0),
    -- Confirmed with the project owner: the item only becomes purchasable
    -- once the participant's CUMULATIVE credits spent (see
    -- campaign_participant_totals below) reaches this value. NULL =
    -- purchasable from the start. Reaching the threshold does not grant
    -- the unit for free -- base_cost is still charged on top.
    unlock_spend_threshold     INTEGER,
    -- Must be granted by a mission outcome rather than ever bought
    -- directly from the store list (e.g. "(Unlock Only) Both Tanks").
    unlock_only                 INTEGER NOT NULL DEFAULT 0 CHECK (unlock_only IN (0, 1)),
    max_count                   INTEGER,   -- nullable = unlimited copies
    sort_order                  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_store_items_campaign ON campaign_store_items(campaign_id);

-- Freeform priced modifiers on a store item -- NOT a fixed 2-slot shape
-- (the sample store list has "specialty unit" / "per upgrade" / "per gun"
-- / "for Kalani/Kraken" modifiers in varying combinations per item), so
-- modeled as an open list rather than rigid columns.
CREATE TABLE campaign_store_item_modifiers (
    id               TEXT PRIMARY KEY,
    store_item_id    TEXT NOT NULL REFERENCES campaign_store_items(id) ON DELETE CASCADE,
    label            TEXT NOT NULL,
    cost             INTEGER NOT NULL,
    sort_order       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_store_item_modifiers_item ON campaign_store_item_modifiers(store_item_id);

-- Purchase log -- also the basis for the unlock-spend-threshold check via
-- the view below.
CREATE TABLE campaign_purchases (
    id                 TEXT PRIMARY KEY,
    participant_id     TEXT NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    store_item_id      TEXT NOT NULL REFERENCES campaign_store_items(id) ON DELETE RESTRICT,
    roster_entry_id    TEXT REFERENCES campaign_roster_entries(id) ON DELETE SET NULL,
    credits_spent      INTEGER NOT NULL CHECK (credits_spent >= 0),
    purchased_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_campaign_purchases_participant ON campaign_purchases(participant_id);

-- Single source of truth for "how much has this participant cumulatively
-- spent" -- domain/ code reads this rather than re-deriving the SUM in
-- Rust, same principle as user_unit_ownership in 0002_collection.sql.
CREATE VIEW campaign_participant_totals AS
SELECT
    participant_id,
    COALESCE(SUM(credits_spent), 0) AS total_credits_spent
FROM campaign_purchases
GROUP BY participant_id;
