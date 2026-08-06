//! Pure Journal Entry Entities (3R.1.1-002)
//!
//! Owned strictly by `crates/finance`. Contains NO sqlx persistence attributes.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JournalStatus {
    Draft,
    Posted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: Uuid,
    pub transaction_number: String,
    pub date: NaiveDate,
    pub description: String,
    pub reference: Option<String>,
    pub status: JournalStatus,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalLine {
    pub id: Uuid,
    pub journal_entry_id: Uuid,
    pub account_id: Uuid,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntryDetail {
    #[serde(flatten)]
    pub header: JournalEntry,
    pub lines: Vec<JournalLine>,
}

#[derive(Debug, Deserialize)]
pub struct CreateJournalLineRequest {
    pub account_id: Uuid,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct CreateJournalEntryRequest {
    pub date: NaiveDate,
    pub description: String,
    pub reference: Option<String>,
    pub lines: Vec<CreateJournalLineRequest>,
}
