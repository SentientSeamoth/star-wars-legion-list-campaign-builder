-- 0002_collection.sql
-- Collection-tracking schema: what a user actually owns, and how the app
-- derives "which units do I have physical miniatures for" from that.
--
-- DESIGN NOTE -- read before touching this file:
-- Ownership is tracked at the PRODUCT level first (expansions table),
-- because that's how people actually buy the game -- nobody buys "one
-- Clone Trooper miniature," they buy a Unit Expansion box. A unit's real
-- owned-quantity is DERIVED by joining what products a user owns against
-- what units those products contain (expansion_contents_units), then
-- adding any manual override. Do NOT track owned unit quantities as a
-- single flat number with no product backing -- that loses the "which box
-- do I need to buy" information the whole feature exists to provide.
--
-- The `unit_ownership_overrides` table exists for the cases the product
-- model can't cover on its own: proxied minis, traded/loose singles,
-- lost/damaged models, or someone who doesn't want to bother logging
-- individual product purchases. Its `delta` is ADDED to the
-- product-derived total, and can be negative (e.g. "I own the box but
-- lost one mini").
--
-- NOT YET EXECUTED AGAINST A REAL APPLICATION -- see docs/TODO.md for the
-- same validation caveat as 0001_init.sql. This file WAS run against real
-- SQLite in this sandbox alongside 0001, including loading real
-- data/expansions.json content -- see docs/TODO.md for what that
-- confirmed.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Expansions / products (mirrors data/expansions.json)
-- ============================================================

CREATE TABLE expansions (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    product_type   TEXT NOT NULL CHECK (product_type IN (
                        'core-set','unit-expansion','commander-expansion','operative-expansion',
                        'battle-force-starter-set','upgrade-card-pack','battle-card-pack','other'
                   )),
    release_date       TEXT,
    roster_verified     INTEGER NOT NULL DEFAULT 0 CHECK (roster_verified IN (0, 1)),
    roster_source        TEXT,
    notes                 TEXT
);

CREATE TABLE expansion_contents_units (
    expansion_id   TEXT NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
    unit_id        TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    PRIMARY KEY (expansion_id, unit_id)
);

CREATE TABLE expansion_contents_upgrades (
    expansion_id   TEXT NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
    upgrade_id     TEXT NOT NULL REFERENCES upgrades(id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    PRIMARY KEY (expansion_id, upgrade_id)
);

CREATE TABLE expansion_contents_command_cards (
    expansion_id      TEXT NOT NULL REFERENCES expansions(id) ON DELETE CASCADE,
    command_card_id   TEXT NOT NULL REFERENCES command_cards(id) ON DELETE RESTRICT,
    quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    PRIMARY KEY (expansion_id, command_card_id)
);

-- ============================================================
-- What a user owns
-- ============================================================

-- Product-level ownership: "I own 2 copies of this box."
CREATE TABLE user_collection (
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expansion_id   TEXT NOT NULL REFERENCES expansions(id) ON DELETE RESTRICT,
    quantity_owned INTEGER NOT NULL DEFAULT 1 CHECK (quantity_owned >= 0),
    acquired_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    notes          TEXT,
    PRIMARY KEY (user_id, expansion_id)
);

-- Manual per-unit adjustment layered on top of the product-derived total.
-- See the file-level design note above for why this exists and how it
-- combines with user_collection.
CREATE TABLE unit_ownership_overrides (
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id   TEXT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    delta     INTEGER NOT NULL,  -- can be negative; see design note above
    reason    TEXT,              -- e.g. "proxy", "lost model", "traded 1 away"
    PRIMARY KEY (user_id, unit_id)
);

-- Convenience view: a user's total owned quantity per unit, combining
-- product-derived ownership with manual overrides. domain/ code should
-- read FROM this view rather than re-deriving the join logic in Rust --
-- keeps the "how do we compute owned quantity" rule in exactly one place,
-- per docs/FILE_STRUCTURE.md's redundancy rule.
CREATE VIEW user_unit_ownership AS
SELECT
    uc.user_id,
    ecu.unit_id,
    SUM(ecu.quantity * uc.quantity_owned) AS from_products,
    COALESCE(MAX(uoo.delta), 0) AS override_delta,
    SUM(ecu.quantity * uc.quantity_owned) + COALESCE(MAX(uoo.delta), 0) AS total_owned
FROM user_collection uc
JOIN expansion_contents_units ecu ON ecu.expansion_id = uc.expansion_id
LEFT JOIN unit_ownership_overrides uoo
    ON uoo.user_id = uc.user_id AND uoo.unit_id = ecu.unit_id
GROUP BY uc.user_id, ecu.unit_id;
