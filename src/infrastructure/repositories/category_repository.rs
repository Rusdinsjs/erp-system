//! Category Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Category;

#[derive(Clone)]
pub struct CategoryRepository {
    pool: PgPool,
}

impl CategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE code = $1")
            .bind(code)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, department: Option<&str>) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            "SELECT * FROM categories WHERE ($1::text IS NULL OR department = $1) ORDER BY name",
        )
        .bind(department)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_root(&self, department: Option<&str>) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            "SELECT * FROM categories WHERE parent_id IS NULL AND ($1::text IS NULL OR department = $1) ORDER BY name",
        )
        .bind(department)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_children(&self, parent_id: Uuid) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE parent_id = $1 ORDER BY name")
            .bind(parent_id)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn create(&self, category: &Category) -> Result<Category, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            r#"
            INSERT INTO categories (id, parent_id, code, name, department, description, attributes, main_category, sub_category_letter, example_assets, function_description, display_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#,
        )
        .bind(category.id)
        .bind(category.parent_id)
        .bind(&category.code)
        .bind(&category.name)
        .bind(&category.department)
        .bind(&category.description)
        .bind(&category.attributes_schema)
        .bind(&category.main_category)
        .bind(&category.sub_category_letter)
        .bind(&category.example_assets)
        .bind(&category.function_description)
        .bind(category.display_order)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, category: &Category) -> Result<Category, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            r#"
            UPDATE categories SET
                parent_id = $2, code = $3, name = $4, department = $5, description = $6, attributes = $7,
                main_category = $8, sub_category_letter = $9, example_assets = $10, 
                function_description = $11, display_order = $12, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(category.id)
        .bind(category.parent_id)
        .bind(&category.code)
        .bind(&category.name)
        .bind(&category.department)
        .bind(&category.description)
        .bind(&category.attributes_schema)
        .bind(&category.main_category)
        .bind(&category.sub_category_letter)
        .bind(&category.example_assets)
        .bind(&category.function_description)
        .bind(category.display_order)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM categories WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
