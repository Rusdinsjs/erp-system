//! Rental Billing Repository
//!
//! Data access for rental billing periods.
//! Uses runtime queries to avoid compile-time schema validation issues.

use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{RentalBillingPeriod, RentalTimesheet};

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
        sqlx::query_as::<sqlx::Postgres, RentalBillingPeriod>(
            r#"INSERT INTO rental_billing_periods (
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
            RETURNING *"#,
        )
        .bind(billing.id)
        .bind(billing.rental_id)
        .bind(billing.period_start)
        .bind(billing.period_end)
        .bind(&billing.period_type)
        .bind(billing.total_operating_hours)
        .bind(billing.total_standby_hours)
        .bind(billing.total_overtime_hours)
        .bind(billing.total_breakdown_hours)
        .bind(billing.total_hm_km_usage)
        .bind(billing.working_days)
        .bind(&billing.rate_basis)
        .bind(billing.unit_rate)
        .bind(billing.hourly_rate)
        .bind(billing.minimum_hours)
        .bind(billing.overtime_multiplier)
        .bind(billing.standby_multiplier)
        .bind(billing.breakdown_penalty_per_day)
        .bind(billing.billable_hours)
        .bind(billing.shortfall_hours)
        .bind(billing.base_amount)
        .bind(billing.standby_amount)
        .bind(billing.overtime_amount)
        .bind(billing.breakdown_penalty_amount)
        .bind(billing.mobilization_fee)
        .bind(billing.demobilization_fee)
        .bind(billing.other_charges)
        .bind(&billing.other_charges_description)
        .bind(billing.subtotal)
        .bind(billing.discount_percentage)
        .bind(billing.discount_amount)
        .bind(billing.tax_percentage)
        .bind(billing.tax_amount)
        .bind(billing.total_amount)
        .bind(&billing.status)
        .bind(&billing.invoice_number)
        .bind(billing.invoice_date)
        .bind(billing.due_date)
        .bind(billing.calculated_by)
        .bind(billing.calculated_at)
        .bind(billing.approved_by)
        .bind(billing.approved_at)
        .bind(&billing.notes)
        .bind(billing.created_at)
        .bind(billing.updated_at)
        .bind(billing.total_production_volume)
        .bind(billing.total_fuel_consumed)
        .bind(billing.fuel_surcharge_rate)
        .bind(billing.fuel_surcharge_amount)
        .fetch_one(&self.pool)
        .await
    }

    /// Retrieve Timesheets within a period for a rental
    pub async fn get_timesheets_in_range(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as::<sqlx::Postgres, RentalTimesheet>(
            r#"SELECT * FROM rental_timesheets
            WHERE rental_id = $1
            AND work_date >= $2
            AND work_date <= $3
            ORDER BY work_date ASC"#,
        )
        .bind(rental_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_timesheets_for_item_in_range(
        &self,
        rental_item_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<Vec<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as::<sqlx::Postgres, RentalTimesheet>(
            r#"SELECT * FROM rental_timesheets
            WHERE rental_item_id = $1
            AND work_date >= $2
            AND work_date <= $3
            ORDER BY work_date ASC"#,
        )
        .bind(rental_item_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
    }

    /// List billings for a rental
    pub async fn list_by_rental(
        &self,
        rental_id: Uuid,
    ) -> Result<Vec<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as::<sqlx::Postgres, RentalBillingPeriod>(
            r#"SELECT * FROM rental_billing_periods WHERE rental_id = $1 ORDER BY period_end DESC"#,
        )
        .bind(rental_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Find billing period by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as::<sqlx::Postgres, RentalBillingPeriod>(
            r#"SELECT * FROM rental_billing_periods WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }
}
