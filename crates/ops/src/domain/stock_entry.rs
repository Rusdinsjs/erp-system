use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Warehouse Entity (QSTK-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Warehouse {
    pub id: Uuid,
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub is_active: bool,
    pub is_group: bool,
    pub is_frozen: bool,
    pub warehouse_type: String,
}

/// Bin Projection Entity (QSTK-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bin {
    pub id: Uuid,
    pub company_id: Uuid,
    pub warehouse_id: Uuid,
    pub item_id: Uuid,
    pub actual_qty: Decimal,
    pub reserved_qty: Decimal,
    pub ordered_qty: Decimal,
    pub stock_value: Decimal,
    pub updated_at: DateTime<Utc>,
}

/// Immutable Stock Ledger Entry Entity (QSTK-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockLedgerEntry {
    pub id: Uuid,
    pub company_id: Uuid,
    pub warehouse_id: Uuid,
    pub item_id: Uuid,
    pub posting_date: NaiveDate,
    pub posting_datetime: DateTime<Utc>,
    pub actual_qty_delta: Decimal,
    pub qty_after: Decimal,
    pub valuation_rate: Decimal,
    pub stock_value_delta: Decimal,
    pub stock_value_after: Decimal,
    pub voucher_type: String,
    pub voucher_no: String,
    pub voucher_id: Uuid,
    pub voucher_line_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub serial_no: Option<String>,
    pub is_cancelled: bool,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

/// A line item inside a stock posting instruction passed to StockPostingEngine (QSTK-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockPostingLineItem {
    pub warehouse_id: Uuid,
    pub item_id: Uuid,
    pub actual_qty_delta: Decimal,
    pub unit_cost: Option<Decimal>,
    pub voucher_line_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub serial_no: Option<String>,
    pub allow_negative_stock: Option<bool>,
}

/// Structured stock posting instruction passed to StockPostingEngine (QSTK-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockPostingInstruction {
    pub company_id: Uuid,
    pub posting_date: NaiveDate,
    pub voucher_type: String,
    pub voucher_no: String,
    pub voucher_id: Uuid,
    pub lines: Vec<StockPostingLineItem>,
    pub created_by: Option<Uuid>,
}
