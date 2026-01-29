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
                id, asset_id, document_type, current_expiry, renewal_cost, status, invoice_id, notes, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
            renewal.id,
            renewal.asset_id,
            renewal.document_type,
            renewal.current_expiry,
            renewal.renewal_cost,
            renewal.status,
            renewal.invoice_id,
            renewal.notes,
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
            SELECT * FROM asset_tax_renewals
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
            r#"SELECT * FROM asset_tax_renewals WHERE id = $1"#,
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
    ) -> Result<TaxRenewal, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET renewal_cost = $1, notes = COALESCE($2, notes), status = 'PENDING_APPROVAL', updated_at = NOW()
            WHERE id = $3
            RETURNING *
            "#,
            cost,
            notes,
            id
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<TaxRenewal, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
            "#,
            status,
            id
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_invoice_id(
        &self,
        id: Uuid,
        invoice_id: Uuid,
    ) -> Result<TaxRenewal, sqlx::Error> {
        sqlx::query_as!(
            TaxRenewal,
            r#"
            UPDATE asset_tax_renewals
            SET invoice_id = $1, status = 'INVOICED', updated_at = NOW()
            WHERE id = $2
            RETURNING *
            "#,
            invoice_id,
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
            Some(s) => sqlx::query_as!(
                TaxRenewal,
                r#"SELECT * FROM asset_tax_renewals WHERE status = $1 ORDER BY created_at DESC"#,
                s
            )
            .fetch_all(&self.pool)
            .await,
            None => {
                sqlx::query_as!(
                    TaxRenewal,
                    r#"SELECT * FROM asset_tax_renewals ORDER BY created_at DESC"#
                )
                .fetch_all(&self.pool)
                .await
            }
        }
    }
}
