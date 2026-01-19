//! Rental Billing Service
//!
//! Business logic for advanced rental billing calculations.

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::RentalBillingPeriod;
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{RentalBillingRepository, RentalRepository};

#[derive(Clone)]
pub struct RentalBillingService {
    pub billing_repo: RentalBillingRepository,
    pub rental_repo: RentalRepository,
}

impl RentalBillingService {
    pub fn new(billing_repo: RentalBillingRepository, rental_repo: RentalRepository) -> Self {
        Self {
            billing_repo,
            rental_repo,
        }
    }

    /// Preview billing calculation without saving
    pub async fn preview_billing(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> DomainResult<RentalBillingPeriod> {
        // 1. Fetch Rental & Rate info
        let rental = self
            .rental_repo
            .find_by_id(rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", rental_id))?;

        let rate_id = rental
            .rental_rate_id
            .ok_or_else(|| DomainError::business_rule("billing", "Rental has no rate assigned"))?;

        let rate = self
            .rental_repo
            .find_rate_by_id(rate_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("RentalRate", rate_id))?;

        // 2. Fetch Timesheets
        let timesheets = self
            .billing_repo
            .get_timesheets_in_range(rental_id, start_date, end_date)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // 3. Initialize Period
        let mut period = RentalBillingPeriod::new(rental_id, start_date, end_date);

        // 4. Copy Rate Configuration
        period.rate_basis = rate.rate_basis.clone();
        period.hourly_rate = Some(rate.to_hourly_rate()); // Normalize to hourly
        period.minimum_hours = rate.minimum_hours;
        period.overtime_multiplier = rate.overtime_multiplier;
        period.standby_multiplier = rate.standby_multiplier;
        period.breakdown_penalty_per_day = rate.breakdown_penalty_per_day;

        // 5. Aggregate Usage
        let mut total_op = Decimal::ZERO;
        let mut total_standby = Decimal::ZERO;
        let mut total_overtime = Decimal::ZERO;
        let mut total_breakdown = Decimal::ZERO;
        let mut total_usage = Decimal::ZERO;

        // Define standard hours per day (default 8)
        let standard_hours = rate.hours_per_day.unwrap_or(Decimal::from(8));

        for ts in timesheets {
            // Recalculate overtime for each timesheet just in case it wasn't set or logic changed
            // Copy logic into a temp struct or modify if mutable.
            // Since we fetched immutable TS, we calculate on fly.

            let op_hours = ts.operating_hours.unwrap_or(Decimal::ZERO);
            let sb_hours = ts.standby_hours.unwrap_or(Decimal::ZERO);
            let bd_hours = ts.breakdown_hours.unwrap_or(Decimal::ZERO);

            // Overtime Calculation: If OP > Standard, split it.
            // Note: Some systems treat overtime as separate field.
            // In our Timesheet entity, we have `overtime_hours`. Prioritize that if calculated, else derive.
            let ot_hours = if let Some(ot) = ts.overtime_hours {
                if ot.is_zero() && op_hours > standard_hours {
                    op_hours - standard_hours
                } else {
                    ot
                }
            } else if op_hours > standard_hours {
                op_hours - standard_hours
            } else {
                Decimal::ZERO
            };

            // Standard Operating Hours (capped at standard)
            let std_op_hours = if op_hours > standard_hours {
                standard_hours
            } else {
                op_hours
            };

            total_op += std_op_hours; // Only sum standard hours as "operating"
            total_overtime += ot_hours;
            total_standby += sb_hours;
            total_breakdown += bd_hours;

            if let (Some(s), Some(e)) = (ts.hm_km_start, ts.hm_km_end) {
                total_usage += e - s;
            }
        }

        period.total_operating_hours = Some(total_op);
        period.total_standby_hours = Some(total_standby);
        period.total_overtime_hours = Some(total_overtime);
        period.total_breakdown_hours = Some(total_breakdown);
        period.total_hm_km_usage = Some(total_usage);

        // Count working days (unique dates with > 0 operating hours)
        // This is simplified; distinct dates from SQL would be better but this works for preview
        period.working_days = Some(0); // TODO: Calculate distinct count

        // 6. Execute Calculation
        period.calculate();

        Ok(period)
    }

    /// Save billing record
    pub async fn create_billing(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
        user_id: Uuid,
    ) -> DomainResult<RentalBillingPeriod> {
        let mut period = self
            .preview_billing(rental_id, start_date, end_date)
            .await?;

        period.calculated_by = Some(user_id);
        period.calculated_at = Some(Utc::now());
        period.status = Some("generated".to_string());

        // Generate Invoice Number
        let rental = self
            .rental_repo
            .find_by_id(rental_id)
            .await
            .unwrap()
            .unwrap();
        let timestamp = Utc::now().format("%y%m%d");
        period.invoice_number = Some(format!("INV/{}/{}", rental.rental_number, timestamp));
        period.invoice_date = Some(Utc::now().date_naive());

        self.billing_repo
            .create(&period)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_by_rental(&self, rental_id: Uuid) -> DomainResult<Vec<RentalBillingPeriod>> {
        self.billing_repo
            .list_by_rental(rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get billing by ID
    pub async fn get_billing(&self, id: Uuid) -> DomainResult<RentalBillingPeriod> {
        self.billing_repo
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("RentalBillingPeriod", id))
    }
}
