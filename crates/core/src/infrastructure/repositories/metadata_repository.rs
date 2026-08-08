use crate::domain::metadata_kernel::{EntityType, FieldDefinition, LayoutDefinition};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct MetadataRepository {
    pool: PgPool,
}

impl MetadataRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // --- Entity Types ---

    pub async fn create_entity_type(&self, entity_type: &EntityType) -> Result<EntityType, sqlx::Error> {
        let rec = sqlx::query_as::<_, EntityType>(
            r#"
            INSERT INTO entity_types (id, name, module, storage_strategy, is_custom, version, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, module, storage_strategy, is_custom, version, created_at, updated_at
            "#,
        )
        .bind(entity_type.id)
        .bind(&entity_type.name)
        .bind(&entity_type.module)
        .bind(&entity_type.storage_strategy)
        .bind(entity_type.is_custom)
        .bind(entity_type.version)
        .bind(entity_type.created_at)
        .bind(entity_type.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn find_entity_type_by_name(&self, name: &str) -> Result<Option<EntityType>, sqlx::Error> {
        let rec = sqlx::query_as::<_, EntityType>(
            r#"
            SELECT id, name, module, storage_strategy, is_custom, version, created_at, updated_at
            FROM entity_types
            WHERE name = $1
            "#,
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn find_entity_type_by_id(&self, id: Uuid) -> Result<Option<EntityType>, sqlx::Error> {
        let rec = sqlx::query_as::<_, EntityType>(
            r#"
            SELECT id, name, module, storage_strategy, is_custom, version, created_at, updated_at
            FROM entity_types
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn list_entity_types(&self) -> Result<Vec<EntityType>, sqlx::Error> {
        let recs = sqlx::query_as::<_, EntityType>(
            r#"
            SELECT id, name, module, storage_strategy, is_custom, version, created_at, updated_at
            FROM entity_types
            ORDER BY name ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(recs)
    }

    // --- Field Definitions ---

    pub async fn create_field_definition(&self, field: &FieldDefinition) -> Result<FieldDefinition, sqlx::Error> {
        let rec = sqlx::query_as::<_, FieldDefinition>(
            r#"
            INSERT INTO field_definitions (id, entity_type_id, field_name, label, data_type, is_required, is_readonly, default_value, options_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, entity_type_id, field_name, label, data_type, is_required, is_readonly, default_value, options_json
            "#,
        )
        .bind(field.id)
        .bind(field.entity_type_id)
        .bind(&field.field_name)
        .bind(&field.label)
        .bind(&field.data_type)
        .bind(field.is_required)
        .bind(field.is_readonly)
        .bind(&field.default_value)
        .bind(&field.options_json)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn find_fields_by_entity_type(&self, entity_type_id: Uuid) -> Result<Vec<FieldDefinition>, sqlx::Error> {
        let recs = sqlx::query_as::<_, FieldDefinition>(
            r#"
            SELECT id, entity_type_id, field_name, label, data_type, is_required, is_readonly, default_value, options_json
            FROM field_definitions
            WHERE entity_type_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(entity_type_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(recs)
    }

    pub async fn delete_field_definition(&self, id: Uuid) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM field_definitions WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }

    // --- Layout Definitions ---

    pub async fn save_layout_definition(&self, layout: &LayoutDefinition) -> Result<LayoutDefinition, sqlx::Error> {
        let rec = sqlx::query_as::<_, LayoutDefinition>(
            r#"
            INSERT INTO layout_definitions (id, entity_type_id, layout_name, layout_json)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (entity_type_id, layout_name) 
            DO UPDATE SET layout_json = EXCLUDED.layout_json, updated_at = NOW()
            RETURNING id, entity_type_id, layout_name, layout_json
            "#,
        )
        .bind(layout.id)
        .bind(layout.entity_type_id)
        .bind(&layout.layout_name)
        .bind(&layout.layout_json)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn get_layout(&self, entity_type_id: Uuid, layout_name: &str) -> Result<Option<LayoutDefinition>, sqlx::Error> {
        let rec = sqlx::query_as::<_, LayoutDefinition>(
            r#"
            SELECT id, entity_type_id, layout_name, layout_json
            FROM layout_definitions
            WHERE entity_type_id = $1 AND layout_name = $2
            "#,
        )
        .bind(entity_type_id)
        .bind(layout_name)
        .fetch_optional(&self.pool)
        .await?;

        Ok(rec)
    }
}
