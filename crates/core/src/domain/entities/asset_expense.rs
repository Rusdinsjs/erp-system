use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetExpense {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub description: String,
    pub amount: f64,
    pub date: chrono::NaiveDate,
    pub vendor_name: Option<String>,
    pub invoice_number: Option<String>,
    pub proof_url: Option<String>,
    pub status: String,
    pub expense_type: String, // 'OPEX' or 'CAPEX'
    pub requested_by: Uuid,
    pub approved_by: Option<Uuid>,
    pub rejection_reason: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,

    // Multi-item support
    pub items: Vec<AssetExpenseItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetExpenseItem {
    pub id: Uuid,
    pub expense_id: Uuid,
    pub description: String,
    pub amount: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
