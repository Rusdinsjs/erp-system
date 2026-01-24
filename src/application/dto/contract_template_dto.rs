use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateContractTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub header_content: Option<String>,
    pub body_content: String,
    pub footer_content: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContractTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub header_content: Option<String>,
    pub body_content: Option<String>,
    pub footer_content: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ContractTemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub header_content: Option<String>,
    pub body_content: String,
    pub footer_content: Option<String>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}
