//! Client Repository
//!
//! Data access layer for external rental clients.

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Client;

#[derive(Clone)]
pub struct ClientRepository {
    pool: PgPool,
}

impl ClientRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new client
    pub async fn create(&self, client: &Client) -> Result<Client, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"
            INSERT INTO clients (id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at
            "#,
            client.id,
            client.client_code,
            client.name,
            client.company_name,
            client.email,
            client.phone,
            client.address,
            client.city,
            client.contact_person,
            client.tax_id,
            client.is_active,
            client.notes,
            client.created_at,
            client.updated_at
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Find client by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Client>, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"SELECT id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at FROM clients WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Find client by code
    pub async fn find_by_code(&self, code: &str) -> Result<Option<Client>, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"SELECT id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at FROM clients WHERE client_code = $1"#,
            code
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// List all clients with pagination
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<Client>, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"
            SELECT id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at
            FROM clients
            ORDER BY name ASC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Count total clients
    pub async fn count(&self) -> Result<i64, sqlx::Error> {
        let result = sqlx::query_scalar!(r#"SELECT COUNT(*) as "count!" FROM clients"#)
            .fetch_one(&self.pool)
            .await?;
        Ok(result)
    }

    /// Update client
    pub async fn update(&self, client: &Client) -> Result<Client, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"
            UPDATE clients SET
                name = $2,
                company_name = $3,
                email = $4,
                phone = $5,
                address = $6,
                city = $7,
                contact_person = $8,
                tax_id = $9,
                is_active = $10,
                notes = $11,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at
            "#,
            client.id,
            client.name,
            client.company_name,
            client.email,
            client.phone,
            client.address,
            client.city,
            client.contact_person,
            client.tax_id,
            client.is_active,
            client.notes
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Search clients by name or company name
    pub async fn search(&self, query: &str, limit: i64) -> Result<Vec<Client>, sqlx::Error> {
        let search_pattern = format!("%{}%", query);
        sqlx::query_as!(
            Client,
            r#"
            SELECT id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at
            FROM clients
            WHERE name ILIKE $1 OR company_name ILIKE $1
            ORDER BY name ASC
            LIMIT $2
            "#,
            search_pattern,
            limit
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List active clients only
    pub async fn list_active(&self, limit: i64, offset: i64) -> Result<Vec<Client>, sqlx::Error> {
        sqlx::query_as!(
            Client,
            r#"
            SELECT id, client_code, name, company_name, email, phone, address, city, contact_person, tax_id, is_active, notes, created_at, updated_at
            FROM clients
            WHERE is_active = true
            ORDER BY name ASC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
    }
}
