//! Rental Billing Repository
//!
//! Data access for rental billing periods.

use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::entities::{RentalBillingPeriod, RentalTimesheet};

#[derive(Clone)]
pub struct RentalBillingRepository {
    pool: PgPool,
}

impl RentalBillingRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create billing period record
    pub async fn create(
        &self,
        billing: &RentalBillingPeriod,
    ) -> Result<RentalBillingPeriod, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"
            INSERT INTO rental_billing_periods (
                id, rental_id, period_start, period_end, period_type,
                total_operating_hours, total_standby_hours, total_overtime_hours, total_breakdown_hours,
                total_hm_km_usage, working_days,
                rate_basis, unit_rate, hourly_rate, minimum_hours, overtime_multiplier, standby_multiplier, breakdown_penalty_per_day,
                billable_hours, shortfall_hours,
                base_amount, standby_amount, overtime_amount, breakdown_penalty_amount,
                mobilization_fee, demobilization_fee, other_charges, other_charges_description,
                subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, total_amount,
                status, invoice_number, invoice_date, due_date,
                calculated_by, calculated_at, approved_by, approved_at,
                notes, created_at, updated_at, total_production_volume,
                total_fuel_consumed, fuel_surcharge_rate, fuel_surcharge_amount
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
                $42, $43, $44, $45, $46, $47, $48, $49
            )
            RETURNING *
            "#,
            billing.id,
            billing.rental_id,
            billing.period_start,
            billing.period_end,
            billing.period_type,
            billing.total_operating_hours,
            billing.total_standby_hours,
            billing.total_overtime_hours,
            billing.total_breakdown_hours,
            billing.total_hm_km_usage,
            billing.working_days,
            billing.rate_basis,
            billing.unit_rate,
            billing.hourly_rate,
            billing.minimum_hours,
            billing.overtime_multiplier,
            billing.standby_multiplier,
            billing.breakdown_penalty_per_day,
            billing.billable_hours,
            billing.shortfall_hours,
            billing.base_amount,
            billing.standby_amount,
            billing.overtime_amount,
            billing.breakdown_penalty_amount,
            billing.mobilization_fee,
            billing.demobilization_fee,
            billing.other_charges,
            billing.other_charges_description,
            billing.subtotal,
            billing.discount_percentage,
            billing.discount_amount,
            billing.tax_percentage,
            billing.tax_amount,
            billing.total_amount,
            billing.status,
            billing.invoice_number,
            billing.invoice_date,
            billing.due_date,
            billing.calculated_by,
            billing.calculated_at,
            billing.approved_by,
            billing.approved_at,
            billing.notes,
            billing.created_at,
            billing.updated_at,
            billing.total_production_volume,
            billing.total_fuel_consumed,
            billing.fuel_surcharge_rate,
            billing.fuel_surcharge_amount
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Retrieve Timesheets within a period for a rental
    /// Only fetches timesheets relevant for billing (e.g. approved/verified if required, but for now fetching all actively logged ones)
    pub async fn get_timesheets_in_range(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as!(
            RentalTimesheet,
            r#"
            SELECT * FROM rental_timesheets 
            WHERE rental_id = $1 
            AND work_date >= $2 
            AND work_date <= $3
            ORDER BY work_date ASC
            "#,
            rental_id,
            start_date,
            end_date
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_timesheets_for_item_in_range(
        &self,
        rental_item_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as!(
            RentalTimesheet,
            r#"
            SELECT * FROM rental_timesheets 
            WHERE rental_item_id = $1 
            AND work_date >= $2 
            AND work_date <= $3
            ORDER BY work_date ASC
            "#,
            rental_item_id,
            start_date,
            end_date
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List billings for a rental
    pub async fn list_by_rental(
        &self,
        rental_id: Uuid,
    ) -> Result<Vec<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"SELECT * FROM rental_billing_periods WHERE rental_id = $1 ORDER BY period_end DESC"#,
            rental_id
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Find billing period by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"SELECT * FROM rental_billing_periods WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }
}
