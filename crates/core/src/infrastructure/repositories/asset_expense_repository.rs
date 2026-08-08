use crate::application::dto::asset_expense_dto::CreateAssetExpenseRequest;
use crate::application::dto::asset_expense_dto::{AssetExpenseItemResponse, AssetExpenseResponse};
use crate::domain::errors::{DomainError, DomainResult};
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Clone)]
pub struct AssetExpenseRepository {
    pool: PgPool,
}

impl AssetExpenseRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        asset_id: Uuid,
        request: CreateAssetExpenseRequest,
        requested_by: Uuid,
    ) -> DomainResult<AssetExpenseResponse> {
        let total_amount: Decimal = request.items.iter().map(|item| item.amount).sum();
        let expense_type = request.expense_type.unwrap_or_else(|| "OPEX".to_string());

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        let row = sqlx::query(
            r#"
            INSERT INTO asset_expenses (
                asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, expense_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
            RETURNING id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            "#,
        )
        .bind(asset_id)
        .bind(&request.description)
        .bind(total_amount)
        .bind(request.date)
        .bind(&request.vendor_name)
        .bind(&request.invoice_number)
        .bind(&request.proof_url)
        .bind(requested_by)
        .bind(&expense_type)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        let expense_id: Uuid = row.get("id");
        let mut items = Vec::new();

        for item_req in request.items {
            let item_row = sqlx::query(
                r#"
                INSERT INTO asset_expense_items (expense_id, description, amount)
                VALUES ($1, $2, $3)
                RETURNING id, description, amount
                "#,
            )
            .bind(expense_id)
            .bind(&item_req.description)
            .bind(item_req.amount)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

            items.push(AssetExpenseItemResponse {
                id: item_row.get("id"),
                description: item_row.get("description"),
                amount: item_row.get("amount"),
            });
        }

        tx.commit()
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(AssetExpenseResponse {
            id: expense_id,
            asset_id: row.get("asset_id"),
            description: row.get("description"),
            amount: row.get("amount"),
            date: row.get("date"),
            vendor_name: row.get("vendor_name"),
            invoice_number: row.get("invoice_number"),
            proof_url: row.get("proof_url"),
            status: row.get("status"),
            expense_type: row.get("expense_type"),
            requested_by: row.get("requested_by"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            items,
        })
    }

    pub async fn find_by_asset_id(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<Vec<AssetExpenseResponse>> {
        let records = sqlx::query(
            r#"
            SELECT id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            FROM asset_expenses
            WHERE asset_id = $1
            ORDER BY date DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        let mut result = Vec::new();

        for r in records {
            let exp_id: Uuid = r.get("id");
            let item_rows = sqlx::query(
                r#"
                SELECT id, description, amount
                FROM asset_expense_items
                WHERE expense_id = $1
                "#,
            )
            .bind(exp_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

            let items = item_rows
                .into_iter()
                .map(|item_row| AssetExpenseItemResponse {
                    id: item_row.get("id"),
                    description: item_row.get("description"),
                    amount: item_row.get("amount"),
                })
                .collect();

            result.push(AssetExpenseResponse {
                id: exp_id,
                asset_id: r.get("asset_id"),
                description: r.get("description"),
                amount: r.get("amount"),
                date: r.get("date"),
                vendor_name: r.get("vendor_name"),
                invoice_number: r.get("invoice_number"),
                proof_url: r.get("proof_url"),
                status: r.get("status"),
                expense_type: r.get("expense_type"),
                requested_by: r.get("requested_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                items,
            });
        }

        Ok(result)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<AssetExpenseResponse>> {
        let r = sqlx::query(
            r#"
            SELECT id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            FROM asset_expenses
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        match r {
            Some(r) => {
                let exp_id: Uuid = r.get("id");
                let item_rows = sqlx::query(
                    r#"
                    SELECT id, description, amount
                    FROM asset_expense_items
                    WHERE expense_id = $1
                    "#,
                )
                .bind(exp_id)
                .fetch_all(&self.pool)
                .await
                .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

                let items = item_rows
                    .into_iter()
                    .map(|item_row| AssetExpenseItemResponse {
                        id: item_row.get("id"),
                        description: item_row.get("description"),
                        amount: item_row.get("amount"),
                    })
                    .collect();

                Ok(Some(AssetExpenseResponse {
                    id: exp_id,
                    asset_id: r.get("asset_id"),
                    description: r.get("description"),
                    amount: r.get("amount"),
                    date: r.get("date"),
                    vendor_name: r.get("vendor_name"),
                    invoice_number: r.get("invoice_number"),
                    proof_url: r.get("proof_url"),
                    status: r.get("status"),
                    expense_type: r.get("expense_type"),
                    requested_by: r.get("requested_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                    items,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> DomainResult<()> {
        sqlx::query(
            r#"
            UPDATE asset_expenses
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(status)
        .execute(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::ExternalServiceError {
            service: "database".to_string(),
            message: e.to_string(),
        })?;

        Ok(())
    }
}
