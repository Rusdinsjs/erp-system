use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// System Health Check Entity (QSRE-001, QSRE-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealthCheck {
    pub id: Uuid,
    pub node_id: String,
    pub service_name: String,
    pub status: String,
    pub latency_ms: i32,
    pub checked_at: DateTime<Utc>,
}

/// Backup Verification Log Entity (QSRE-004, QSRE-005)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemBackupLog {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub backup_name: String,
    pub size_bytes: i64,
    pub backup_status: String,
    pub restore_verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Tenant Control-Plane Provisioning Entity (QSRE-008)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantProvisioningLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub site_domain: String,
    pub provision_status: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Helper to redact sensitive credentials from structured logs (QSRE-002)
pub struct StructuredLogRedactor;

impl StructuredLogRedactor {
    pub fn sanitize_log_payload(raw: &str) -> String {
        let sensitive_keys = ["password", "token", "secret", "api_key", "jwt"];
        let lower = raw.to_lowercase();
        for key in sensitive_keys {
            if lower.contains(key) {
                return format!("[REDACTED_PAYLOAD_CONTAINING_{}]", key.to_uppercase());
            }
        }
        raw.to_string()
    }
}
