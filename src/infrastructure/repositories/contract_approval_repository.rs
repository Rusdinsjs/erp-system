use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::ContractApproval;
use crate::domain::errors::DomainError;

/// Repository for contract approval operations
pub struct ContractApprovalRepository {
    pool: PgPool,
}

impl ContractApprovalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new approval record
    pub async fn create(
        &self,
        approval: &ContractApproval,
    ) -> Result<ContractApproval, DomainError> {
        let result = sqlx::query_as!(
            ContractApproval,
            r#"
            INSERT INTO contract_approvals (id, contract_id, approver_id, action, notes, approval_level, delegated_to, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, contract_id, approver_id, action, notes, approval_level, delegated_to, created_at
            "#,
            approval.id,
            approval.contract_id,
            approval.approver_id,
            approval.action,
            approval.notes,
            approval.approval_level,
            approval.delegated_to,
            approval.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(result)
    }

    /// Get approval history for a contract
    pub async fn find_by_contract(
        &self,
        contract_id: Uuid,
    ) -> Result<Vec<ContractApproval>, DomainError> {
        let approvals = sqlx::query_as!(
            ContractApproval,
            r#"
            SELECT id, contract_id, approver_id, action, notes, approval_level, delegated_to, created_at
            FROM contract_approvals
            WHERE contract_id = $1
            ORDER BY created_at DESC
            "#,
            contract_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(approvals)
    }

    /// Get approval history with user names
    pub async fn find_by_contract_with_names(
        &self,
        contract_id: Uuid,
    ) -> Result<Vec<crate::application::dto::contract_dto::ApprovalResponse>, DomainError> {
        let approvals = sqlx::query!(
            r#"
            SELECT 
                ca.id, 
                ca.contract_id, 
                ca.approver_id, 
                u1.name as "approver_name?",
                ca.action, 
                ca.notes, 
                ca.approval_level, 
                ca.delegated_to,
                u2.name as "delegated_to_name?",
                ca.created_at
            FROM contract_approvals ca
            LEFT JOIN users u1 ON ca.approver_id = u1.id
            LEFT JOIN users u2 ON ca.delegated_to = u2.id
            WHERE ca.contract_id = $1
            ORDER BY ca.created_at DESC
            "#,
            contract_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(approvals
            .into_iter()
            .map(
                |row| crate::application::dto::contract_dto::ApprovalResponse {
                    id: row.id,
                    contract_id: row.contract_id,
                    approver_id: row.approver_id,
                    approver_name: row.approver_name,
                    action: row.action,
                    notes: row.notes,
                    approval_level: row.approval_level,
                    delegated_to: row.delegated_to,
                    delegated_to_name: row.delegated_to_name,
                    created_at: row.created_at,
                },
            )
            .collect())
    }

    /// Get the latest approval record for a contract
    pub async fn find_latest(
        &self,
        contract_id: Uuid,
    ) -> Result<Option<ContractApproval>, DomainError> {
        let approval = sqlx::query_as!(
            ContractApproval,
            r#"
            SELECT id, contract_id, approver_id, action, notes, approval_level, delegated_to, created_at
            FROM contract_approvals
            WHERE contract_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            "#,
            contract_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(approval)
    }

    /// Count pending approvals (contracts in pending_approval status)
    pub async fn count_pending(&self) -> Result<i64, DomainError> {
        let count = sqlx::query_scalar!(
            r#"
            SELECT COUNT(DISTINCT ca.contract_id) as "count!"
            FROM contract_approvals ca
            INNER JOIN rental_contracts rc ON ca.contract_id = rc.id
            WHERE rc.status = 'pending_approval'
            AND ca.action = 'submitted'
            "#
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(count)
    }

    /// Get approval by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<ContractApproval>, DomainError> {
        let approval = sqlx::query_as!(
            ContractApproval,
            r#"
            SELECT id, contract_id, approver_id, action, notes, approval_level, delegated_to, created_at
            FROM contract_approvals
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(approval)
    }
}
