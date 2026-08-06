use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 10-Step Migration Sequence Enum (Section 23)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MigrationStep {
    Inventory = 1,
    AddSchema = 2,
    Backfill = 3,
    Reconcile = 4,
    ShadowRead = 5,
    SwitchWrites = 6,
    SwitchReads = 7,
    Enforce = 8,
    Observe = 9,
    Cleanup = 10,
}

impl MigrationStep {
    pub fn name(&self) -> &'static str {
        match self {
            MigrationStep::Inventory => "INVENTORY",
            MigrationStep::AddSchema => "ADD_SCHEMA",
            MigrationStep::Backfill => "BACKFILL",
            MigrationStep::Reconcile => "RECONCILE",
            MigrationStep::ShadowRead => "SHADOW_READ",
            MigrationStep::SwitchWrites => "SWITCH_WRITES",
            MigrationStep::SwitchReads => "SWITCH_READS",
            MigrationStep::Enforce => "ENFORCE",
            MigrationStep::Observe => "OBSERVE",
            MigrationStep::Cleanup => "CLEANUP",
        }
    }
}

/// Data Migration Log Entity (Section 23)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataMigrationLog {
    pub id: Uuid,
    pub migration_name: String,
    pub step_number: i32,
    pub step_name: String,
    pub records_inventoried: i32,
    pub records_backfilled: i32,
    pub reconciled_sum_delta: Decimal,
    pub status: String,
    pub executed_at: DateTime<Utc>,
}

/// Opening Balance Cutover Voucher Entity (Section 23 No Fake History Rule)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpeningBalanceVoucher {
    pub id: Uuid,
    pub company_id: Uuid,
    pub voucher_type: String, // "GL_OPENING_BALANCE", "STOCK_OPENING_BALANCE"
    pub cutover_date: NaiveDate,
    pub total_amount: Decimal,
    pub source_system: String,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub posted_at: DateTime<Utc>,
}

/// Opening Balance Detail Line Item Entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpeningBalanceItem {
    pub id: Uuid,
    pub voucher_id: Uuid,
    pub account_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub item_id: Option<Uuid>,
    pub qty: Option<Decimal>,
    pub unit_cost: Option<Decimal>,
    pub amount: Decimal,
}
