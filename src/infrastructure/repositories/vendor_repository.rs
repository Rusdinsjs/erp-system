//! Vendor Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{Vendor, VendorSummary};

#[derive(Clone)]
pub struct VendorRepository {
    pool: PgPool,
}

impl VendorRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Vendor>, sqlx::Error> {
        sqlx::query_as::<_, Vendor>("SELECT * FROM vendors WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<VendorSummary>, sqlx::Error> {
        sqlx::query_as::<_, VendorSummary>(
            r#"
            SELECT id, code, name, contact_person, phone, email, NULL as rating, is_active
            FROM vendors
            ORDER BY name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(&self, vendor: &Vendor) -> Result<Vendor, sqlx::Error> {
        sqlx::query_as::<_, Vendor>(
            r#"
            INSERT INTO vendors (id, code, name, contact_person, phone, email, address, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(vendor.id)
        .bind(&vendor.code)
        .bind(&vendor.name)
        .bind(&vendor.contact_person)
        .bind(&vendor.phone)
        .bind(&vendor.email)
        .bind(&vendor.address)
        .bind(vendor.is_active)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, vendor: &Vendor) -> Result<Vendor, sqlx::Error> {
        sqlx::query_as::<_, Vendor>(
            r#"
            UPDATE vendors SET
                code = $2, name = $3, contact_person = $4, phone = $5, 
                email = $6, address = $7, is_active = $8, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(vendor.id)
        .bind(&vendor.code)
        .bind(&vendor.name)
        .bind(&vendor.contact_person)
        .bind(&vendor.phone)
        .bind(&vendor.email)
        .bind(&vendor.address)
        .bind(vendor.is_active)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM vendors WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
