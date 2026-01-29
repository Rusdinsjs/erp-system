use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TaxRenewalDto {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub asset_name: Option<String>,
    pub license_plate: Option<String>,
    pub document_type: String,
    pub current_expiry: NaiveDate,
    pub renewal_cost: Option<Decimal>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct UpdateTaxRenewalCostRequest {
    pub renewal_cost: Decimal,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CompleteTaxRenewalRequest {
    pub new_expiry_date: chrono::NaiveDate,
}
