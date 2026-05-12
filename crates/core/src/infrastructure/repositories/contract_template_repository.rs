use crate::domain::entities::ContractTemplate;
use crate::domain::errors::{DomainError, DomainResult};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ContractTemplateRepository {
    pool: PgPool,
}

impl ContractTemplateRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, template: &ContractTemplate) -> DomainResult<ContractTemplate> {
        let rec = sqlx::query!(
            r#"
            INSERT INTO contract_templates (id, name, description, header_content, body_content, footer_content, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            "#,
            template.id,
            template.name,
            template.description,
            template.header_content,
            template.body_content,
            template.footer_content,
            template.is_active
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(ContractTemplate {
            id: rec.id,
            name: rec.name,
            description: rec.description,
            header_content: rec.header_content,
            body_content: rec.body_content,
            footer_content: rec.footer_content,
            is_active: rec.is_active.unwrap_or(false),
            created_at: rec.created_at,
            updated_at: rec.updated_at,
        })
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ContractTemplate>> {
        let rec = sqlx::query!(
            r#"
            SELECT id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            FROM contract_templates WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec.map(|r| ContractTemplate {
            id: r.id,
            name: r.name,
            description: r.description,
            header_content: r.header_content,
            body_content: r.body_content,
            footer_content: r.footer_content,
            is_active: r.is_active.unwrap_or(false),
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    pub async fn find_all(&self) -> DomainResult<Vec<ContractTemplate>> {
        let recs = sqlx::query!(
            r#"
            SELECT id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            FROM contract_templates
            ORDER BY name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs
            .into_iter()
            .map(|r| ContractTemplate {
                id: r.id,
                name: r.name,
                description: r.description,
                header_content: r.header_content,
                body_content: r.body_content,
                footer_content: r.footer_content,
                is_active: r.is_active.unwrap_or(false),
                created_at: r.created_at,
                updated_at: r.updated_at,
            })
            .collect())
    }

    pub async fn update(
        &self,
        id: Uuid,
        template: &ContractTemplate,
    ) -> DomainResult<ContractTemplate> {
        let rec = sqlx::query!(
            r#"
            UPDATE contract_templates
            SET name = $1, description = $2, header_content = $3, body_content = $4, footer_content = $5, is_active = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            "#,
            template.name,
            template.description,
            template.header_content,
            template.body_content,
            template.footer_content,
            template.is_active,
            id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(ContractTemplate {
            id: rec.id,
            name: rec.name,
            description: rec.description,
            header_content: rec.header_content,
            body_content: rec.body_content,
            footer_content: rec.footer_content,
            is_active: rec.is_active.unwrap_or(false),
            created_at: rec.created_at,
            updated_at: rec.updated_at,
        })
    }

    pub async fn delete(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!("DELETE FROM contract_templates WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
