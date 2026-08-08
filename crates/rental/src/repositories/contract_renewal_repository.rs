use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::ContractRenewal;
use crate::domain::errors::DomainError;

pub struct ContractRenewalRepository {
    pool: PgPool,
}

impl ContractRenewalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, renewal: &ContractRenewal) -> Result<ContractRenewal, DomainError> {
        let result = sqlx::query_as::<sqlx::Postgres, ContractRenewal>(
            r#"
            INSERT INTO contract_renewals (
                id, original_contract_id, new_contract_id, renewal_type,
                previous_end_date, new_end_date, notes, renewed_by, renewed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(renewal.id)
        .bind(renewal.original_contract_id)
        .bind(renewal.new_contract_id)
        .bind(&renewal.renewal_type)
        .bind(renewal.previous_end_date)
        .bind(renewal.new_end_date)
        .bind(&renewal.notes)
        .bind(renewal.renewed_by)
        .bind(renewal.renewed_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(result)
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<ContractRenewal, DomainError> {
        let renewal =
            sqlx::query_as::<sqlx::Postgres, ContractRenewal>("SELECT * FROM contract_renewals WHERE id = $1")
                .bind(id)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| match e {
                    sqlx::Error::RowNotFound => {
                        DomainError::not_found("Contract renewal", id.to_string())
                    }
                    _ => DomainError::Database(e.to_string()),
                })?;

        Ok(renewal)
    }

    pub async fn list_by_contract(
        &self,
        contract_id: Uuid,
    ) -> Result<Vec<ContractRenewal>, DomainError> {
        let renewals = sqlx::query_as::<sqlx::Postgres, ContractRenewal>(
            r#"
            SELECT * FROM contract_renewals 
            WHERE original_contract_id = $1 
            ORDER BY renewed_at DESC
            "#,
        )
        .bind(contract_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e: sqlx::Error| DomainError::Database(e.to_string()))?;

        Ok(renewals)
    }

    pub async fn update_new_contract_id(
        &self,
        renewal_id: Uuid,
        new_contract_id: Uuid,
    ) -> Result<(), DomainError> {
        sqlx::query(
            "UPDATE contract_renewals SET new_contract_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
        )
        .bind(new_contract_id)
        .bind(renewal_id)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }
}
