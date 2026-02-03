//! Location Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Location;

#[derive(Clone)]
pub struct LocationRepository {
    pool: PgPool,
}

impl LocationRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Location>, sqlx::Error> {
        sqlx::query_as::<_, Location>("SELECT * FROM locations WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self) -> Result<Vec<Location>, sqlx::Error> {
        sqlx::query_as::<_, Location>("SELECT * FROM locations ORDER BY name")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn list_by_type(&self, location_type: &str) -> Result<Vec<Location>, sqlx::Error> {
        sqlx::query_as::<_, Location>("SELECT * FROM locations WHERE type = $1 ORDER BY name")
            .bind(location_type)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn create(&self, location: &Location) -> Result<Location, sqlx::Error> {
        sqlx::query_as::<_, Location>(
            r#"
            INSERT INTO locations (
                id, parent_id, code, name, type, address,
                latitude, longitude, capacity, current_count, qr_code
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(location.id)
        .bind(location.parent_id)
        .bind(&location.code)
        .bind(&location.name)
        .bind(&location.location_type)
        .bind(&location.address)
        .bind(&location.latitude)
        .bind(&location.longitude)
        .bind(location.capacity)
        .bind(location.current_count)
        .bind(&location.qr_code)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, location: &Location) -> Result<Location, sqlx::Error> {
        sqlx::query_as::<_, Location>(
            r#"
            UPDATE locations SET
                parent_id = $2, code = $3, name = $4, type = $5, address = $6,
                latitude = $7, longitude = $8, capacity = $9, current_count = $10, qr_code = $11,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(location.id)
        .bind(location.parent_id)
        .bind(&location.code)
        .bind(&location.name)
        .bind(&location.location_type)
        .bind(&location.address)
        .bind(&location.latitude)
        .bind(&location.longitude)
        .bind(location.capacity)
        .bind(location.current_count)
        .bind(&location.qr_code)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM locations WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
