use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// ReportDefinition Metadata Entity (QRPT-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportDefinition {
    pub id: Uuid,
    pub name: String,
    pub report_type: String, // "FINANCIAL", "STOCK", "CUSTOM"
    pub query_provider: String,
    pub options_json: Option<serde_json::Value>,
    pub permission_scope: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// PrintTemplate Definition Entity (QPRT-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintTemplate {
    pub id: Uuid,
    pub entity_type_id: Option<Uuid>,
    pub document_type: String,
    pub template_name: String,
    pub html_template: String,
    pub css_styles: Option<String>,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Integration API Credential Entity (QINT-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiCredential {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub client_name: String,
    pub api_key_hash: String,
    pub scopes: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_revoked: bool,
    pub created_at: DateTime<Utc>,
}

/// Standardized API Error Response (QAPI-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiStandardError {
    pub code: String,
    pub message: String,
    pub correlation_id: String,
    pub timestamp: DateTime<Utc>,
}
