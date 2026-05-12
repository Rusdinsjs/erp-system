use crate::domain::entities::setting::Setting;
use crate::shared::errors::AppError;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct SettingsRepository {
    pool: PgPool,
}

impl SettingsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get(&self, key: &str) -> Result<Option<Setting>, AppError> {
        let setting = sqlx::query_as::<_, Setting>("SELECT * FROM settings WHERE key = $1")
            .bind(key)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(setting)
    }

    pub async fn set(
        &self,
        key: &str,
        value: serde_json::Value,
        description: Option<String>,
        user_id: Option<Uuid>,
    ) -> Result<Setting, AppError> {
        let setting = sqlx::query_as::<_, Setting>(
            r#"
            INSERT INTO settings (key, value, description, updated_by, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (key) DO UPDATE
            SET value = $2,
                description = COALESCE($3, settings.description),
                updated_by = $4,
                updated_at = NOW()
            RETURNING *
            "#,
        )
        .bind(key)
        .bind(value)
        .bind(description)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(setting)
    }

    pub async fn list(&self) -> Result<Vec<Setting>, AppError> {
        let settings = sqlx::query_as::<_, Setting>("SELECT * FROM settings ORDER BY key ASC")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(settings)
    }
}
