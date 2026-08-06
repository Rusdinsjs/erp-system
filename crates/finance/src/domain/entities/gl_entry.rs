use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Immutable General Ledger Entry Entity (QACC-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GLEntry {
    pub id: Uuid,
    pub company_id: Uuid,
    pub posting_date: NaiveDate,
    pub posting_datetime: DateTime<Utc>,
    pub account_id: Uuid,
    pub party_type: Option<String>,
    pub party_id: Option<Uuid>,
    pub cost_center_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub currency: String,
    pub exchange_rate: Decimal,
    pub debit: Decimal,
    pub credit: Decimal,
    pub debit_in_account_currency: Decimal,
    pub credit_in_account_currency: Decimal,
    pub voucher_type: String,
    pub voucher_no: String,
    pub voucher_id: Uuid,
    pub is_reversal: bool,
    pub reversal_source_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

/// A line item inside a posting instruction sent to AccountingPostingEngine (QACC-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostingLineItem {
    pub account_id: Uuid,
    pub debit: Decimal,
    pub credit: Decimal,
    pub party_type: Option<String>,
    pub party_id: Option<Uuid>,
    pub cost_center_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub currency: Option<String>,
    pub exchange_rate: Option<Decimal>,
}

/// Structured posting instruction passed to AccountingPostingEngine (QACC-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostingInstruction {
    pub company_id: Uuid,
    pub posting_date: NaiveDate,
    pub voucher_type: String,
    pub voucher_no: String,
    pub voucher_id: Uuid,
    pub lines: Vec<PostingLineItem>,
    pub created_by: Option<Uuid>,
}
