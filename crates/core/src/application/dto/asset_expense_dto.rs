use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// Request for a single expense item
#[derive(Debug, Deserialize, Serialize, ToSchema, Clone)]
pub struct CreateAssetExpenseItemRequest {
    #[schema(example = "Filter Oil")]
    pub description: String,
    #[schema(example = "500000.00")]
    pub amount: Decimal,
}

/// Request to create an asset expense
#[derive(Debug, Deserialize, Serialize, ToSchema, Clone)]
pub struct CreateAssetExpenseRequest {
    #[schema(example = "Monthly Service")]
    pub description: String,

    // Amount is now calculated from items
    pub items: Vec<CreateAssetExpenseItemRequest>,

    #[schema(example = "2024-03-20")]
    pub date: NaiveDate,
    pub vendor_name: Option<String>,
    pub invoice_number: Option<String>,
    pub proof_url: Option<String>,
    #[schema(default = "OPEX", example = "OPEX")]
    pub expense_type: Option<String>,
}

/// Asset expense item response DTO
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct AssetExpenseItemResponse {
    pub id: Uuid,
    pub description: String,
    pub amount: Decimal,
}

/// Asset expense response DTO
#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct AssetExpenseResponse {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub description: String,
    pub amount: Decimal, // Total amount
    pub date: NaiveDate,
    pub vendor_name: Option<String>,
    pub invoice_number: Option<String>,
    pub proof_url: Option<String>,
    pub status: String,
    pub expense_type: String,
    pub requested_by: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,

    pub items: Vec<AssetExpenseItemResponse>,
}
