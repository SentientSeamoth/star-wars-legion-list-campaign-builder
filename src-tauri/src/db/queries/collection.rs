//! CRUD for the collection-tracking tables in 0002_collection.sql. See the
//! design note at the top of that file: product-level ownership
//! (user_collection) derives unit quantities via a join, and
//! unit_ownership_overrides layers a manual signed adjustment on top. This
//! module only issues the SQL -- no business logic, per db/_PURPOSE.md.

use crate::types::{UnitOwnershipOverride, UserCollectionEntry, UserUnitOwnership};
use rusqlite::{params, Connection, Row};

fn row_to_collection_entry(row: &Row) -> rusqlite::Result<UserCollectionEntry> {
    Ok(UserCollectionEntry {
        user_id: row.get(0)?,
        expansion_id: row.get(1)?,
        quantity_owned: row.get(2)?,
        acquired_at: row.get(3)?,
        notes: row.get(4)?,
    })
}

fn row_to_override(row: &Row) -> rusqlite::Result<UnitOwnershipOverride> {
    Ok(UnitOwnershipOverride {
        user_id: row.get(0)?,
        unit_id: row.get(1)?,
        delta: row.get(2)?,
        reason: row.get(3)?,
    })
}

fn row_to_ownership(row: &Row) -> rusqlite::Result<UserUnitOwnership> {
    Ok(UserUnitOwnership {
        user_id: row.get(0)?,
        unit_id: row.get(1)?,
        from_products: row.get(2)?,
        override_delta: row.get(3)?,
        total_owned: row.get(4)?,
    })
}

pub fn add_or_update_owned_expansion(
    conn: &Connection,
    user_id: &str,
    expansion_id: &str,
    quantity_owned: u32,
    notes: Option<&str>,
) -> rusqlite::Result<UserCollectionEntry> {
    conn.execute(
        "INSERT INTO user_collection (user_id, expansion_id, quantity_owned, notes)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (user_id, expansion_id)
         DO UPDATE SET quantity_owned = excluded.quantity_owned, notes = excluded.notes",
        params![user_id, expansion_id, quantity_owned, notes],
    )?;
    conn.query_row(
        "SELECT user_id, expansion_id, quantity_owned, acquired_at, notes
         FROM user_collection WHERE user_id = ?1 AND expansion_id = ?2",
        params![user_id, expansion_id],
        row_to_collection_entry,
    )
}

pub fn remove_owned_expansion(
    conn: &Connection,
    user_id: &str,
    expansion_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM user_collection WHERE user_id = ?1 AND expansion_id = ?2",
        params![user_id, expansion_id],
    )?;
    Ok(())
}

pub fn list_owned_expansions(
    conn: &Connection,
    user_id: &str,
) -> rusqlite::Result<Vec<UserCollectionEntry>> {
    let mut stmt = conn.prepare(
        "SELECT user_id, expansion_id, quantity_owned, acquired_at, notes
         FROM user_collection WHERE user_id = ?1 ORDER BY acquired_at",
    )?;
    let rows = stmt.query_map(params![user_id], row_to_collection_entry)?;
    rows.collect()
}

pub fn set_unit_override(
    conn: &Connection,
    user_id: &str,
    unit_id: &str,
    delta: i32,
    reason: Option<&str>,
) -> rusqlite::Result<UnitOwnershipOverride> {
    conn.execute(
        "INSERT INTO unit_ownership_overrides (user_id, unit_id, delta, reason)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (user_id, unit_id)
         DO UPDATE SET delta = excluded.delta, reason = excluded.reason",
        params![user_id, unit_id, delta, reason],
    )?;
    conn.query_row(
        "SELECT user_id, unit_id, delta, reason FROM unit_ownership_overrides
         WHERE user_id = ?1 AND unit_id = ?2",
        params![user_id, unit_id],
        row_to_override,
    )
}

pub fn remove_unit_override(
    conn: &Connection,
    user_id: &str,
    unit_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM unit_ownership_overrides WHERE user_id = ?1 AND unit_id = ?2",
        params![user_id, unit_id],
    )?;
    Ok(())
}

pub fn list_unit_overrides(
    conn: &Connection,
    user_id: &str,
) -> rusqlite::Result<Vec<UnitOwnershipOverride>> {
    let mut stmt = conn.prepare(
        "SELECT user_id, unit_id, delta, reason FROM unit_ownership_overrides WHERE user_id = ?1",
    )?;
    let rows = stmt.query_map(params![user_id], row_to_override)?;
    rows.collect()
}

pub fn get_user_unit_ownership(
    conn: &Connection,
    user_id: &str,
) -> rusqlite::Result<Vec<UserUnitOwnership>> {
    let mut stmt = conn.prepare(
        "SELECT user_id, unit_id, from_products, override_delta, total_owned
         FROM user_unit_ownership WHERE user_id = ?1 ORDER BY unit_id",
    )?;
    let rows = stmt.query_map(params![user_id], row_to_ownership)?;
    rows.collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{migrate, seed};
    use std::collections::HashMap;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrate::run(&conn).unwrap();
        seed::run(&conn).unwrap();
        conn.execute(
            "INSERT INTO users (id, display_name) VALUES ('test-user', 'Test')",
            [],
        )
        .unwrap();
        conn
    }

    /// Replays the manual validation recorded in docs/TODO.md: owning the
    /// 501st Legion Battle Force Starter Set should derive exactly 2 Phase
    /// II Clone Troopers, 3 ARC Troopers, 1 AT-RT, 1 Anakin Skywalker, and a
    /// manual override (a lost model) should adjust the total on top of
    /// that -- as an automated regression test instead of a one-time note.
    #[test]
    fn derives_501st_starter_set_ownership_and_applies_override() {
        let conn = setup();
        add_or_update_owned_expansion(
            &conn,
            "test-user",
            "501st-legion-battle-force-starter-set",
            1,
            None,
        )
        .unwrap();

        let ownership = get_user_unit_ownership(&conn, "test-user").unwrap();
        let by_unit: HashMap<&str, &UserUnitOwnership> =
            ownership.iter().map(|o| (o.unit_id.as_str(), o)).collect();

        assert_eq!(by_unit["phase-ii-clone-troopers"].total_owned, 2);
        assert_eq!(by_unit["arc-troopers"].total_owned, 3);
        assert_eq!(by_unit["at-rt-galactic-republic"].total_owned, 1);
        assert_eq!(by_unit["anakin-skywalker"].total_owned, 1);

        set_unit_override(
            &conn,
            "test-user",
            "phase-ii-clone-troopers",
            -1,
            Some("lost model"),
        )
        .unwrap();

        let ownership = get_user_unit_ownership(&conn, "test-user").unwrap();
        let updated = ownership
            .iter()
            .find(|o| o.unit_id == "phase-ii-clone-troopers")
            .unwrap();
        assert_eq!(updated.from_products, 2);
        assert_eq!(updated.override_delta, -1);
        assert_eq!(updated.total_owned, 1);
    }

    #[test]
    fn remove_owned_expansion_clears_derived_ownership() {
        let conn = setup();
        add_or_update_owned_expansion(
            &conn,
            "test-user",
            "501st-legion-battle-force-starter-set",
            1,
            None,
        )
        .unwrap();
        remove_owned_expansion(&conn, "test-user", "501st-legion-battle-force-starter-set")
            .unwrap();
        let ownership = get_user_unit_ownership(&conn, "test-user").unwrap();
        assert!(ownership.is_empty());
    }
}
