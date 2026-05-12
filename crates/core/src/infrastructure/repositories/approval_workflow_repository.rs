use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::ApprovalWorkflow;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ApprovalWorkflowRepository {
    pool: PgPool,
}

impl ApprovalWorkflowRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, workflow: &ApprovalWorkflow) -> DomainResult<ApprovalWorkflow> {
        let rec = sqlx::query_as!(
            ApprovalWorkflow,
            r#"
            INSERT INTO approval_workflows (
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING 
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active as "is_active!", created_at, updated_at
            "#,
            workflow.id,
            workflow.workflow_name,
            workflow.entity_type,
            workflow.approval_levels,
            workflow.level_1_role,
            workflow.level_2_role,
            workflow.level_3_role,
            workflow.level_4_role,
            workflow.level_5_role,
            workflow.is_active,
            workflow.created_at,
            workflow.updated_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ApprovalWorkflow>> {
        let rec = sqlx::query_as!(
            ApprovalWorkflow,
            r#"
            SELECT 
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active as "is_active!", created_at, updated_at
            FROM approval_workflows WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_active_by_entity_type(
        &self,
        entity_type: &str,
    ) -> DomainResult<Option<ApprovalWorkflow>> {
        let rec = sqlx::query_as!(
            ApprovalWorkflow,
            r#"
            SELECT 
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active as "is_active!", created_at, updated_at
            FROM approval_workflows 
            WHERE entity_type = $1 AND is_active = true
            LIMIT 1
            "#,
            entity_type
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_all(&self) -> DomainResult<Vec<ApprovalWorkflow>> {
        let recs = sqlx::query_as!(
            ApprovalWorkflow,
            r#"
            SELECT 
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active as "is_active!", created_at, updated_at
            FROM approval_workflows ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn update(
        &self,
        id: Uuid,
        workflow: &ApprovalWorkflow,
    ) -> DomainResult<ApprovalWorkflow> {
        let rec = sqlx::query_as!(
            ApprovalWorkflow,
            r#"
            UPDATE approval_workflows
            SET 
                workflow_name = $1,
                entity_type = $2,
                approval_levels = $3,
                level_1_role = $4,
                level_2_role = $5,
                level_3_role = $6,
                level_4_role = $7,
                level_5_role = $8,
                is_active = $9,
                updated_at = $10
            WHERE id = $11
            RETURNING 
                id, workflow_name, entity_type, approval_levels,
                level_1_role, level_2_role, level_3_role, level_4_role, level_5_role,
                is_active as "is_active!", created_at, updated_at
            "#,
            workflow.workflow_name,
            workflow.entity_type,
            workflow.approval_levels,
            workflow.level_1_role,
            workflow.level_2_role,
            workflow.level_3_role,
            workflow.level_4_role,
            workflow.level_5_role,
            workflow.is_active,
            Some(Utc::now()),
            id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn delete(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!(
            r#"
            DELETE FROM approval_workflows WHERE id = $1
            "#,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
