use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, utoipa::ToSchema)]
pub struct TaxRenewal {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub document_type: String, // STNK, TAX, KIR, LAPOR_TIBA
    pub current_expiry: NaiveDate,
    pub renewal_cost: Option<Decimal>,
    pub status: String, // PENDING_INPUT, PENDING_APPROVAL, APPROVED, INVOICED, PAID, COMPLETED
    pub invoice_id: Option<Uuid>,
    pub notes: Option<String>,
    pub payment_destination: Option<String>,
    pub invoice_attachment: Option<String>,
    pub payment_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[sqlx(default)]
    pub asset_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateTaxRenewalRequest {
    pub asset_id: Uuid,
    pub document_type: String,
    pub current_expiry: NaiveDate,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateTaxRenewalCostRequest {
    pub renewal_cost: Decimal,
    pub notes: Option<String>,
    pub payment_destination: Option<String>,
    pub invoice_attachment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ApproveTaxRenewalRequest {
    pub notes: Option<String>,
}
