use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Cluster-Safe Job Lock Entity (QJOB-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemJobLock {
    pub job_name: String,
    pub locked_by: String,
    pub locked_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Request to acquire a distributed job lock (QJOB-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcquireJobLockRequest {
    pub job_name: String,
    pub worker_id: String,
    pub ttl_seconds: i64,
}

/// Multi-Channel Notification Message Payload (QNOT-001)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationMessage {
    pub id: Uuid,
    pub company_id: Option<Uuid>,
    pub recipient_user_id: Uuid,
    pub channel: String, // "IN_APP", "EMAIL", "WEBHOOK"
    pub subject: String,
    pub body: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}
