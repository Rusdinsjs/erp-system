use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Contract Approval entity for tracking approval history
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ContractApproval {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub approver_id: Option<Uuid>,
    pub action: String, // 'submitted', 'approved', 'rejected'
    pub notes: Option<String>,
    pub approval_level: i32,
    pub delegated_to: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl ContractApproval {
    pub fn new(
        contract_id: Uuid,
        approver_id: Option<Uuid>,
        action: String,
        notes: Option<String>,
        approval_level: i32,
        delegated_to: Option<Uuid>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            contract_id,
            approver_id,
            action,
            notes,
            approval_level,
            delegated_to,
            created_at: Utc::now(),
        }
    }

    /// Check if this is a submission action
    pub fn is_submission(&self) -> bool {
        self.action == "submitted"
    }

    /// Check if this is an approval action
    pub fn is_approval(&self) -> bool {
        self.action == "approved"
    }

    /// Check if this is a rejection action
    pub fn is_rejection(&self) -> bool {
        self.action == "rejected"
    }
}
