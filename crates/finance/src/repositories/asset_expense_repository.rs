use management_system_core::application::dto::asset_expense_dto::CreateAssetExpenseRequest;
use management_system_core::application::dto::asset_expense_dto::{AssetExpenseItemResponse, AssetExpenseResponse};
use management_system_core::domain::errors::{DomainError, DomainResult};
use rust_decimal::Decimal;
use sqlx::PgPool;
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
        // Calculate total amount from items
        let total_amount: Decimal = request.items.iter().map(|item| item.amount).sum();

        let expense_type = request.expense_type.unwrap_or_else(|| "OPEX".to_string());

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        let expense = sqlx::query!(
            r#"
            INSERT INTO asset_expenses (
                asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, expense_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
            RETURNING  id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            "#,
            asset_id,
            request.description,
            total_amount,
            request.date,
            request.vendor_name,
            request.invoice_number,
            request.proof_url,
            requested_by,
            expense_type
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut items = Vec::new();

        for item_req in request.items {
            let item = sqlx::query!(
                r#"
                INSERT INTO asset_expense_items (expense_id, description, amount)
                VALUES ($1, $2, $3)
                RETURNING id, description, amount
                "#,
                expense.id,
                item_req.description,
                item_req.amount
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            items.push(AssetExpenseItemResponse {
                id: item.id,
                description: item.description,
                amount: item.amount,
            });
        }

        tx.commit()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(AssetExpenseResponse {
            id: expense.id,
            asset_id: expense.asset_id,
            description: expense.description,
            amount: expense.amount,
            date: expense.date,
            vendor_name: expense.vendor_name,
            invoice_number: expense.invoice_number,
            proof_url: expense.proof_url,
            status: expense.status,
            expense_type: expense.expense_type,
            requested_by: expense.requested_by,
            created_at: expense.created_at,
            updated_at: expense.updated_at,
            items,
        })
    }

    pub async fn find_by_asset_id(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<Vec<AssetExpenseResponse>> {
        let records = sqlx::query!(
            r#"
            SELECT id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            FROM asset_expenses
            WHERE asset_id = $1
            ORDER BY date DESC
            "#,
            asset_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut result = Vec::new();

        for r in records {
            let items = sqlx::query_as!(
                AssetExpenseItemResponse,
                r#"
                SELECT id, description, amount
                FROM asset_expense_items
                WHERE expense_id = $1
                "#,
                r.id
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            result.push(AssetExpenseResponse {
                id: r.id,
                asset_id: r.asset_id,
                description: r.description,
                amount: r.amount,
                date: r.date,
                vendor_name: r.vendor_name,
                invoice_number: r.invoice_number,
                proof_url: r.proof_url,
                status: r.status,
                expense_type: r.expense_type,
                requested_by: r.requested_by,
                created_at: r.created_at,
                updated_at: r.updated_at,
                items,
            });
        }

        Ok(result)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<AssetExpenseResponse>> {
        let r = sqlx::query!(
            r#"
            SELECT id, asset_id, description, amount, date, vendor_name, invoice_number, proof_url, status, requested_by, created_at, updated_at, expense_type
            FROM asset_expenses
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        match r {
            Some(r) => {
                let items = sqlx::query_as!(
                    AssetExpenseItemResponse,
                    r#"
                    SELECT id, description, amount
                    FROM asset_expense_items
                    WHERE expense_id = $1
                    "#,
                    r.id
                )
                .fetch_all(&self.pool)
                .await
                .map_err(|e| DomainError::Database(e.to_string()))?;

                Ok(Some(AssetExpenseResponse {
                    id: r.id,
                    asset_id: r.asset_id,
                    description: r.description,
                    amount: r.amount,
                    date: r.date,
                    vendor_name: r.vendor_name,
                    invoice_number: r.invoice_number,
                    proof_url: r.proof_url,
                    status: r.status,
                    expense_type: r.expense_type,
                    requested_by: r.requested_by,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    items,
                }))
            }
            None => Ok(None),
        }
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> DomainResult<()> {
        sqlx::query!(
            r#"
            UPDATE asset_expenses
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            status
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::ExternalServiceError {
            service: "database".to_string(),
            message: e.to_string(),
        })?;

        Ok(())
    }
}
