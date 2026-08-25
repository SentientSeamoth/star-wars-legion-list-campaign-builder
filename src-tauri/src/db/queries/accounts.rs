//! Local user profiles (see docs/ARCHITECTURE.md -- accounts are local
//! profiles, not cloud logins). Minimal on purpose: this exists because
//! every row in the collection tables is scoped to a user_id, not because
//! the accounts feature itself is being built out here.

use crate::types::User;
use rusqlite::{params, Connection};

pub fn create_user(conn: &Connection, id: &str, display_name: &str) -> rusqlite::Result<User> {
    conn.execute(
        "INSERT INTO users (id, display_name) VALUES (?1, ?2)",
        params![id, display_name],
    )?;
    get_user(conn, id)
}

pub fn get_user(conn: &Connection, id: &str) -> rusqlite::Result<User> {
    conn.query_row(
        "SELECT id, display_name, created_at FROM users WHERE id = ?1",
        params![id],
        |row| {
            Ok(User {
                id: row.get(0)?,
                display_name: row.get(1)?,
                created_at: row.get(2)?,
            })
        },
    )
}

pub fn list_users(conn: &Connection) -> rusqlite::Result<Vec<User>> {
    let mut stmt =
        conn.prepare("SELECT id, display_name, created_at FROM users ORDER BY created_at")?;
    let rows = stmt.query_map([], |row| {
        Ok(User {
            id: row.get(0)?,
            display_name: row.get(1)?,
            created_at: row.get(2)?,
        })
    })?;
    rows.collect()
}
