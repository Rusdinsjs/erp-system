use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{
    ApprovalEntityType, CreateEntityTypeRequest, UpdateEntityTypeRequest,
};
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ApprovalEntityTypeRepository {
    pool: PgPool,
}

impl ApprovalEntityTypeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_all_active(&self) -> DomainResult<Vec<ApprovalEntityType>> {
        let recs = sqlx::query_as::<_, ApprovalEntityType>(
            r#"
            SELECT id, value, label, icon, color, description,
                   backend_module, is_active, is_system, created_at, updated_at
            FROM approval_entity_types
            WHERE is_active = true
            ORDER BY is_system DESC, created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn find_by_value(&self, value: &str) -> DomainResult<Option<ApprovalEntityType>> {
        let rec = sqlx::query_as::<_, ApprovalEntityType>(
            r#"
            SELECT id, value, label, icon, color, description,
                   backend_module, is_active, is_system, created_at, updated_at
            FROM approval_entity_types
            WHERE value = $1
            "#,
        )
        .bind(value)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ApprovalEntityType>> {
        let rec = sqlx::query_as::<_, ApprovalEntityType>(
            r#"
            SELECT id, value, label, icon, color, description,
                   backend_module, is_active, is_system, created_at, updated_at
            FROM approval_entity_types
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn create(&self, payload: CreateEntityTypeRequest) -> DomainResult<ApprovalEntityType> {
        let valid_value = payload
            .value
            .to_lowercase()
            .chars()
            .filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == '_')
            .collect::<String>();

        if valid_value.is_empty() || valid_value != payload.value.to_lowercase() {
            return Err(DomainError::validation(
                "value",
                "Entity type value must be lowercase with underscores and digits only",
            ));
        }

        if self.find_by_value(&valid_value).await?.is_some() {
            return Err(DomainError::conflict(&format!(
                "Entity type '{}' already exists",
                valid_value
            )));
        }

        let new_id = Uuid::new_v4();
        let now = Utc::now();

        let rec = sqlx::query_as::<_, ApprovalEntityType>(
            r#"
            INSERT INTO approval_entity_types
                (id, value, label, icon, color, description, backend_module, is_active, is_system, created_at, updated_at)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, true, false, $8, $8)
            RETURNING id, value, label, icon, color, description, backend_module, is_active, is_system, created_at, updated_at
            "#,
        )
        .bind(new_id)
        .bind(&valid_value)
        .bind(&payload.label)
        .bind(&payload.icon)
        .bind(&payload.color)
        .bind(&payload.description)
        .bind(&payload.backend_module)
        .bind(now)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn update(
        &self,
        id: Uuid,
        payload: UpdateEntityTypeRequest,
    ) -> DomainResult<ApprovalEntityType> {
        let existing = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ApprovalEntityType", id))?;

        let label = payload.label.unwrap_or(existing.label);
        let icon = payload.icon.or(existing.icon);
        let color = payload.color.or(existing.color);
        let description = payload.description.or(existing.description);
        let backend_module = payload.backend_module.or(existing.backend_module);
        let now = Utc::now();

        let rec = sqlx::query_as::<_, ApprovalEntityType>(
            r#"
            UPDATE approval_entity_types
            SET label = $1, icon = $2, color = $3, description = $4,
                backend_module = $5, updated_at = $6
            WHERE id = $7
            RETURNING id, value, label, icon, color, description, backend_module, is_active, is_system, created_at, updated_at
            "#,
        )
        .bind(label)
        .bind(icon)
        .bind(color)
        .bind(description)
        .bind(backend_module)
        .bind(now)
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn soft_delete(&self, id: Uuid) -> DomainResult<()> {
        let existing = self
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ApprovalEntityType", id))?;

        if existing.is_system {
            return Err(DomainError::business_rule(
                "system_entity",
                "System entity types cannot be deleted",
            ));
        }

        let usage: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM approval_workflows 
            WHERE entity_type = (SELECT value FROM approval_entity_types WHERE id = $1)
            "#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        if usage.0 > 0 {
            return Err(DomainError::business_rule(
                "active_workflows",
                "Cannot delete entity type that is currently used in approval workflows",
            ));
        }

        let now = Utc::now();

        sqlx::query(
            r#"
            UPDATE approval_entity_types
            SET is_active = false, updated_at = $1
            WHERE id = $2 AND is_system = false
            "#,
        )
        .bind(now)
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
