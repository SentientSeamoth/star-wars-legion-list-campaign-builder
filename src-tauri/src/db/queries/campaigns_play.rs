//! CRUD for the "played" side of Campaign Mode (0003_campaigns.sql):
//! permadeath roster entries, store purchases, and battle reports (with
//! their outcome links and casualty log). This is where campaign *play*
//! happens, as opposed to campaigns_content.rs's GM-authored template
//! data. No business logic here, per db/_PURPOSE.md -- purchase gating
//! and casualty->retirement resolution live in domain::campaign_rules and
//! are applied by commands/campaigns_play.rs, which sequences these
//! functions (some inside a transaction).

use crate::types::{CampaignBattleReport, CampaignBattleReportCasualty, CampaignPurchase, CampaignRosterEntry};
use rusqlite::{params, Connection, Row};

const ROSTER_COLUMNS: &str =
    "id, participant_id, unit_id, nickname, models_total, models_lost, is_specialty, upgrades_json, acquired_mission_id, retired";

fn row_to_roster_entry(row: &Row) -> rusqlite::Result<CampaignRosterEntry> {
    let upgrades_json: Option<String> = row.get(7)?;
    let upgrades = upgrades_json
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    Ok(CampaignRosterEntry {
        id: row.get(0)?,
        participant_id: row.get(1)?,
        unit_id: row.get(2)?,
        nickname: row.get(3)?,
        models_total: row.get(4)?,
        models_lost: row.get(5)?,
        is_specialty: row.get::<_, i64>(6)? != 0,
        upgrades,
        acquired_mission_id: row.get(8)?,
        retired: row.get::<_, i64>(9)? != 0,
    })
}

pub fn get_roster_entry(conn: &Connection, id: &str) -> rusqlite::Result<CampaignRosterEntry> {
    conn.query_row(
        &format!("SELECT {ROSTER_COLUMNS} FROM campaign_roster_entries WHERE id = ?1"),
        params![id],
        row_to_roster_entry,
    )
}

pub fn list_roster_entries_for_participant(
    conn: &Connection,
    participant_id: &str,
) -> rusqlite::Result<Vec<CampaignRosterEntry>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {ROSTER_COLUMNS} FROM campaign_roster_entries WHERE participant_id = ?1 ORDER BY id"
    ))?;
    let rows = stmt.query_map(params![participant_id], row_to_roster_entry)?;
    rows.collect()
}

#[allow(clippy::too_many_arguments)]
pub fn add_roster_entry(
    conn: &Connection,
    id: &str,
    participant_id: &str,
    unit_id: Option<&str>,
    nickname: Option<&str>,
    models_total: i32,
    is_specialty: bool,
    acquired_mission_id: Option<&str>,
) -> rusqlite::Result<CampaignRosterEntry> {
    conn.execute(
        "INSERT INTO campaign_roster_entries
            (id, participant_id, unit_id, nickname, models_total, is_specialty, upgrades_json, acquired_mission_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, '[]', ?7)",
        params![id, participant_id, unit_id, nickname, models_total, is_specialty as i32, acquired_mission_id],
    )?;
    get_roster_entry(conn, id)
}

pub fn update_roster_entry_upgrades(
    conn: &Connection,
    id: &str,
    upgrade_ids: &[String],
) -> rusqlite::Result<CampaignRosterEntry> {
    let upgrades_json =
        serde_json::to_string(upgrade_ids).expect("Vec<String> always serializes");
    conn.execute(
        "UPDATE campaign_roster_entries SET upgrades_json = ?2 WHERE id = ?1",
        params![id, upgrades_json],
    )?;
    get_roster_entry(conn, id)
}

/// Sets models_lost and retired together -- the command layer computes
/// both via domain::campaign_rules::resolve_roster_status before calling
/// this, so this function stays pure persistence.
pub fn update_roster_entry_casualty(
    conn: &Connection,
    id: &str,
    models_lost: i32,
    retired: bool,
) -> rusqlite::Result<CampaignRosterEntry> {
    conn.execute(
        "UPDATE campaign_roster_entries SET models_lost = ?2, retired = ?3 WHERE id = ?1",
        params![id, models_lost, retired as i32],
    )?;
    get_roster_entry(conn, id)
}

pub fn set_roster_entry_retired(
    conn: &Connection,
    id: &str,
    retired: bool,
) -> rusqlite::Result<CampaignRosterEntry> {
    conn.execute(
        "UPDATE campaign_roster_entries SET retired = ?2 WHERE id = ?1",
        params![id, retired as i32],
    )?;
    get_roster_entry(conn, id)
}

pub fn remove_roster_entry(conn: &Connection, id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM campaign_roster_entries WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

// ---------------- Store purchases ----------------

/// Cumulative credits this participant has ever spent, per the
/// campaign_participant_totals view -- COALESCE-wrapped so a participant
/// with zero purchases (no row in the view) reads as 0 rather than
/// erroring on an empty result set.
pub fn get_participant_total_spent(conn: &Connection, participant_id: &str) -> rusqlite::Result<i32> {
    conn.query_row(
        "SELECT COALESCE(
            (SELECT total_credits_spent FROM campaign_participant_totals WHERE participant_id = ?1), 0
         )",
        params![participant_id],
        |row| row.get(0),
    )
}

pub fn count_purchases_of_item(
    conn: &Connection,
    participant_id: &str,
    store_item_id: &str,
) -> rusqlite::Result<i32> {
    conn.query_row(
        "SELECT COUNT(*) FROM campaign_purchases WHERE participant_id = ?1 AND store_item_id = ?2",
        params![participant_id, store_item_id],
        |row| row.get(0),
    )
}

const PURCHASE_COLUMNS: &str = "id, participant_id, store_item_id, roster_entry_id, credits_spent, purchased_at";

fn row_to_purchase(row: &Row) -> rusqlite::Result<CampaignPurchase> {
    Ok(CampaignPurchase {
        id: row.get(0)?,
        participant_id: row.get(1)?,
        store_item_id: row.get(2)?,
        roster_entry_id: row.get(3)?,
        credits_spent: row.get(4)?,
        purchased_at: row.get(5)?,
    })
}

pub fn insert_purchase(
    conn: &Connection,
    id: &str,
    participant_id: &str,
    store_item_id: &str,
    roster_entry_id: Option<&str>,
    credits_spent: i32,
) -> rusqlite::Result<CampaignPurchase> {
    conn.execute(
        "INSERT INTO campaign_purchases (id, participant_id, store_item_id, roster_entry_id, credits_spent)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, participant_id, store_item_id, roster_entry_id, credits_spent],
    )?;
    conn.query_row(
        &format!("SELECT {PURCHASE_COLUMNS} FROM campaign_purchases WHERE id = ?1"),
        params![id],
        row_to_purchase,
    )
}

pub fn insert_participant_upgrade(
    conn: &Connection,
    participant_id: &str,
    upgrade_option_id: &str,
    acquired_mission_id: Option<&str>,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO campaign_participant_upgrades (participant_id, upgrade_option_id, acquired_mission_id)
         VALUES (?1, ?2, ?3)",
        params![participant_id, upgrade_option_id, acquired_mission_id],
    )?;
    Ok(())
}

// ---------------- Battle reports ----------------

const BATTLE_REPORT_COLUMNS: &str = "id, mission_id, participant_id, narrative, credits_awarded, notes, created_at";
const CASUALTY_COLUMNS: &str = "id, battle_report_id, roster_entry_id, label, models_lost";

fn row_to_casualty(row: &Row) -> rusqlite::Result<CampaignBattleReportCasualty> {
    Ok(CampaignBattleReportCasualty {
        id: row.get(0)?,
        battle_report_id: row.get(1)?,
        roster_entry_id: row.get(2)?,
        label: row.get(3)?,
        models_lost: row.get(4)?,
    })
}

pub fn list_outcome_ids_for_report(conn: &Connection, battle_report_id: &str) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT outcome_id FROM campaign_battle_report_outcomes WHERE battle_report_id = ?1 ORDER BY outcome_id",
    )?;
    let rows = stmt.query_map(params![battle_report_id], |row| row.get::<_, String>(0))?;
    rows.collect()
}

pub fn list_casualties_for_report(
    conn: &Connection,
    battle_report_id: &str,
) -> rusqlite::Result<Vec<CampaignBattleReportCasualty>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {CASUALTY_COLUMNS} FROM campaign_battle_report_casualties WHERE battle_report_id = ?1 ORDER BY id"
    ))?;
    let rows = stmt.query_map(params![battle_report_id], row_to_casualty)?;
    rows.collect()
}

pub fn get_battle_report(conn: &Connection, id: &str) -> rusqlite::Result<CampaignBattleReport> {
    let (mission_id, participant_id, narrative, credits_awarded, notes, created_at): (
        String,
        String,
        Option<String>,
        i32,
        Option<String>,
        String,
    ) = conn.query_row(
        &format!("SELECT {BATTLE_REPORT_COLUMNS} FROM campaign_battle_reports WHERE id = ?1"),
        params![id],
        |row| Ok((row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?)),
    )?;
    Ok(CampaignBattleReport {
        id: id.to_string(),
        mission_id,
        participant_id,
        narrative,
        credits_awarded,
        notes,
        created_at,
        outcome_ids: list_outcome_ids_for_report(conn, id)?,
        casualties: list_casualties_for_report(conn, id)?,
    })
}

pub fn list_battle_reports_for_mission(
    conn: &Connection,
    mission_id: &str,
) -> rusqlite::Result<Vec<CampaignBattleReport>> {
    let mut stmt = conn.prepare("SELECT id FROM campaign_battle_reports WHERE mission_id = ?1 ORDER BY created_at")?;
    let ids = stmt
        .query_map(params![mission_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    ids.iter().map(|id| get_battle_report(conn, id)).collect()
}

pub fn insert_battle_report(
    conn: &Connection,
    id: &str,
    mission_id: &str,
    participant_id: &str,
    narrative: Option<&str>,
    credits_awarded: i32,
    notes: Option<&str>,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO campaign_battle_reports (id, mission_id, participant_id, narrative, credits_awarded, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, mission_id, participant_id, narrative, credits_awarded, notes],
    )?;
    Ok(())
}

pub fn link_battle_report_outcome(
    conn: &Connection,
    battle_report_id: &str,
    outcome_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO campaign_battle_report_outcomes (battle_report_id, outcome_id) VALUES (?1, ?2)",
        params![battle_report_id, outcome_id],
    )?;
    Ok(())
}

pub fn add_battle_report_casualty(
    conn: &Connection,
    id: &str,
    battle_report_id: &str,
    roster_entry_id: Option<&str>,
    label: &str,
    models_lost: i32,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO campaign_battle_report_casualties (id, battle_report_id, roster_entry_id, label, models_lost)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, battle_report_id, roster_entry_id, label, models_lost],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::queries::{campaigns_content, campaigns_core};
    use crate::db::{migrate, seed};
    use crate::domain::campaign_rules;

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

    /// End-to-end regression covering the two schema decisions confirmed
    /// with the project owner: unlock_spend_threshold gates on
    /// CUMULATIVE spend (not a free grant), and the schema survives a
    /// second migrate+seed pass against the same connection -- the same
    /// relaunch scenario that once broke reference-table reseeding (see
    /// db/seed.rs's own regression test).
    #[test]
    fn purchase_is_gated_by_cumulative_spend_and_survives_a_reseed() {
        let conn = setup();

        let campaign =
            campaigns_core::create_campaign(&conn, "camp-1", "Test Campaign", None, "solo").unwrap();
        let participant =
            campaigns_core::add_participant(&conn, "part-1", &campaign.id, "test-user", "player", Some("Grievous"))
                .unwrap();
        campaigns_core::update_participant_credits(&conn, &participant.id, 1000).unwrap();

        let item = campaigns_content::add_store_item(
            &conn, "item-1", &campaign.id, None, "Droideka", 60, Some(10), false, None, 0,
        )
        .unwrap();

        let total_spent = get_participant_total_spent(&conn, &participant.id).unwrap();
        assert_eq!(total_spent, 0);
        assert!(campaign_rules::can_purchase_store_item(&item, 1000, total_spent, 0, 60).is_err());

        insert_purchase(&conn, "purchase-0", &participant.id, &item.id, None, 5).unwrap();
        let total_spent = get_participant_total_spent(&conn, &participant.id).unwrap();
        assert_eq!(total_spent, 5);
        assert!(campaign_rules::can_purchase_store_item(&item, 1000, total_spent, 0, 60).is_err());

        insert_purchase(&conn, "purchase-1", &participant.id, &item.id, None, 5).unwrap();
        let total_spent = get_participant_total_spent(&conn, &participant.id).unwrap();
        assert_eq!(total_spent, 10);
        assert!(campaign_rules::can_purchase_store_item(&item, 1000, total_spent, 0, 60).is_ok());

        migrate::run(&conn).unwrap();
        seed::run(&conn).unwrap();
        let still_there = campaigns_core::get_campaign(&conn, &campaign.id).unwrap();
        assert_eq!(still_there.id, campaign.id);
    }

    #[test]
    fn roster_casualty_auto_retires_once_wiped_out() {
        let conn = setup();
        let campaign =
            campaigns_core::create_campaign(&conn, "camp-2", "Test Campaign 2", None, "solo").unwrap();
        let participant =
            campaigns_core::add_participant(&conn, "part-2", &campaign.id, "test-user", "player", None).unwrap();
        let entry = add_roster_entry(&conn, "roster-1", &participant.id, None, Some("Squad"), 4, false, None)
            .unwrap();
        assert!(!entry.retired);

        let after_partial = campaign_rules::resolve_roster_status(entry.models_total, 2);
        let entry = update_roster_entry_casualty(
            &conn,
            &entry.id,
            2,
            after_partial == campaign_rules::RosterEntryStatus::Retired,
        )
        .unwrap();
        assert!(!entry.retired);

        let after_wipe = campaign_rules::resolve_roster_status(entry.models_total, 4);
        let entry = update_roster_entry_casualty(
            &conn,
            &entry.id,
            4,
            after_wipe == campaign_rules::RosterEntryStatus::Retired,
        )
        .unwrap();
        assert!(entry.retired);
    }
}
