use sqlx::{PgPool, Result};
use uuid::Uuid;

use management_system_core::domain::entities::{
    CategoryAttributeTemplate, CategoryTemplateWithName, CreateCategoryAttributeTemplateRequest,
};

pub struct CategoryTemplateRepository {
    pool: PgPool,
}

impl CategoryTemplateRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// List all templates with category names
    pub async fn list(&self) -> Result<Vec<CategoryTemplateWithName>> {
        let query = r#"
            SELECT 
                t.id,
                t.category_id,
                c.name as category_name,
                t.attributes,
                t.created_at,
                t.updated_at
            FROM category_attribute_templates t
            JOIN categories c ON c.id = t.category_id
            ORDER BY c.name ASC
        "#;
        sqlx::query_as::<_, CategoryTemplateWithName>(query)
            .fetch_all(&self.pool)
            .await
    }

    /// Get template by category id
    pub async fn get_by_category_id(
        &self,
        category_id: Uuid,
    ) -> Result<Option<CategoryAttributeTemplate>> {
        let query = "SELECT * FROM category_attribute_templates WHERE category_id = $1";
        sqlx::query_as::<_, CategoryAttributeTemplate>(query)
            .bind(category_id)
            .fetch_optional(&self.pool)
            .await
    }

    /// Create or Update template
    pub async fn upsert(
        &self,
        req: CreateCategoryAttributeTemplateRequest,
    ) -> Result<CategoryAttributeTemplate> {
        let attributes_json = serde_json::to_value(&req.attributes)
            .map_err(|e| sqlx::Error::Protocol(format!("Failed to serialize attributes: {}", e)))?;

        // This query attempts to insert, and on conflict (category_id) updates the attributes
        let query = r#"
            INSERT INTO category_attribute_templates (category_id, attributes)
            VALUES ($1, $2)
            ON CONFLICT (category_id) 
            DO UPDATE SET 
                attributes = EXCLUDED.attributes,
                updated_at = NOW()
            RETURNING *
        "#;

        sqlx::query_as::<_, CategoryAttributeTemplate>(query)
            .bind(req.category_id)
            .bind(attributes_json)
            .fetch_one(&self.pool)
            .await
    }

    /// Delete template
    pub async fn delete(&self, category_id: Uuid) -> Result<()> {
        let query = "DELETE FROM category_attribute_templates WHERE category_id = $1";
        sqlx::query(query)
            .bind(category_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
