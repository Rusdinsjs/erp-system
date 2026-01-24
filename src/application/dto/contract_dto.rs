use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateContractRequest {
    pub client_id: Uuid,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub template_id: Option<Uuid>,
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
    pub client_name: Option<String>,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub status: String,
    pub auto_renew: bool,
    pub payment_terms: String,
    pub price_lock: bool,
    pub notes: Option<String>,

    // Performance metrics
    pub mechanical_availability: Option<Decimal>,
    pub physical_availability: Option<Decimal>,
    pub utilization_availability: Option<Decimal>,

    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,

    pub current_approval_step: i32,
    pub total_approval_steps: i32,
    pub delegated_to: Option<Uuid>,
}

// Document DTOs
#[derive(Debug, Serialize)]
pub struct ContractDocumentResponse {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub document_type: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub version: i32,
    pub is_active: bool,
    pub notes: Option<String>,
    pub uploaded_by: Uuid,
    pub uploaded_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UploadDocumentRequest {
    pub document_type: String,
    pub notes: Option<String>,
}

// Contract Detail DTOs
#[derive(Debug, Serialize)]
pub struct ContractPerformance {
    pub total_rentals: i32,
    pub active_rentals: i32,
    pub total_revenue: f64,
    pub ma: f64,
    pub pa: f64,
    pub ua: f64,
    pub eu: f64,
}

// Alias for service layer
pub type ContractPerformanceResponse = ContractPerformance;

#[derive(Debug, Serialize)]
pub struct ContractDetailResponse {
    pub contract: ContractResponse,
    pub performance: ContractPerformance,
    pub documents_count: usize,
    pub related_rentals: Vec<crate::application::dto::rental_dto::RentalResponse>,
}

// Approval DTOs
#[derive(Debug, Deserialize)]
pub struct ApprovalRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkApprovalRequest {
    pub ids: Vec<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DelegateApprovalRequest {
    pub delegated_to: Uuid,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApprovalResponse {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub approver_id: Option<Uuid>,
    pub approver_name: Option<String>,
    pub action: String,
    pub notes: Option<String>,
    pub approval_level: i32,
    pub delegated_to: Option<Uuid>,
    pub delegated_to_name: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Renewal DTOs
#[derive(Debug, Deserialize)]
pub struct RenewalRequest {
    pub renewal_type: String, // 'extend', 'modify', 'new'
    pub new_end_date: Option<String>,
    pub new_start_date: Option<String>,
    pub notes: Option<String>,
    pub payment_terms: Option<String>,
    pub auto_renew: Option<bool>,
    pub price_lock: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct RenewalResponse {
    pub id: Uuid,
    pub original_contract_id: Uuid,
    pub new_contract_id: Option<Uuid>,
    pub renewal_type: String,
    pub previous_end_date: String,
    pub new_end_date: String,
    pub notes: Option<String>,
    pub renewed_by: Option<Uuid>,
    pub renewed_at: String,
}

#[derive(Debug, Serialize)]
pub struct RenewalOptionsResponse {
    pub can_extend: bool,
    pub can_modify: bool,
    pub can_create_new: bool,
    pub current_end_date: String,
    pub suggested_end_date: String,
    pub expiring_in_days: i64,
}
