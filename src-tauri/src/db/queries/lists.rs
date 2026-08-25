//! CRUD for army_lists/army_list_entries (0001_init.sql). No business
//! logic here, per db/_PURPOSE.md -- validation (mode/faction values,
//! count >= 1, FK integrity) is entirely the schema's CHECK/FK
//! constraints, same as every other query module in this app.
//!
//! Command cards and the battle deck are NOT covered here -- see the note
//! at the top of types/army_list.rs.

use crate::types::{ArmyList, ArmyListEntry, ArmyListWithEntries};
use rusqlite::{params, Connection, Row};
use serde::de::DeserializeOwned;
use serde_json::Value;

/// Converts a TEXT column's value back into a typed enum. rusqlite's
/// FromSql doesn't derive from serde automatically, so a raw column read
/// always comes back as a plain String first; this bridges it to the
/// enum types in types/common.rs. `.expect` is safe here (not a
/// user-reachable panic) because the value can never be anything other
/// than what the app itself wrote through the same CHECK-constrained
/// column -- a failure here means real DB corruption, not bad input.
fn parse_enum<T: DeserializeOwned>(s: &str) -> T {
    serde_json::from_value(Value::String(s.to_string()))
        .expect("DB value should always match its column's CHECK constraint")
}

fn row_to_list(row: &Row) -> rusqlite::Result<ArmyList> {
    let mode: String = row.get(3)?;
    let faction: Option<String> = row.get(4)?;
    Ok(ArmyList {
        id: row.get(0)?,
        user_id: row.get(1)?,
        name: row.get(2)?,
        mode: parse_enum(&mode),
        faction: faction.as_deref().map(parse_enum),
        points_total: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_entry(row: &Row) -> rusqlite::Result<ArmyListEntry> {
    let upgrades_json: Option<String> = row.get(4)?;
    let upgrades = upgrades_json
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    Ok(ArmyListEntry {
        id: row.get(0)?,
        list_id: row.get(1)?,
        unit_id: row.get(2)?,
        count: row.get(3)?,
        upgrades,
    })
}

const LIST_COLUMNS: &str =
    "id, user_id, name, mode, faction, points_total, created_at, updated_at";
const ENTRY_COLUMNS: &str = "id, list_id, unit_id, count, upgrades_json";

fn get_list(conn: &Connection, id: &str) -> rusqlite::Result<ArmyList> {
    conn.query_row(
        &format!("SELECT {LIST_COLUMNS} FROM army_lists WHERE id = ?1"),
        params![id],
        row_to_list,
    )
}

pub fn create_list(
    conn: &Connection,
    id: &str,
    user_id: &str,
    name: &str,
    mode: &str,
    faction: Option<&str>,
) -> rusqlite::Result<ArmyList> {
    conn.execute(
        "INSERT INTO army_lists (id, user_id, name, mode, faction) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, user_id, name, mode, faction],
    )?;
    get_list(conn, id)
}

pub fn update_list_header(
    conn: &Connection,
    id: &str,
    name: &str,
    mode: &str,
    faction: Option<&str>,
) -> rusqlite::Result<ArmyList> {
    conn.execute(
        "UPDATE army_lists
         SET name = ?2, mode = ?3, faction = ?4,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
        params![id, name, mode, faction],
    )?;
    get_list(conn, id)
}

pub fn delete_list(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM army_lists WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn list_lists_for_user(conn: &Connection, user_id: &str) -> rusqlite::Result<Vec<ArmyList>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {LIST_COLUMNS} FROM army_lists WHERE user_id = ?1 ORDER BY updated_at DESC"
    ))?;
    let rows = stmt.query_map(params![user_id], row_to_list)?;
    rows.collect()
}

pub fn get_list_with_entries(
    conn: &Connection,
    id: &str,
) -> rusqlite::Result<ArmyListWithEntries> {
    let list = get_list(conn, id)?;
    let mut stmt = conn.prepare(&format!(
        "SELECT {ENTRY_COLUMNS} FROM army_list_entries WHERE list_id = ?1 ORDER BY id"
    ))?;
    let entries = stmt
        .query_map(params![id], row_to_entry)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut cc_stmt = conn.prepare(
        "SELECT command_card_id FROM army_list_command_cards WHERE list_id = ?1 ORDER BY command_card_id",
    )?;
    let command_cards = cc_stmt
        .query_map(params![id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut bd_stmt = conn.prepare(
        "SELECT scenario_objective_id FROM army_list_battle_deck WHERE list_id = ?1 ORDER BY scenario_objective_id",
    )?;
    let battle_deck = bd_stmt
        .query_map(params![id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(ArmyListWithEntries {
        list,
        entries,
        command_cards,
        battle_deck,
    })
}

pub fn add_command_card(
    conn: &Connection,
    list_id: &str,
    command_card_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO army_list_command_cards (list_id, command_card_id) VALUES (?1, ?2)",
        params![list_id, command_card_id],
    )?;
    Ok(())
}

pub fn remove_command_card(
    conn: &Connection,
    list_id: &str,
    command_card_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM army_list_command_cards WHERE list_id = ?1 AND command_card_id = ?2",
        params![list_id, command_card_id],
    )?;
    Ok(())
}

pub fn add_battle_deck_card(
    conn: &Connection,
    list_id: &str,
    scenario_objective_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO army_list_battle_deck (list_id, scenario_objective_id) VALUES (?1, ?2)",
        params![list_id, scenario_objective_id],
    )?;
    Ok(())
}

pub fn remove_battle_deck_card(
    conn: &Connection,
    list_id: &str,
    scenario_objective_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM army_list_battle_deck WHERE list_id = ?1 AND scenario_objective_id = ?2",
        params![list_id, scenario_objective_id],
    )?;
    Ok(())
}

/// Always inserts a new row (count = 1) rather than merging into an
/// existing entry for the same unit -- matches how the UI shows one row
/// per "Add Unit" click, not a shared quantity counter. See
/// docs/DECISIONS.md for why.
pub fn add_entry(
    conn: &Connection,
    list_id: &str,
    unit_id: &str,
) -> rusqlite::Result<ArmyListEntry> {
    conn.execute(
        "INSERT INTO army_list_entries (list_id, unit_id, count, upgrades_json)
         VALUES (?1, ?2, 1, '[]')",
        params![list_id, unit_id],
    )?;
    let entry_id = conn.last_insert_rowid();
    conn.query_row(
        &format!("SELECT {ENTRY_COLUMNS} FROM army_list_entries WHERE id = ?1"),
        params![entry_id],
        row_to_entry,
    )
}

pub fn update_entry_count(
    conn: &Connection,
    entry_id: i64,
    count: i32,
) -> rusqlite::Result<ArmyListEntry> {
    conn.execute(
        "UPDATE army_list_entries SET count = ?2 WHERE id = ?1",
        params![entry_id, count],
    )?;
    conn.query_row(
        &format!("SELECT {ENTRY_COLUMNS} FROM army_list_entries WHERE id = ?1"),
        params![entry_id],
        row_to_entry,
    )
}

pub fn update_entry_upgrades(
    conn: &Connection,
    entry_id: i64,
    upgrade_ids: &[String],
) -> rusqlite::Result<ArmyListEntry> {
    let upgrades_json =
        serde_json::to_string(upgrade_ids).expect("Vec<String> always serializes");
    conn.execute(
        "UPDATE army_list_entries SET upgrades_json = ?2 WHERE id = ?1",
        params![entry_id, upgrades_json],
    )?;
    conn.query_row(
        &format!("SELECT {ENTRY_COLUMNS} FROM army_list_entries WHERE id = ?1"),
        params![entry_id],
        row_to_entry,
    )
}

pub fn remove_entry(conn: &Connection, entry_id: i64) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM army_list_entries WHERE id = ?1",
        params![entry_id],
    )?;
    Ok(())
}
