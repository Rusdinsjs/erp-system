use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Bill of Materials (BOM) Entity (QMFG-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bom {
    pub id: Uuid,
    pub company_id: Uuid,
    pub item_id: Uuid,
    pub bom_number: String,
    pub version: i32,
    pub quantity: Decimal,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// BOM Line Item Entity (QMFG-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomItem {
    pub id: Uuid,
    pub bom_id: Uuid,
    pub item_id: Uuid,
    pub qty_required: Decimal,
    pub scrap_percentage: Option<Decimal>,
}

/// Production Order Entity (QMFG-003)
/// Explicit naming: Production Order to avoid collision with EAM Work Order
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionOrder {
    pub id: Uuid,
    pub company_id: Uuid,
    pub production_order_number: String,
    pub bom_id: Uuid,
    pub item_id: Uuid,
    pub target_qty: Decimal,
    pub produced_qty: Decimal,
    pub warehouse_id: Uuid,
    pub status: String, // DRAFT, SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED
    pub wip_account_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// Quality Inspection Entity (QQLT-002, QQLT-004)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityInspection {
    pub id: Uuid,
    pub company_id: Uuid,
    pub inspection_number: String,
    pub inspection_type: String, // INCOMING, IN_PROCESS, OUTGOING
    pub item_id: Uuid,
    pub batch_no: Option<String>,
    pub sample_size: Decimal,
    pub status: String, // PENDING, PASSED, REJECTED, QUALITY_HOLD
    pub inspected_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// POS Profile Entity (QPOS-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosProfile {
    pub id: Uuid,
    pub company_id: Uuid,
    pub profile_name: String,
    pub warehouse_id: Uuid,
    pub cash_account_id: Uuid,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// POS Shift Cash Reconciliation Entity (QPOS-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosShift {
    pub id: Uuid,
    pub pos_profile_id: Uuid,
    pub cashier_user_id: Uuid,
    pub opening_balance: Decimal,
    pub closing_balance: Option<Decimal>,
    pub status: String, // OPEN, CLOSED
    pub opened_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}
