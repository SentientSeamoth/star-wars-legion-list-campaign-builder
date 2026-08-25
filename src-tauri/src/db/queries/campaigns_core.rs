//! CRUD for campaigns, campaign_participants, and campaign_meters
//! (0003_campaigns.sql). No business logic here, per db/_PURPOSE.md --
//! the "one upgrade purchase per mission" rule and credit-balance
//! arithmetic live in domain::campaign_rules and are applied by
//! commands/campaigns_play.rs, not here.

use crate::types::{Campaign, CampaignMeter, CampaignParticipant};
use rusqlite::{params, Connection, Row};
use serde::de::DeserializeOwned;
use serde_json::Value;

/// See db/queries/lists.rs::parse_enum for why this exists.
fn parse_enum<T: DeserializeOwned>(s: &str) -> T {
    serde_json::from_value(Value::String(s.to_string()))
        .expect("DB value should always match its column's CHECK constraint")
}

const CAMPAIGN_COLUMNS: &str = "id, name, summary, mode, status, created_at, updated_at";
const PARTICIPANT_COLUMNS: &str =
    "id, campaign_id, user_id, role, side_name, credits_balance, chosen_path_id, upgrade_purchase_available";
const METER_COLUMNS: &str = "id, participant_id, name, current_value, description";

fn row_to_campaign(row: &Row) -> rusqlite::Result<Campaign> {
    let mode: String = row.get(3)?;
    let status: String = row.get(4)?;
    Ok(Campaign {
        id: row.get(0)?,
        name: row.get(1)?,
        summary: row.get(2)?,
        mode: parse_enum(&mode),
        status: parse_enum(&status),
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn row_to_participant(row: &Row) -> rusqlite::Result<CampaignParticipant> {
    let role: String = row.get(3)?;
    Ok(CampaignParticipant {
        id: row.get(0)?,
        campaign_id: row.get(1)?,
        user_id: row.get(2)?,
        role: parse_enum(&role),
        side_name: row.get(4)?,
        credits_balance: row.get(5)?,
        chosen_path_id: row.get(6)?,
        upgrade_purchase_available: row.get::<_, i64>(7)? != 0,
    })
}

fn row_to_meter(row: &Row) -> rusqlite::Result<CampaignMeter> {
    Ok(CampaignMeter {
        id: row.get(0)?,
        participant_id: row.get(1)?,
        name: row.get(2)?,
        current_value: row.get(3)?,
        description: row.get(4)?,
    })
}

pub fn get_campaign(conn: &Connection, id: &str) -> rusqlite::Result<Campaign> {
    conn.query_row(
        &format!("SELECT {CAMPAIGN_COLUMNS} FROM campaigns WHERE id = ?1"),
        params![id],
        row_to_campaign,
    )
}

pub fn create_campaign(
    conn: &Connection,
    id: &str,
    name: &str,
    summary: Option<&str>,
    mode: &str,
) -> rusqlite::Result<Campaign> {
    conn.execute(
        "INSERT INTO campaigns (id, name, summary, mode) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, summary, mode],
    )?;
    get_campaign(conn, id)
}

pub fn update_campaign_header(
    conn: &Connection,
    id: &str,
    name: &str,
    summary: Option<&str>,
    mode: &str,
    status: &str,
) -> rusqlite::Result<Campaign> {
    conn.execute(
        "UPDATE campaigns
         SET name = ?2, summary = ?3, mode = ?4, status = ?5,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?1",
        params![id, name, summary, mode, status],
    )?;
    get_campaign(conn, id)
}

pub fn delete_campaign(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM campaigns WHERE id = ?1", params![id])?;
    Ok(())
}

/// Campaigns the given user participates in, in any role.
pub fn list_campaigns_for_user(conn: &Connection, user_id: &str) -> rusqlite::Result<Vec<Campaign>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT c.id, c.name, c.summary, c.mode, c.status, c.created_at, c.updated_at
         FROM campaigns c
         JOIN campaign_participants p ON p.campaign_id = c.id
         WHERE p.user_id = ?1
         ORDER BY c.updated_at DESC",
    )?;
    let rows = stmt.query_map(params![user_id], row_to_campaign)?;
    rows.collect()
}

pub fn list_participants_for_campaign(
    conn: &Connection,
    campaign_id: &str,
) -> rusqlite::Result<Vec<CampaignParticipant>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {PARTICIPANT_COLUMNS} FROM campaign_participants WHERE campaign_id = ?1 ORDER BY id"
    ))?;
    let rows = stmt.query_map(params![campaign_id], row_to_participant)?;
    rows.collect()
}

pub fn get_participant(conn: &Connection, id: &str) -> rusqlite::Result<CampaignParticipant> {
    conn.query_row(
        &format!("SELECT {PARTICIPANT_COLUMNS} FROM campaign_participants WHERE id = ?1"),
        params![id],
        row_to_participant,
    )
}

pub fn add_participant(
    conn: &Connection,
    id: &str,
    campaign_id: &str,
    user_id: &str,
    role: &str,
    side_name: Option<&str>,
) -> rusqlite::Result<CampaignParticipant> {
    conn.execute(
        "INSERT INTO campaign_participants (id, campaign_id, user_id, role, side_name)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, campaign_id, user_id, role, side_name],
    )?;
    get_participant(conn, id)
}

pub fn remove_participant(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_participants WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn update_participant_credits(
    conn: &Connection,
    id: &str,
    credits_balance: i32,
) -> rusqlite::Result<CampaignParticipant> {
    conn.execute(
        "UPDATE campaign_participants SET credits_balance = ?2 WHERE id = ?1",
        params![id, credits_balance],
    )?;
    get_participant(conn, id)
}

pub fn set_participant_chosen_path(
    conn: &Connection,
    id: &str,
    path_id: Option<&str>,
) -> rusqlite::Result<CampaignParticipant> {
    conn.execute(
        "UPDATE campaign_participants SET chosen_path_id = ?2 WHERE id = ?1",
        params![id, path_id],
    )?;
    get_participant(conn, id)
}

pub fn set_participant_upgrade_purchase_available(
    conn: &Connection,
    id: &str,
    available: bool,
) -> rusqlite::Result<CampaignParticipant> {
    conn.execute(
        "UPDATE campaign_participants SET upgrade_purchase_available = ?2 WHERE id = ?1",
        params![id, available as i32],
    )?;
    get_participant(conn, id)
}

pub fn upsert_meter(
    conn: &Connection,
    id: &str,
    participant_id: &str,
    name: &str,
    current_value: i32,
    description: Option<&str>,
) -> rusqlite::Result<CampaignMeter> {
    conn.execute(
        "INSERT INTO campaign_meters (id, participant_id, name, current_value, description)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (participant_id, name)
         DO UPDATE SET current_value = excluded.current_value, description = excluded.description",
        params![id, participant_id, name, current_value, description],
    )?;
    conn.query_row(
        &format!("SELECT {METER_COLUMNS} FROM campaign_meters WHERE participant_id = ?1 AND name = ?2"),
        params![participant_id, name],
        row_to_meter,
    )
}

pub fn remove_meter(conn: &Connection, participant_id: &str, name: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_meters WHERE participant_id = ?1 AND name = ?2",
        params![participant_id, name],
    )?;
    Ok(())
}
