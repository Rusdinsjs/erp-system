use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateContractRequest {
    pub client_id: Uuid,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub auto_renew: Option<bool>,
    pub renewal_notice_days: Option<i32>,
    pub payment_terms: Option<String>,
    pub price_lock: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContractRequest {
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub auto_renew: Option<bool>,
    pub renewal_notice_days: Option<i32>,
    pub payment_terms: Option<String>,
    pub price_lock: Option<bool>,
    pub status: Option<String>,
    pub contract_file_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ContractResponse {
    pub id: Uuid,
    pub contract_number: String,
    pub client_id: Uuid,
    pub client_name: Option<String>, // Needs join later
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub status: String,
    pub auto_renew: bool,
    pub payment_terms: String,

    // Performance metrics
    pub mechanical_availability: Option<Decimal>,
    pub physical_availability: Option<Decimal>,
    pub utilization_availability: Option<Decimal>,

    pub created_at: chrono::DateTime<chrono::Utc>,
}
