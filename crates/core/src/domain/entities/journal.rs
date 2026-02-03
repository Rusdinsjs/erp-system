//! Journal Entry Entities
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "journal_status", rename_all = "lowercase")]
pub enum JournalStatus {
    Draft,
    Posted,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
    // Lines are usually fetched via join or separate query, not directly in this struct for basic queries
    // unless we use a DTO
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct JournalLine {
    pub id: Uuid,
    pub journal_entry_id: Uuid,
    pub account_id: Uuid,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
}

// DTO with Lines embedded
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
