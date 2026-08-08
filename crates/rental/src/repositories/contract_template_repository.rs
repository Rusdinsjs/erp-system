use crate::domain::entities::ContractTemplate;
use crate::domain::errors::{DomainError, DomainResult};
use sqlx::{PgPool, Row};
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
        let row = sqlx::query(
            r#"INSERT INTO contract_templates (id, name, description, header_content, body_content, footer_content, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at"#,
        )
        .bind(template.id)
        .bind(&template.name)
        .bind(&template.description)
        .bind(&template.header_content)
        .bind(&template.body_content)
        .bind(&template.footer_content)
        .bind(template.is_active)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(ContractTemplate {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            header_content: row.get("header_content"),
            body_content: row.get("body_content"),
            footer_content: row.get("footer_content"),
            is_active: row.get::<Option<bool>, _>("is_active").unwrap_or(false),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ContractTemplate>> {
        let row = sqlx::query(
            r#"SELECT id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            FROM contract_templates WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.map(|r| ContractTemplate {
            id: r.get("id"),
            name: r.get("name"),
            description: r.get("description"),
            header_content: r.get("header_content"),
            body_content: r.get("body_content"),
            footer_content: r.get("footer_content"),
            is_active: r.get::<Option<bool>, _>("is_active").unwrap_or(false),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }))
    }

    pub async fn find_all(&self) -> DomainResult<Vec<ContractTemplate>> {
        let rows = sqlx::query(
            r#"SELECT id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at
            FROM contract_templates
            ORDER BY name ASC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|r| ContractTemplate {
                id: r.get("id"),
                name: r.get("name"),
                description: r.get("description"),
                header_content: r.get("header_content"),
                body_content: r.get("body_content"),
                footer_content: r.get("footer_content"),
                is_active: r.get::<Option<bool>, _>("is_active").unwrap_or(false),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect())
    }

    pub async fn update(
        &self,
        id: Uuid,
        template: &ContractTemplate,
    ) -> DomainResult<ContractTemplate> {
        let row = sqlx::query(
            r#"UPDATE contract_templates
            SET name = $1, description = $2, header_content = $3, body_content = $4, footer_content = $5, is_active = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING id, name, description, header_content, body_content, footer_content, is_active, created_at, updated_at"#,
        )
        .bind(&template.name)
        .bind(&template.description)
        .bind(&template.header_content)
        .bind(&template.body_content)
        .bind(&template.footer_content)
        .bind(template.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(ContractTemplate {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            header_content: row.get("header_content"),
            body_content: row.get("body_content"),
            footer_content: row.get("footer_content"),
            is_active: row.get::<Option<bool>, _>("is_active").unwrap_or(false),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn delete(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM contract_templates WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
