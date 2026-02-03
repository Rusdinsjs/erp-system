use crate::domain::entities::TaxRenewal;

use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct TaxRenewalRepository {
    pool: PgPool,
}

impl TaxRenewalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, renewal: TaxRenewal) -> Result<TaxRenewal, sqlx::Error> {
        let rec = sqlx::query_as!(
            TaxRenewal,
            r#"
            INSERT INTO asset_tax_renewals (
                id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at, NULL as asset_name
            "#,
            renewal.id,
            renewal.asset_id,
            renewal.document_type,
            renewal.current_expiry,
            renewal.renewal_cost,
            renewal.status,
            renewal.invoice_id,
            renewal.notes,
            renewal.payment_destination,
            renewal.invoice_attachment,
            renewal.payment_date,
            renewal.created_at,
            renewal.updated_at
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    pub async fn find_pending_by_asset_and_type(
        &self,
        asset_id: Uuid,
        doc_type: &str,
    ) -> Result<Option<TaxRenewal>, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            SELECT 
                r.id, r.asset_id, r.document_type, r.current_expiry, r.renewal_cost, r.status, r.invoice_id, r.notes, r.payment_destination, r.invoice_attachment, r.payment_date, r.created_at, r.updated_at,
                NULL as asset_name
            FROM asset_tax_renewals r
            WHERE asset_id = $1 AND document_type = $2 AND status != 'COMPLETED'
            LIMIT 1
            "#,
            asset_id,
            doc_type
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<TaxRenewal>, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            SELECT 
                id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at, 
                NULL as asset_name 
            FROM asset_tax_renewals 
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn update_cost(
        &self,
        id: Uuid,
        cost: Decimal,
        notes: Option<String>,
        payment_destination: Option<String>,
        invoice_attachment: Option<String>,
    ) -> Result<TaxRenewal, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET renewal_cost = $1, notes = COALESCE($2, notes), payment_destination = $3, invoice_attachment = $4, status = 'PENDING_APPROVAL', updated_at = NOW()
            WHERE id = $5
            RETURNING id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at, NULL as asset_name
            "#,
            cost,
            notes,
            payment_destination,
            invoice_attachment,
            id
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_status(
        &self,
        id: Uuid,
        status: &str,
        notes: Option<String>,
        payment_date: Option<chrono::NaiveDate>,
    ) -> Result<TaxRenewal, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET status = $1, 
                notes = COALESCE($2, notes), 
                payment_date = COALESCE($4, payment_date),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at, NULL as asset_name
            "#,
            status,
            notes,
            id,
            payment_date
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_invoice_id(
        &self,
        id: Uuid,
        invoice_id: Uuid,
        notes: Option<String>,
    ) -> Result<TaxRenewal, sqlx::Error> {
        // We use COALESCE($1, notes) to keep existing notes if $1 is NULL
        // However, usually we want to OVERWRITE if $1 is provided.
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET invoice_id = $1, 
                status = 'INVOICED', 
                notes = COALESCE($2, notes),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, payment_destination, invoice_attachment, payment_date, created_at, updated_at, NULL as asset_name
            "#,
            invoice_id,
            notes,
            id
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn list_by_status(
        &self,
        status: Option<String>,
    ) -> Result<Vec<TaxRenewal>, sqlx::Error> {
        match status {
            Some(s) => {
                sqlx::query_as!(
                    TaxRenewal,
                    r#"
                SELECT 
                    r.id, r.asset_id, r.document_type, r.current_expiry, r.renewal_cost, 
                    r.status, r.invoice_id, r.notes, r.payment_destination, r.invoice_attachment, r.payment_date, r.created_at, r.updated_at,
                    a.name as asset_name
                FROM asset_tax_renewals r
                LEFT JOIN assets a ON r.asset_id = a.id
                WHERE r.status = $1 
                ORDER BY r.current_expiry ASC
                "#,
                    s
                )
                .fetch_all(&self.pool)
                .await
            }
            None => {
                sqlx::query_as!(
                    TaxRenewal,
                    r#"
                    SELECT 
                        r.id, r.asset_id, r.document_type, r.current_expiry, r.renewal_cost, 
                        r.status, r.invoice_id, r.notes, r.payment_destination, r.invoice_attachment, r.payment_date, r.created_at, r.updated_at,
                        a.name as asset_name
                    FROM asset_tax_renewals r
                    LEFT JOIN assets a ON r.asset_id = a.id
                    ORDER BY r.current_expiry ASC
                    "#
                )
                .fetch_all(&self.pool)
                .await
            }
        }
    }
}
