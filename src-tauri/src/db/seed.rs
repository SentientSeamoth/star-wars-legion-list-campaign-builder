//! Loads data/*.json into the reference tables created by 0001_init.sql /
//! 0002_collection.sql. Every JSON file is embedded at compile time
//! (include_str!) and every row is written with INSERT OR REPLACE, so
//! re-seeding on every launch is idempotent and picks up a data/ content
//! update automatically on next run -- a direct match for the "frequent,
//! easy rules/points updates" goal in docs/ARCHITECTURE.md. Never touches
//! the app-state tables (users, user_collection, army_lists, ...) -- those
//! are real user data, not shipped content.
//!
//! Parents are seeded before the join tables that reference them, matching
//! the dependency order enforced by the schema's foreign keys.

use crate::types::{
    CommandCardLibrary, ExpansionLibrary, IntOrText, KeywordLibrary, ScenarioLibrary,
    ScenarioObjective, UnitLibrary, UpgradeLibrary,
};
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;

const KEYWORDS_JSON: &str = include_str!("../../../data/keywords.json");
const UNITS_JSON: &str = include_str!("../../../data/units.json");
const UPGRADES_JSON: &str = include_str!("../../../data/upgrades.json");
const COMMAND_CARDS_JSON: &str = include_str!("../../../data/command-cards.json");
const SCENARIOS_JSON: &str = include_str!("../../../data/scenarios.json");
const EXPANSIONS_JSON: &str = include_str!("../../../data/expansions.json");

/// Renders a serde enum (all of which serialize to a plain JSON string
/// given the `rename_all`/`rename` attributes in types/common.rs and
/// friends) as that plain string, for binding into a TEXT column whose
/// CHECK constraint expects the same spelling.
fn enum_str<T: Serialize>(v: &T) -> String {
    match serde_json::to_value(v).expect("enum always serializes") {
        Value::String(s) => s,
        other => other.to_string(),
    }
}

fn int_or_text(v: &IntOrText) -> String {
    match v {
        IntOrText::Int(i) => i.to_string(),
        IntOrText::Text(s) => s.clone(),
    }
}

fn json_opt<T: Serialize>(v: &Option<T>) -> Option<String> {
    v.as_ref()
        .map(|x| serde_json::to_string(x).expect("value always serializes"))
}

/// Raw-slug overrides for keyword strings whose generic transform (see
/// `resolve_keyword_id`) would land on a data/keywords.json id that has
/// since been superseded by a differently-named entry. Currently just
/// `coordinate-x`, which `coordinate-unit-name-type`'s own
/// verification_note documents as superseding/clarifying.
const KEYWORD_ID_OVERRIDES: &[(&str, &str)] = &[("coordinate", "coordinate-unit-name-type")];

/// Raw-text prefix overrides, checked before the generic colon-truncating
/// transform. Needed when two keywords share a prefix up to the first
/// colon but are otherwise unrelated mechanics -- "Hover: Air X" and
/// "Hover: Ground" both reduce to the same "hover" base under the
/// generic algorithm (which discards everything after the first colon),
/// but data/keywords.json's `hover-air-x`/`hover-ground` entries
/// document that they're genuinely different rules text, not one
/// template with a parameter (unlike e.g. `fixed` or `immune-x`, where
/// every colon-suffixed variant does share one template).
const RAW_PREFIX_OVERRIDES: &[(&str, &str)] = &[
    ("Hover: Air", "hover-air-x"),
    ("Hover: Ground", "hover-ground"),
];

/// Derives the data/keywords.json id a raw printed keyword string (e.g.
/// "Precise 1", "Immune: Melee Pierce", "Weak Point 2: Rear") should
/// resolve to, from the id-naming convention visible across every
/// existing entry: kebab-cased base name, with a `-x` suffix for
/// single-parameter keywords and `-x-y` for the handful with two
/// (detonate-x-y, treat-x-y, weak-point-x-y). Returns None if nothing
/// in `known_ids` matches -- callers must not fabricate a fallback.
fn resolve_keyword_id(raw: &str, known_ids: &HashSet<&str>) -> Option<String> {
    for (prefix, id) in RAW_PREFIX_OVERRIDES {
        if raw.starts_with(prefix) && known_ids.contains(id) {
            return Some(id.to_string());
        }
    }

    let base = raw.split(':').next().unwrap_or(raw).trim();
    let base = base.trim_end_matches(|c: char| c.is_ascii_digit()).trim();
    let slug = base
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>();
    let slug = slug
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if slug.is_empty() {
        return None;
    }

    if let Some((_, override_id)) = KEYWORD_ID_OVERRIDES.iter().find(|(k, _)| *k == slug) {
        if known_ids.contains(override_id) {
            return Some(override_id.to_string());
        }
    }
    if known_ids.contains(slug.as_str()) {
        return Some(slug);
    }
    let with_x = format!("{slug}-x");
    if known_ids.contains(with_x.as_str()) {
        return Some(with_x);
    }
    let with_xy = format!("{slug}-x-y");
    if known_ids.contains(with_xy.as_str()) {
        return Some(with_xy);
    }
    None
}

pub fn run(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    seed_keywords(conn)?;
    seed_units(conn)?;
    seed_upgrades(conn)?;
    seed_command_cards(conn)?;
    seed_scenarios(conn)?;
    seed_expansions(conn)?;
    Ok(())
}

fn seed_keywords(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: KeywordLibrary = serde_json::from_str(KEYWORDS_JSON)?;
    for k in &lib.keywords {
        // A real UPSERT, not INSERT OR REPLACE: keywords.id is referenced
        // by unit_keywords.keyword_id and upgrade_keywords_granted.keyword_id
        // with ON DELETE RESTRICT (0001_init.sql). INSERT OR REPLACE is an
        // implicit DELETE-then-INSERT, so on any re-seed after those child
        // rows exist (i.e. every app launch after the first, once
        // seed_units has run at least once), the implicit delete gets
        // rejected by RESTRICT -- "FOREIGN KEY constraint failed" on
        // startup. ON CONFLICT DO UPDATE updates the row in place instead,
        // never triggering a delete, so referencing children are
        // unaffected. See docs/DECISIONS.md for the 2026-08-23 bug report.
        conn.execute(
            "INSERT INTO keywords
             (id, name, type, parameterized, stacks, description, rules_note, verified, verification_note)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               type = excluded.type,
               parameterized = excluded.parameterized,
               stacks = excluded.stacks,
               description = excluded.description,
               rules_note = excluded.rules_note,
               verified = excluded.verified,
               verification_note = excluded.verification_note",
            params![
                k.id,
                k.name,
                enum_str(&k.kind),
                k.parameterized,
                k.stacks,
                k.description,
                k.rules_note,
                k.verified,
                k.verification_note,
            ],
        )?;
    }
    Ok(())
}

fn seed_units(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: UnitLibrary = serde_json::from_str(UNITS_JSON)?;
    let keyword_lib: KeywordLibrary = serde_json::from_str(KEYWORDS_JSON)?;
    let known_keyword_ids: HashSet<&str> =
        keyword_lib.keywords.iter().map(|k| k.id.as_str()).collect();

    for u in &lib.units {
        let resolved_keyword_ids: Vec<String> = u
            .stats
            .keywords
            .iter()
            .flatten()
            .filter_map(|raw| resolve_keyword_id(raw, &known_keyword_ids))
            .collect();
        // Only true when there's real keyword data AND every entry of it
        // resolved -- not vacuously true for units with no keyword data
        // at all (see docs/TODO.md's "27 units still have zero data"),
        // since that would misrepresent unpopulated as verified.
        let keywords_resolved = u
            .stats
            .keywords
            .as_ref()
            .is_some_and(|kws| !kws.is_empty() && kws.len() == resolved_keyword_ids.len());

        // Real UPSERT, not INSERT OR REPLACE -- units.id is referenced with
        // ON DELETE RESTRICT by command_cards.commander_unit_id,
        // army_list_entries.unit_id, expansion_contents_units.unit_id, and
        // unit_ownership_overrides.unit_id. Once a real army list or
        // collection override references a unit (exactly what happens in
        // normal use), INSERT OR REPLACE's implicit delete would be
        // rejected on the next re-seed. See the note on seed_keywords above
        // and docs/DECISIONS.md.
        conn.execute(
            "INSERT INTO units
             (id, name, subtitle, is_unique, unique_verified, affiliation, affiliation_verified, rank,
              unit_types_verified, legality, roster_verified, roster_source, roster_source_note,
              base_count, base_size, points, points_verified, points_source, wound_threshold,
              courage, resilience, speed, defense_die, attack_surge, defense_surge,
              surge_chart_json, weapons_json, weapons_verified, keywords_json,
              keywords_resolved_to_library, upgrade_bar_json, stats_verified, stats_note,
              expansion, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,?33,?34,?35)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               subtitle = excluded.subtitle,
               is_unique = excluded.is_unique,
               unique_verified = excluded.unique_verified,
               affiliation = excluded.affiliation,
               affiliation_verified = excluded.affiliation_verified,
               rank = excluded.rank,
               unit_types_verified = excluded.unit_types_verified,
               legality = excluded.legality,
               roster_verified = excluded.roster_verified,
               roster_source = excluded.roster_source,
               roster_source_note = excluded.roster_source_note,
               base_count = excluded.base_count,
               base_size = excluded.base_size,
               points = excluded.points,
               points_verified = excluded.points_verified,
               points_source = excluded.points_source,
               wound_threshold = excluded.wound_threshold,
               courage = excluded.courage,
               resilience = excluded.resilience,
               speed = excluded.speed,
               defense_die = excluded.defense_die,
               attack_surge = excluded.attack_surge,
               defense_surge = excluded.defense_surge,
               surge_chart_json = excluded.surge_chart_json,
               weapons_json = excluded.weapons_json,
               weapons_verified = excluded.weapons_verified,
               keywords_json = excluded.keywords_json,
               keywords_resolved_to_library = excluded.keywords_resolved_to_library,
               upgrade_bar_json = excluded.upgrade_bar_json,
               stats_verified = excluded.stats_verified,
               stats_note = excluded.stats_note,
               expansion = excluded.expansion,
               notes = excluded.notes",
            params![
                u.id,
                u.name,
                u.subtitle,
                u.unique,
                u.unique_verified,
                u.affiliation,
                u.affiliation_verified,
                enum_str(&u.rank),
                u.unit_types_verified,
                enum_str(&u.legality),
                u.roster_verified,
                u.roster_source,
                u.roster_source_note,
                u.stats.base_count,
                u.stats.base_size,
                u.stats.points,
                u.stats.points_verified,
                u.stats.points_source,
                u.stats.wound_threshold,
                u.stats.courage.as_ref().map(int_or_text),
                u.stats.resilience,
                u.stats.speed,
                u.stats.defense_die.as_ref().map(enum_str),
                u.stats.attack_surge,
                u.stats.defense_surge,
                json_opt(&u.stats.surge_chart),
                json_opt(&u.stats.weapons),
                u.stats.weapons_verified,
                json_opt(&u.stats.keywords),
                keywords_resolved,
                json_opt(&u.stats.upgrade_bar),
                u.stats_verified,
                u.stats_note,
                u.expansion,
                u.notes,
            ],
        )?;

        conn.execute(
            "DELETE FROM unit_factions WHERE unit_id = ?1",
            params![u.id],
        )?;
        for f in &u.factions {
            conn.execute(
                "INSERT OR REPLACE INTO unit_factions (unit_id, faction) VALUES (?1, ?2)",
                params![u.id, enum_str(f)],
            )?;
        }

        conn.execute(
            "DELETE FROM unit_type_tags WHERE unit_id = ?1",
            params![u.id],
        )?;
        for t in &u.unit_types {
            conn.execute(
                "INSERT OR REPLACE INTO unit_type_tags (unit_id, unit_type) VALUES (?1, ?2)",
                params![u.id, enum_str(t)],
            )?;
        }

        conn.execute(
            "DELETE FROM unit_keywords WHERE unit_id = ?1",
            params![u.id],
        )?;
        for kw_id in &resolved_keyword_ids {
            conn.execute(
                "INSERT OR REPLACE INTO unit_keywords (unit_id, keyword_id) VALUES (?1, ?2)",
                params![u.id, kw_id],
            )?;
        }
    }
    Ok(())
}

fn seed_upgrades(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: UpgradeLibrary = serde_json::from_str(UPGRADES_JSON)?;
    for u in &lib.upgrades {
        // Real UPSERT -- upgrades.id is referenced (ON DELETE RESTRICT) by
        // expansion_contents_upgrades.upgrade_id. See the note on
        // seed_keywords above.
        conn.execute(
            "INSERT INTO upgrades
             (id, name, category, unique_card, restriction, restricted_to_json, points,
              points_verified, effect_description, effect_verified, weapon_profile_json,
              source, roster_verified, roster_source, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               unique_card = excluded.unique_card,
               restriction = excluded.restriction,
               restricted_to_json = excluded.restricted_to_json,
               points = excluded.points,
               points_verified = excluded.points_verified,
               effect_description = excluded.effect_description,
               effect_verified = excluded.effect_verified,
               weapon_profile_json = excluded.weapon_profile_json,
               source = excluded.source,
               roster_verified = excluded.roster_verified,
               roster_source = excluded.roster_source,
               notes = excluded.notes",
            params![
                u.id,
                u.name,
                enum_str(&u.category),
                u.unique_card,
                enum_str(&u.restriction),
                json_opt(&u.restricted_to),
                u.points,
                u.points_verified,
                u.effect_description,
                u.effect_verified,
                json_opt(&u.weapon_profile),
                u.source,
                u.roster_verified,
                u.roster_source,
                u.notes,
            ],
        )?;

        conn.execute(
            "DELETE FROM upgrade_keywords_granted WHERE upgrade_id = ?1",
            params![u.id],
        )?;
        if let Some(keywords) = &u.keywords_granted {
            for kw_id in keywords {
                conn.execute(
                    "INSERT OR REPLACE INTO upgrade_keywords_granted (upgrade_id, keyword_id) VALUES (?1, ?2)",
                    params![u.id, kw_id],
                )?;
            }
        }
    }
    Ok(())
}

fn seed_command_cards(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: CommandCardLibrary = serde_json::from_str(COMMAND_CARDS_JSON)?;
    for c in &lib.command_cards {
        // Real UPSERT -- command_cards.id is referenced (ON DELETE RESTRICT)
        // by expansion_contents_command_cards.command_card_id and
        // army_list_command_cards.command_card_id. See the note on
        // seed_keywords above.
        conn.execute(
            "INSERT INTO command_cards
             (id, name, category, commander_unit_id, pips, units_activated,
              unit_activation_restriction, faction_restriction, battle_force_restriction,
              effect_description, effect_verified, roster_verified, roster_source, source, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               commander_unit_id = excluded.commander_unit_id,
               pips = excluded.pips,
               units_activated = excluded.units_activated,
               unit_activation_restriction = excluded.unit_activation_restriction,
               faction_restriction = excluded.faction_restriction,
               battle_force_restriction = excluded.battle_force_restriction,
               effect_description = excluded.effect_description,
               effect_verified = excluded.effect_verified,
               roster_verified = excluded.roster_verified,
               roster_source = excluded.roster_source,
               source = excluded.source,
               notes = excluded.notes",
            params![
                c.id,
                c.name,
                enum_str(&c.category),
                c.commander_unit_id,
                c.pips,
                int_or_text(&c.units_activated),
                c.unit_activation_restriction,
                c.faction_restriction.as_ref().map(enum_str),
                c.battle_force_restriction,
                c.effect_description,
                c.effect_verified,
                c.roster_verified,
                c.roster_source,
                c.source,
                c.notes,
            ],
        )?;
    }
    Ok(())
}

fn seed_scenarios(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: ScenarioLibrary = serde_json::from_str(SCENARIOS_JSON)?;
    let all: Vec<&ScenarioObjective> = lib
        .primary_objectives
        .iter()
        .chain(lib.secondary_objectives.iter())
        .chain(lib.advantage_cards.iter())
        .chain(lib.recon_format_cards.iter())
        .chain(lib.official_narrative_scenarios.iter())
        .collect();

    for s in all {
        // Real UPSERT -- scenario_objectives.id is referenced (ON DELETE
        // RESTRICT) by army_list_battle_deck.scenario_objective_id. See the
        // note on seed_keywords above.
        conn.execute(
            "INSERT INTO scenario_objectives
             (id, name, category, game_format, game_format_verified, roster_verified,
              roster_source, map_card, deployment_note, points_of_interest_json,
              points_of_interest_verified, victory_condition, victory_condition_verified, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               game_format = excluded.game_format,
               game_format_verified = excluded.game_format_verified,
               roster_verified = excluded.roster_verified,
               roster_source = excluded.roster_source,
               map_card = excluded.map_card,
               deployment_note = excluded.deployment_note,
               points_of_interest_json = excluded.points_of_interest_json,
               points_of_interest_verified = excluded.points_of_interest_verified,
               victory_condition = excluded.victory_condition,
               victory_condition_verified = excluded.victory_condition_verified,
               notes = excluded.notes",
            params![
                s.id,
                s.name,
                enum_str(&s.category),
                enum_str(&s.game_format),
                s.game_format_verified,
                s.roster_verified,
                s.roster_source,
                s.map_card,
                s.deployment_note,
                json_opt(&s.points_of_interest),
                s.points_of_interest_verified,
                s.victory_condition,
                s.victory_condition_verified,
                s.notes,
            ],
        )?;
    }
    Ok(())
}

fn seed_expansions(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let lib: ExpansionLibrary = serde_json::from_str(EXPANSIONS_JSON)?;
    for e in &lib.expansions {
        // Real UPSERT -- expansions.id is referenced (ON DELETE RESTRICT)
        // by user_collection.expansion_id (0002_collection.sql). See the
        // note on seed_keywords above.
        conn.execute(
            "INSERT INTO expansions
             (id, name, product_type, release_date, roster_verified, roster_source, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               product_type = excluded.product_type,
               release_date = excluded.release_date,
               roster_verified = excluded.roster_verified,
               roster_source = excluded.roster_source,
               notes = excluded.notes",
            params![
                e.id,
                e.name,
                enum_str(&e.product_type),
                e.release_date,
                e.roster_verified,
                e.roster_source,
                e.notes,
            ],
        )?;

        conn.execute(
            "DELETE FROM expansion_contents_units WHERE expansion_id = ?1",
            params![e.id],
        )?;
        for entry in &e.contains_units {
            conn.execute(
                "INSERT OR REPLACE INTO expansion_contents_units (expansion_id, unit_id, quantity)
                 VALUES (?1, ?2, ?3)",
                params![e.id, entry.unit_id, entry.quantity],
            )?;
        }

        conn.execute(
            "DELETE FROM expansion_contents_upgrades WHERE expansion_id = ?1",
            params![e.id],
        )?;
        for upgrade_id in &e.contains_upgrades {
            conn.execute(
                "INSERT OR REPLACE INTO expansion_contents_upgrades (expansion_id, upgrade_id, quantity)
                 VALUES (?1, ?2, 1)",
                params![e.id, upgrade_id],
            )?;
        }

        conn.execute(
            "DELETE FROM expansion_contents_command_cards WHERE expansion_id = ?1",
            params![e.id],
        )?;
        for card_id in &e.contains_command_cards {
            conn.execute(
                "INSERT OR REPLACE INTO expansion_contents_command_cards (expansion_id, command_card_id, quantity)
                 VALUES (?1, ?2, 1)",
                params![e.id, card_id],
            )?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;
    use std::collections::BTreeSet;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrate::run(&conn).unwrap();
        run(&conn).unwrap();
        conn
    }

    #[test]
    fn resolve_keyword_id_handles_the_real_id_naming_conventions() {
        let ids: HashSet<&str> = [
            "full-pivot",
            "precise-x",
            "immune-x",
            "ai",
            "fixed",
            "cover-x",
            "armor-x",
            "reposition",
            "weak-point-x-y",
            "detonate-x-y",
            "coordinate-x",
            "coordinate-unit-name-type",
        ]
        .into_iter()
        .collect();

        assert_eq!(resolve_keyword_id("Full Pivot", &ids).as_deref(), Some("full-pivot"));
        assert_eq!(resolve_keyword_id("Precise 1", &ids).as_deref(), Some("precise-x"));
        assert_eq!(
            resolve_keyword_id("Immune: Melee Pierce", &ids).as_deref(),
            Some("immune-x")
        );
        assert_eq!(resolve_keyword_id("AI: Attack", &ids).as_deref(), Some("ai"));
        assert_eq!(resolve_keyword_id("Fixed: Front", &ids).as_deref(), Some("fixed"));
        assert_eq!(resolve_keyword_id("Cover 1", &ids).as_deref(), Some("cover-x"));
        assert_eq!(resolve_keyword_id("Armor 5", &ids).as_deref(), Some("armor-x"));
        assert_eq!(
            resolve_keyword_id("Weak Point 2: Rear", &ids).as_deref(),
            Some("weak-point-x-y")
        );
        assert_eq!(
            resolve_keyword_id("Detonate 2: Ion", &ids).as_deref(),
            Some("detonate-x-y")
        );
        // Overridden to the superseding entry, not the deprecated coordinate-x.
        assert_eq!(
            resolve_keyword_id("Coordinate: Droid Trooper", &ids).as_deref(),
            Some("coordinate-unit-name-type")
        );
        assert_eq!(resolve_keyword_id("Prepared Position", &ids), None);
    }

    /// Not a pass/fail assertion -- a diagnostic that seeds an in-memory DB
    /// from the real embedded data/units.json + data/keywords.json and
    /// prints the ground-truth deduplicated set of raw keyword base
    /// strings that don't resolve, plus overall resolution counts. Run
    /// with `cargo test unresolved_keywords -- --nocapture` to get the
    /// authoritative worklist for the docs/TODO.md keyword-research pass,
    /// instead of the approximate per-batch tallies recorded there.
    #[test]
    fn unresolved_keywords() {
        let conn = setup();

        let mut stmt = conn
            .prepare("SELECT keywords_json FROM units WHERE keywords_json IS NOT NULL")
            .unwrap();
        let raw_lists: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .map(|r| r.unwrap())
            .collect();

        let keyword_lib: KeywordLibrary = serde_json::from_str(KEYWORDS_JSON).unwrap();
        let known_ids: HashSet<&str> =
            keyword_lib.keywords.iter().map(|k| k.id.as_str()).collect();

        let mut total = 0usize;
        let mut resolved = 0usize;
        let mut unresolved: BTreeSet<String> = BTreeSet::new();
        for raw_json in &raw_lists {
            let raw_keywords: Vec<String> = serde_json::from_str(raw_json).unwrap();
            for raw in raw_keywords {
                total += 1;
                match resolve_keyword_id(&raw, &known_ids) {
                    Some(_) => resolved += 1,
                    None => {
                        unresolved.insert(raw);
                    }
                }
            }
        }

        println!(
            "\n{resolved} of {total} raw keyword occurrences resolved; {} unique unresolved base strings:",
            unresolved.len()
        );
        for u in &unresolved {
            println!("  {u}");
        }

        let unit_keywords_rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM unit_keywords", [], |r| r.get(0))
            .unwrap();
        println!("unit_keywords rows populated: {unit_keywords_rows}");
    }

    /// Regression test for a real bug hit on a second real app launch
    /// (2026-08-23, see docs/DECISIONS.md): `seed_expansions` populates
    /// `expansion_contents_units` (ON DELETE RESTRICT on `unit_id`) during
    /// the FIRST seed pass already, with zero user interaction required.
    /// `INSERT OR REPLACE INTO units` is an implicit DELETE-then-INSERT, so
    /// the second seed pass's delete was rejected by that RESTRICT
    /// constraint -- "FOREIGN KEY constraint failed" on every app's second
    /// launch, unconditionally. Every seed function writing to a
    /// RESTRICT-referenced table (keywords, units, upgrades, command_cards,
    /// scenario_objectives, expansions) was switched from INSERT OR REPLACE
    /// to a real `ON CONFLICT DO UPDATE` upsert to fix this. `setup()`
    /// already seeds once; this calls `run` a second time against the same
    /// connection to simulate a second launch.
    #[test]
    fn reseeding_twice_does_not_violate_foreign_keys() {
        let conn = setup();
        run(&conn).expect("second seed pass must not violate any foreign key");
    }
}
