//! Billing Service
//!
//! Business logic for rental billing period operations.
//! Handles calculation from approved timesheets, approval, and invoice generation.

use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::application::dto::{
    ApproveBillingRequest, BillingSummaryResponse, CalculateBillingRequest,
    CreateBillingPeriodRequest, GenerateInvoiceRequest, UpdateBillingRequest,
};
use crate::domain::entities::{RentalBillingPeriod, TierConfig};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{RentalRepository, TimesheetRepository};

#[derive(Clone)]
pub struct BillingService {
    timesheet_repo: TimesheetRepository,
    rental_repo: RentalRepository,
}

impl BillingService {
    pub fn new(timesheet_repo: TimesheetRepository, rental_repo: RentalRepository) -> Self {
        Self {
            timesheet_repo,
            rental_repo,
        }
    }

    // ==================== BILLING PERIOD OPERATIONS ====================

    /// Create a new billing period
    pub async fn create_billing_period(
        &self,
        request: CreateBillingPeriodRequest,
    ) -> DomainResult<RentalBillingPeriod> {
        // Validate rental exists
        let _rental = self
            .rental_repo
            .find_by_id(request.rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", request.rental_id))?;

        // Create billing period
        let mut billing = RentalBillingPeriod::new(
            request.rental_id,
            request.rental_item_id,
            request.period_start,
            request.period_end,
        );

        if let Some(period_type) = request.period_type {
            billing.period_type = Some(period_type);
        }

        let created = self
            .timesheet_repo
            .create_billing_period(&billing)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(created)
    }

    /// Calculate billing from approved timesheets
    pub async fn calculate_billing(
        &self,
        billing_id: Uuid,
        request: CalculateBillingRequest,
        calculated_by: Uuid,
    ) -> DomainResult<RentalBillingPeriod> {
        // Get billing period
        let mut billing = self.get_by_id(billing_id).await?;

        // Only draft or calculated billing can be recalculated
        let status = billing.status.as_deref().unwrap_or("draft");
        if status != "draft" && status != "calculated" {
            return Err(DomainError::business_rule(
                "billing_status",
                &format!("Cannot calculate billing with status '{}'", status),
            ));
        }

        // Get rental to find rate configuration
        let _rental = self
            .rental_repo
            .find_by_id(billing.rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Rental", billing.rental_id))?;

        // Get rate configuration
        let rate_id = if let Some(item_id) = billing.rental_item_id {
            // Fetch item to get rate_id
            let item_opt = sqlx::query!(
                "SELECT rental_rate_id FROM rental_items WHERE id = $1",
                item_id
            )
            .fetch_optional(self.rental_repo.pool())
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "db".to_string(),
                message: e.to_string(),
            })?;

            if let Some(item) = item_opt {
                item.rental_rate_id
            } else {
                None
            }
        } else {
            None
        };

        let rate = if let Some(rid) = rate_id {
            self.rental_repo.find_rate_by_id(rid).await.map_err(|e| {
                DomainError::ExternalServiceError {
                    service: "db".to_string(),
                    message: e.to_string(),
                }
            })?
        } else {
            None
        };

        // Sum timesheets for the period
        let summary = self
            .timesheet_repo
            .sum_timesheets_for_period(billing.rental_id, billing.period_start, billing.period_end)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Set accumulated hours and fuel
        billing.total_operating_hours = Some(summary.total_operating_hours);
        billing.total_standby_hours = Some(summary.total_standby_hours);
        billing.total_overtime_hours = Some(summary.total_overtime_hours);
        billing.total_breakdown_hours = Some(summary.total_breakdown_hours);
        billing.total_hm_km_usage = Some(summary.total_hm_km_usage);
        billing.total_fuel_consumed = Some(summary.total_fuel_consumed);
        billing.working_days = Some(summary.working_days as i32);

        // Set rate configuration from rental rate or defaults
        if let Some(ref rate) = rate {
            billing.rate_basis = rate.rate_basis.clone();
            billing.hourly_rate = Some(rate.to_hourly_rate());
            billing.minimum_hours = rate.minimum_hours;
            billing.overtime_multiplier = rate.overtime_multiplier;
            billing.standby_multiplier = rate.standby_multiplier;
            billing.breakdown_penalty_per_day = rate.breakdown_penalty_per_day;

            // Fuel Logic
            let is_fuel_included = if let Some(item_id) = billing.rental_item_id {
                let item_res = sqlx::query!(
                    "SELECT is_fuel_included FROM rental_items WHERE id = $1",
                    item_id
                )
                .fetch_optional(self.rental_repo.pool())
                .await
                .unwrap_or(None);

                if let Some(row) = item_res {
                    row.is_fuel_included.unwrap_or(false)
                } else {
                    false
                }
            } else {
                false
            };

            if is_fuel_included {
                billing.fuel_surcharge_rate = Some(Decimal::ZERO);
            } else {
                billing.fuel_surcharge_rate = rate.fuel_surcharge_rate;
            }
        } else {
            // Use defaults
            billing.rate_basis = Some("hourly".to_string());
            billing.rate_basis = Some("hourly".to_string());
            // rental.daily_rate doesn't exist. Default to 0? or Error?
            billing.hourly_rate = Some(Decimal::ZERO);
            billing.minimum_hours = Some(Decimal::from(200));
            billing.overtime_multiplier =
                Some(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE));
            billing.standby_multiplier =
                Some(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE));
            billing.breakdown_penalty_per_day = Some(Decimal::ZERO);
        }

        // Set additional charges from request
        if let Some(mob) = request.mobilization_fee {
            billing.mobilization_fee = Some(mob);
        }
        if let Some(demob) = request.demobilization_fee {
            billing.demobilization_fee = Some(demob);
        }
        if let Some(other) = request.other_charges {
            billing.other_charges = Some(other);
        }
        if request.other_charges_description.is_some() {
            billing.other_charges_description = request.other_charges_description;
        }
        if let Some(discount) = request.discount_percentage {
            billing.discount_percentage = Some(discount);
        }

        // PRE-CALCULATE BASE AMOUNT WITH TIERED PRICING if configured
        // This runs before billing.calculate() which will use the pre-set base_amount
        if let Some(ref rate_cfg) = rate {
            if let Some(ref tier_json) = rate_cfg.tier_config {
                // Try to parse and apply tier config
                if let Ok(tier_config) = serde_json::from_value::<TierConfig>(tier_json.clone()) {
                    let operating_hours = billing.total_operating_hours.unwrap_or(Decimal::ZERO);
                    let hourly_rate_val = billing.hourly_rate.unwrap_or(Decimal::ZERO);

                    // Calculate using tiers
                    let tiered_base_amount =
                        tier_config.calculate(operating_hours, hourly_rate_val);

                    // Pre-set base_amount so calculate() will use it
                    billing.base_amount = Some(tiered_base_amount);
                }
            }
        }

        // Calculate billing amounts
        billing.calculate();

        // Save calculation
        self.timesheet_repo
            .update_billing_calculation(billing_id, &billing, calculated_by)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Get updated billing
        self.get_by_id(billing_id).await
    }

    /// Approve billing
    pub async fn approve_billing(
        &self,
        billing_id: Uuid,
        request: ApproveBillingRequest,
        approved_by: Uuid,
    ) -> DomainResult<()> {
        let billing = self.get_by_id(billing_id).await?;

        // Only calculated billing can be approved
        if billing.status.as_deref() != Some("calculated") {
            return Err(DomainError::business_rule(
                "billing_status",
                "Only calculated billing can be approved",
            ));
        }

        self.timesheet_repo
            .approve_billing(billing_id, approved_by, request.notes)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(())
    }

    /// Update/adjust billing period (draft or calculated only)
    pub async fn update_billing(
        &self,
        billing_id: Uuid,
        request: UpdateBillingRequest,
        updated_by: Uuid,
    ) -> DomainResult<RentalBillingPeriod> {
        let mut billing = self.get_by_id(billing_id).await?;

        // Validate status - only draft or calculated can be updated
        let status = billing.status.as_deref().unwrap_or("draft");
        if status != "draft" && status != "calculated" {
            return Err(DomainError::business_rule(
                "billing_status",
                "Only draft or calculated billing can be updated",
            ));
        }

        // Apply updates if provided
        if let Some(amt) = request.base_amount {
            billing.base_amount = Some(amt);
        }
        if let Some(amt) = request.standby_amount {
            billing.standby_amount = Some(amt);
        }
        if let Some(amt) = request.overtime_amount {
            billing.overtime_amount = Some(amt);
        }
        if let Some(amt) = request.breakdown_penalty_amount {
            billing.breakdown_penalty_amount = Some(amt);
        }
        if let Some(amt) = request.mobilization_fee {
            billing.mobilization_fee = Some(amt);
        }
        if let Some(amt) = request.demobilization_fee {
            billing.demobilization_fee = Some(amt);
        }
        if let Some(amt) = request.other_charges {
            billing.other_charges = Some(amt);
        }
        if let Some(desc) = request.other_charges_description {
            billing.other_charges_description = Some(desc);
        }
        if let Some(pct) = request.discount_percentage {
            billing.discount_percentage = Some(pct);
        }

        // Recalculate totals with updated amounts
        billing.calculate();

        // Save updated billing
        self.timesheet_repo
            .update_billing_calculation(billing_id, &billing, updated_by)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Return updated billing
        self.get_by_id(billing_id).await
    }

    /// Generate invoice
    pub async fn generate_invoice(
        &self,
        billing_id: Uuid,
        request: GenerateInvoiceRequest,
    ) -> DomainResult<String> {
        let billing = self.get_by_id(billing_id).await?;

        // Only approved billing can generate invoice
        if billing.status.as_deref() != Some("approved") {
            return Err(DomainError::business_rule(
                "billing_status",
                "Only approved billing can generate invoice",
            ));
        }

        // Generate invoice number
        let invoice_number = request.invoice_number.unwrap_or_else(|| {
            let now = Utc::now();
            format!("INV-{}", now.format("%Y%m%d%H%M%S"))
        });

        // Calculate due date
        let due_days = request.due_days.unwrap_or(30);
        let today = Utc::now().date_naive();
        let due_date = today + chrono::Duration::days(due_days as i64);

        self.timesheet_repo
            .generate_invoice(billing_id, &invoice_number, due_date)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(invoice_number)
    }

    /// Get billing by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<RentalBillingPeriod> {
        self.timesheet_repo
            .find_billing_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("BillingPeriod", id))
    }

    /// List billing periods for rental
    pub async fn list_by_rental(&self, rental_id: Uuid) -> DomainResult<Vec<RentalBillingPeriod>> {
        self.timesheet_repo
            .list_billing_by_rental(rental_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get billing summary with details
    pub async fn get_billing_summary(
        &self,
        billing_id: Uuid,
    ) -> DomainResult<BillingSummaryResponse> {
        let billing = self.get_by_id(billing_id).await?;

        // Get rental info with joins for names
        // Get rental info with joins for names
        // We use rental_item_id from billing (or join rental_billing_periods directly if preferred, but we have billing loaded)
        // For old data fallback, we might check if rental_item_id is set.
        // But we migrated data. So we assume it's set.
        let rental_info = if let Some(item_id) = billing.rental_item_id {
            sqlx::query!(
                r#"SELECT 
                    r.rental_number, 
                    a.name as asset_name, 
                    c.name as client_name 
                FROM rental_items ri
                JOIN rentals r ON ri.rental_id = r.id
                JOIN assets a ON ri.asset_id = a.id
                JOIN clients c ON r.client_id = c.id
                WHERE ri.id = $1"#,
                item_id
            )
            .fetch_one(self.rental_repo.pool())
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        } else {
            // Fallback for pre-migration data if any (though migration should have covered it)
            // Or if billing is rental-level (deprecated)
            return Err(DomainError::business_rule(
                "billing",
                "Billing period lacks rental_item_id",
            ));
        };

        // Get all approved timesheets for this period
        let timesheets = self
            .timesheet_repo
            .list_timesheets_by_rental(
                billing.rental_id,
                Some(billing.period_start),
                Some(billing.period_end),
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Filter only approved ones for billing summary
        let approved_timesheets: Vec<crate::domain::entities::RentalTimesheet> = timesheets
            .into_iter()
            .filter(|ts| ts.status.as_deref() == Some("approved"))
            .collect();

        Ok(BillingSummaryResponse {
            period: format!(
                "{} - {}",
                billing.period_start.format("%d %b %Y"),
                billing.period_end.format("%d %b %Y")
            ),
            rental_number: rental_info.rental_number,
            client_name: rental_info.client_name,
            asset_name: rental_info.asset_name,

            total_operating_hours: billing.total_operating_hours.unwrap_or(Decimal::ZERO),
            total_standby_hours: billing.total_standby_hours.unwrap_or(Decimal::ZERO),
            total_overtime_hours: billing.total_overtime_hours.unwrap_or(Decimal::ZERO),
            total_breakdown_hours: billing.total_breakdown_hours.unwrap_or(Decimal::ZERO),
            minimum_hours: billing.minimum_hours.unwrap_or(Decimal::from(200)),
            billable_hours: billing.billable_hours.unwrap_or(Decimal::ZERO),
            shortfall_hours: billing.shortfall_hours.unwrap_or(Decimal::ZERO),

            rate_basis: billing.rate_basis.unwrap_or_else(|| "hourly".to_string()),
            hourly_rate: billing.hourly_rate.unwrap_or(Decimal::ZERO),
            overtime_multiplier: billing
                .overtime_multiplier
                .unwrap_or(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE)),
            standby_multiplier: billing
                .standby_multiplier
                .unwrap_or(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE)),
            breakdown_penalty_per_day: billing.breakdown_penalty_per_day.unwrap_or(Decimal::ZERO),

            base_amount: billing.base_amount.unwrap_or(Decimal::ZERO),
            standby_amount: billing.standby_amount.unwrap_or(Decimal::ZERO),
            overtime_amount: billing.overtime_amount.unwrap_or(Decimal::ZERO),
            breakdown_penalty_amount: billing.breakdown_penalty_amount.unwrap_or(Decimal::ZERO),
            mobilization_fee: billing.mobilization_fee.unwrap_or(Decimal::ZERO),
            demobilization_fee: billing.demobilization_fee.unwrap_or(Decimal::ZERO),
            other_charges: billing.other_charges.unwrap_or(Decimal::ZERO),

            subtotal: billing.subtotal.unwrap_or(Decimal::ZERO),
            discount_percentage: billing.discount_percentage.unwrap_or(Decimal::ZERO),
            discount_amount: billing.discount_amount.unwrap_or(Decimal::ZERO),
            tax_percentage: billing.tax_percentage.unwrap_or(Decimal::from(11)),
            tax_amount: billing.tax_amount.unwrap_or(Decimal::ZERO),
            total_amount: billing.total_amount.unwrap_or(Decimal::ZERO),

            status: billing.status.unwrap_or_else(|| "draft".to_string()),
            invoice_number: billing.invoice_number,
            timesheets: approved_timesheets,
        })
    }
}
