use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::RentalContract;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ContractRepository {
    pool: PgPool,
}

impl ContractRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new contract
    pub async fn create(&self, contract: &RentalContract) -> DomainResult<RentalContract> {
        let rec = sqlx::query_as!(
            RentalContract,
            r#"
            INSERT INTO rental_contracts (
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            "#,
            contract.id,
            contract.contract_number,
            contract.client_id,
            contract.start_date,
            contract.end_date,
            contract.auto_renew,
            contract.renewal_notice_days,
            contract.payment_terms,
            contract.price_lock,
            contract.status,
            contract.contract_file_url,
            contract.notes,
            contract.created_by
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    /// Find contract by ID
    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<RentalContract>> {
        let rec = sqlx::query_as!(
            RentalContract,
            r#"
            SELECT 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            FROM rental_contracts WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    /// Find all contracts (approximating list w/o pagination for now)
    pub async fn find_all(&self) -> DomainResult<Vec<RentalContract>> {
        let recs = sqlx::query_as!(
            RentalContract,
            r#"
            SELECT 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            FROM rental_contracts ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    /// Find contracts by client ID
    pub async fn find_by_client(&self, client_id: Uuid) -> DomainResult<Vec<RentalContract>> {
        let recs = sqlx::query_as!(
            RentalContract,
            r#"
            SELECT 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            FROM rental_contracts WHERE client_id = $1 ORDER BY created_at DESC
            "#,
            client_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    /// Find contracts expiring soon (within N days)
    pub async fn find_expiring_soon(&self, days: i32) -> DomainResult<Vec<RentalContract>> {
        let recs = sqlx::query_as!(
            RentalContract,
            r#"
            SELECT 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            FROM rental_contracts 
            WHERE status = 'active' 
            AND end_date <= CURRENT_DATE + ($1 || ' days')::INTERVAL
            AND end_date >= CURRENT_DATE
            ORDER BY end_date ASC
            "#,
            days as f64
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    /// Get usage statistics for contract
    pub async fn get_contract_usage(
        &self,
        contract_id: Uuid,
    ) -> DomainResult<(i64, f64, f64, f64)> {
        // Just a placeholder query to get aggregated data from linked rentals -> timesheets
        // (total_timesheets, operating_hours, standby_hours, breakdown_hours)
        let rec = sqlx::query!(
            r#"
            SELECT 
                COUNT(rt.id) as total_sheets,
                COALESCE(SUM(rt.operating_hours), 0) as total_operating,
                COALESCE(SUM(rt.standby_hours), 0) as total_standby,
                COALESCE(SUM(rt.breakdown_hours), 0) as total_breakdown
            FROM rentals r
            JOIN rental_timesheets rt ON rt.rental_id = r.id AND rt.status = 'approved'
            WHERE r.contract_id = $1
            "#,
            contract_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        // Convert decimals to f64 for simple return
        // Note: In production code we should probably keep Decimal or generic structs
        use rust_decimal::prelude::ToPrimitive;

        let total_op = rec
            .total_operating
            .unwrap_or(rust_decimal::Decimal::ZERO)
            .to_f64()
            .unwrap_or(0.0);
        let total_sb = rec
            .total_standby
            .unwrap_or(rust_decimal::Decimal::ZERO)
            .to_f64()
            .unwrap_or(0.0);
        let total_bd = rec
            .total_breakdown
            .unwrap_or(rust_decimal::Decimal::ZERO)
            .to_f64()
            .unwrap_or(0.0);

        Ok((rec.total_sheets.unwrap_or(0), total_op, total_sb, total_bd))
    }

    /// Update contract
    pub async fn update(
        &self,
        id: Uuid,
        contract: &RentalContract,
        updated_by: Uuid,
    ) -> DomainResult<RentalContract> {
        let rec = sqlx::query_as!(
            RentalContract,
            r#"
            UPDATE rental_contracts
            SET 
                start_date = $1, end_date = $2, auto_renew = $3, 
                renewal_notice_days = $4, payment_terms = $5, price_lock = $6,
                status = $7, contract_file_url = $8, notes = $9,
                updated_at = NOW(), updated_by = $10
            WHERE id = $11
            RETURNING 
                id, contract_number, client_id, start_date, end_date,
                auto_renew, renewal_notice_days, payment_terms, price_lock,
                status, contract_file_url, notes, 
                created_at, created_by, updated_at, updated_by, 
                approved_at, approved_by, terminated_at, terminated_by, termination_reason
            "#,
            contract.start_date,
            contract.end_date,
            contract.auto_renew,
            contract.renewal_notice_days,
            contract.payment_terms,
            contract.price_lock,
            contract.status,
            contract.contract_file_url,
            contract.notes,
            updated_by,
            id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    /// Update contract KPIs
    pub async fn update_kpis(
        &self,
        id: Uuid,
        ma: Option<rust_decimal::Decimal>,
        pa: Option<rust_decimal::Decimal>,
        ua: Option<rust_decimal::Decimal>,
        eu: Option<rust_decimal::Decimal>,
    ) -> DomainResult<()> {
        sqlx::query!(
            r#"
            UPDATE rental_contracts
            SET 
                mechanical_availability = $1,
                physical_availability = $2,
                utilization_availability = $3,
                effective_utilization = $4,
                kpi_calculated_at = NOW()
            WHERE id = $5
            "#,
            ma,
            pa,
            ua,
            eu,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }

    /// Get next sequence for contract number generation
    pub async fn get_next_sequence(&self, year: i32) -> DomainResult<i32> {
        // Simple logic: count contracts created in that year + 1
        // Better implementation would have a sequences table, but this works for MVP
        let count = sqlx::query!(
            r#"
            SELECT COUNT(*) as count 
            FROM rental_contracts 
            WHERE EXTRACT(YEAR FROM created_at) = $1
            "#,
            year as f64
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok((count.count.unwrap_or(0) + 1) as i32)
    }
}
