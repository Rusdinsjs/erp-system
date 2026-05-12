//! Rental Billing Period Entity
//!
//! Accumulates timesheet data into billing periods with calculations.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Billing period type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PeriodType {
    Daily,
    Weekly,
    Biweekly,
    Monthly,
}

impl std::str::FromStr for PeriodType {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "daily" => Ok(Self::Daily),
            "weekly" => Ok(Self::Weekly),
            "biweekly" => Ok(Self::Biweekly),
            "monthly" => Ok(Self::Monthly),
            _ => Err(()),
        }
    }
}

impl PeriodType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
            Self::Biweekly => "biweekly",
            Self::Monthly => "monthly",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }
}

/// Billing status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BillingStatus {
    Draft,
    Calculated,
    PendingApproval,
    Approved,
    Invoiced,
    Paid,
    Disputed,
}

impl std::str::FromStr for BillingStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(Self::Draft),
            "calculated" => Ok(Self::Calculated),
            "pending_approval" => Ok(Self::PendingApproval),
            "approved" => Ok(Self::Approved),
            "invoiced" => Ok(Self::Invoiced),
            "paid" => Ok(Self::Paid),
            "disputed" => Ok(Self::Disputed),
            _ => Err(()),
        }
    }
}

impl BillingStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Calculated => "calculated",
            Self::PendingApproval => "pending_approval",
            Self::Approved => "approved",
            Self::Invoiced => "invoiced",
            Self::Paid => "paid",
            Self::Disputed => "disputed",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }
}

/// Rate basis for calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RateBasis {
    Hourly,
    Daily,
    Monthly,
}

impl std::str::FromStr for RateBasis {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "hourly" => Ok(Self::Hourly),
            "daily" => Ok(Self::Daily),
            "monthly" => Ok(Self::Monthly),
            _ => Err(()),
        }
    }
}

impl RateBasis {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Hourly => "hourly",
            Self::Daily => "daily",
            Self::Monthly => "monthly",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        <Self as std::str::FromStr>::from_str(s).ok()
    }
}

/// Rental billing period
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalBillingPeriod {
    pub id: Uuid,
    pub rental_id: Uuid,
    pub rental_item_id: Option<Uuid>,

    // Period
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub period_type: Option<String>,

    // Accumulated hours
    pub total_operating_hours: Option<Decimal>,
    pub total_standby_hours: Option<Decimal>,
    pub total_overtime_hours: Option<Decimal>,
    pub total_breakdown_hours: Option<Decimal>,
    pub total_hm_km_usage: Option<Decimal>,
    pub total_production_volume: Option<Decimal>, // BCM Total
    pub working_days: Option<i32>,

    // Rate configuration snapshot
    pub rate_basis: Option<String>,
    pub unit_rate: Option<Decimal>,
    pub hourly_rate: Option<Decimal>,
    pub minimum_hours: Option<Decimal>,
    pub overtime_multiplier: Option<Decimal>,
    pub standby_multiplier: Option<Decimal>,
    pub breakdown_penalty_per_day: Option<Decimal>,

    // Calculation
    pub billable_hours: Option<Decimal>,
    pub shortfall_hours: Option<Decimal>,

    // Financial breakdown
    pub base_amount: Option<Decimal>,
    pub standby_amount: Option<Decimal>,
    pub overtime_amount: Option<Decimal>,
    pub breakdown_penalty_amount: Option<Decimal>,

    pub total_fuel_consumed: Option<Decimal>,
    pub fuel_surcharge_rate: Option<Decimal>,
    pub fuel_surcharge_amount: Option<Decimal>,

    pub mobilization_fee: Option<Decimal>,
    pub demobilization_fee: Option<Decimal>,
    pub other_charges: Option<Decimal>,
    pub other_charges_description: Option<String>,

    pub subtotal: Option<Decimal>,
    pub discount_percentage: Option<Decimal>,
    pub discount_amount: Option<Decimal>,
    pub tax_percentage: Option<Decimal>,
    pub tax_amount: Option<Decimal>,
    pub total_amount: Option<Decimal>,

    // Status
    pub status: Option<String>,

    // Invoice
    pub invoice_number: Option<String>,
    pub invoice_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,

    // Approval
    pub calculated_by: Option<Uuid>,
    pub calculated_at: Option<DateTime<Utc>>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,

    // KPI Metrics (Equipment Availability)
    #[sqlx(default)]
    pub mechanical_availability: Option<Decimal>, // MA %
    #[sqlx(default)]
    pub physical_availability: Option<Decimal>, // PA %
    #[sqlx(default)]
    pub utilization_availability: Option<Decimal>, // UA %
    #[sqlx(default)]
    pub effective_utilization: Option<Decimal>, // EU %
    #[sqlx(default)]
    pub ma_threshold: Option<Decimal>, // Default 85%
    #[sqlx(default)]
    pub availability_penalty: Option<Decimal>, // Penalty amount

    // Adjustment/Correction
    #[sqlx(default)]
    pub adjustment_notes: Option<String>,
    #[sqlx(default)]
    pub adjusted_by: Option<Uuid>,
    #[sqlx(default)]
    pub adjusted_at: Option<DateTime<Utc>>,

    pub notes: Option<String>,

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl RentalBillingPeriod {
    /// Create new billing period
    pub fn new(
        rental_id: Uuid,
        rental_item_id: Option<Uuid>,
        period_start: NaiveDate,
        period_end: NaiveDate,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            rental_id,
            rental_item_id,
            period_start,
            period_end,
            period_type: Some(PeriodType::Monthly.as_str().to_string()),
            total_operating_hours: Some(Decimal::ZERO),
            total_standby_hours: Some(Decimal::ZERO),
            total_overtime_hours: Some(Decimal::ZERO),
            total_breakdown_hours: Some(Decimal::ZERO),
            total_hm_km_usage: Some(Decimal::ZERO),
            total_production_volume: Some(Decimal::ZERO),
            working_days: Some(0),
            rate_basis: Some(RateBasis::Hourly.as_str().to_string()),
            unit_rate: None,
            hourly_rate: None,
            minimum_hours: Some(Decimal::from(200)),
            overtime_multiplier: Some(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE)),
            standby_multiplier: Some(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE)),
            breakdown_penalty_per_day: Some(Decimal::ZERO),
            billable_hours: Some(Decimal::ZERO),
            shortfall_hours: Some(Decimal::ZERO),
            base_amount: Some(Decimal::ZERO),
            standby_amount: Some(Decimal::ZERO),
            overtime_amount: Some(Decimal::ZERO),
            breakdown_penalty_amount: Some(Decimal::ZERO),
            total_fuel_consumed: Some(Decimal::ZERO),
            fuel_surcharge_rate: Some(Decimal::ZERO),
            fuel_surcharge_amount: Some(Decimal::ZERO),
            mobilization_fee: Some(Decimal::ZERO),
            demobilization_fee: Some(Decimal::ZERO),
            other_charges: Some(Decimal::ZERO),
            other_charges_description: None,
            subtotal: Some(Decimal::ZERO),
            discount_percentage: Some(Decimal::ZERO),
            discount_amount: Some(Decimal::ZERO),
            tax_percentage: Some(Decimal::from(11)),
            tax_amount: Some(Decimal::ZERO),
            total_amount: Some(Decimal::ZERO),
            status: Some(BillingStatus::Draft.as_str().to_string()),
            invoice_number: None,
            invoice_date: None,
            due_date: None,
            calculated_by: None,
            calculated_at: None,
            approved_by: None,
            approved_at: None,
            // KPI Metrics
            mechanical_availability: None,
            physical_availability: None,
            utilization_availability: None,
            effective_utilization: None,
            ma_threshold: Some(Decimal::from(85)),
            availability_penalty: Some(Decimal::ZERO),
            // Adjustment
            adjustment_notes: None,
            adjusted_by: None,
            adjusted_at: None,
            notes: None,
            created_at: Some(now),
            updated_at: Some(now),
        }
    }

    /// Calculate billing based on timesheet totals
    pub fn calculate(&mut self) {
        let operating = self.total_operating_hours.unwrap_or(Decimal::ZERO);
        let standby = self.total_standby_hours.unwrap_or(Decimal::ZERO);
        let overtime = self.total_overtime_hours.unwrap_or(Decimal::ZERO);
        let minimum = self.minimum_hours.unwrap_or(Decimal::from(200));
        let unit_rate = self.unit_rate.unwrap_or(Decimal::ZERO);
        let overtime_mult = self
            .overtime_multiplier
            .unwrap_or(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE));
        let standby_mult = self
            .standby_multiplier
            .unwrap_or(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE));
        let breakdown_penalty = self.breakdown_penalty_per_day.unwrap_or(Decimal::ZERO);

        if self.rate_basis.as_deref() == Some("bcm") {
            // BCM Calculation
            let volume = self.total_production_volume.unwrap_or(Decimal::ZERO);
            let base = volume * unit_rate;
            self.base_amount = Some(base);

            self.billable_hours = Some(Decimal::ZERO);
            self.shortfall_hours = Some(Decimal::ZERO);
            self.standby_amount = Some(Decimal::ZERO);
            self.overtime_amount = Some(Decimal::ZERO);
        } else {
            // Standard Time-based Calculation
            // Calculate billable hours (MAX of actual operating hours vs minimum)
            let billable = if operating >= minimum {
                operating
            } else {
                minimum
            };
            self.billable_hours = Some(billable);
            self.shortfall_hours = Some(if operating < minimum {
                minimum - operating
            } else {
                Decimal::ZERO
            });

            // Base amount (billable hours × rate)
            let base = billable * unit_rate;
            self.base_amount = Some(base);

            // Standby amount (standby hours × rate × standby multiplier)
            let standby_amt = standby * unit_rate * standby_mult;
            self.standby_amount = Some(standby_amt);

            // Overtime amount (overtime hours × rate × overtime multiplier)
            let overtime_amt = overtime * unit_rate * overtime_mult;
            self.overtime_amount = Some(overtime_amt);
        }

        // Breakdown penalty (breakdown days × penalty per day)
        let breakdown_hours = self.total_breakdown_hours.unwrap_or(Decimal::ZERO);
        let breakdown_days = breakdown_hours / Decimal::from(8);
        let breakdown_amt = breakdown_days * breakdown_penalty;
        self.breakdown_penalty_amount = Some(breakdown_amt);

        // Fuel Surcharge
        let fuel = self.total_fuel_consumed.unwrap_or(Decimal::ZERO);
        let surcharge_rate = self.fuel_surcharge_rate.unwrap_or(Decimal::ZERO);
        let fuel_amt = fuel * surcharge_rate;
        self.fuel_surcharge_amount = Some(fuel_amt);

        // Subtotal
        let mob = self.mobilization_fee.unwrap_or(Decimal::ZERO);
        let demob = self.demobilization_fee.unwrap_or(Decimal::ZERO);
        let other = self.other_charges.unwrap_or(Decimal::ZERO);
        let base_amt = self.base_amount.unwrap_or(Decimal::ZERO);
        let standby_amt = self.standby_amount.unwrap_or(Decimal::ZERO);
        let overtime_amt = self.overtime_amount.unwrap_or(Decimal::ZERO);
        let subtotal =
            base_amt + standby_amt + overtime_amt - breakdown_amt + mob + demob + other + fuel_amt;
        self.subtotal = Some(subtotal);

        // Discount
        let discount_pct = self.discount_percentage.unwrap_or(Decimal::ZERO);
        let discount_amt = subtotal * discount_pct / Decimal::from(100);
        self.discount_amount = Some(discount_amt);

        // Tax
        let after_discount = subtotal - discount_amt;
        let tax_pct = self.tax_percentage.unwrap_or(Decimal::from(11));
        let tax_amt = after_discount * tax_pct / Decimal::from(100);
        self.tax_amount = Some(tax_amt);

        // Total
        self.total_amount = Some(after_discount + tax_amt);
        self.status = Some(BillingStatus::Calculated.as_str().to_string());
    }

    /// Calculate KPI metrics (MA, PA, UA, EU)
    pub fn calculate_kpi_metrics(&mut self) {
        let operating = self.total_operating_hours.unwrap_or(Decimal::ZERO);
        let standby = self.total_standby_hours.unwrap_or(Decimal::ZERO);
        let breakdown = self.total_breakdown_hours.unwrap_or(Decimal::ZERO);

        // Total scheduled hours (8 hours/day × working days, or calculated from data)
        let total_hours = operating + standby + breakdown;

        if total_hours.is_zero() {
            self.mechanical_availability = Some(Decimal::ZERO);
            self.physical_availability = Some(Decimal::ZERO);
            self.utilization_availability = Some(Decimal::ZERO);
            self.effective_utilization = Some(Decimal::ZERO);
            return;
        }

        // MA = (Total Hours - Breakdown Hours) / Total Hours × 100
        let ma = ((total_hours - breakdown) / total_hours) * Decimal::from(100);
        self.mechanical_availability = Some(ma.round_dp(2));

        // PA = (Operating + Standby) / Total Hours × 100
        let pa = ((operating + standby) / total_hours) * Decimal::from(100);
        self.physical_availability = Some(pa.round_dp(2));

        // UA = Operating / (Operating + Standby) × 100
        let available_hours = operating + standby;
        let ua = if available_hours.is_zero() {
            Decimal::ZERO
        } else {
            (operating / available_hours) * Decimal::from(100)
        };
        self.utilization_availability = Some(ua.round_dp(2));

        // EU = Operating / Total Hours × 100
        let eu = (operating / total_hours) * Decimal::from(100);
        self.effective_utilization = Some(eu.round_dp(2));
    }

    /// Apply availability penalty if MA < threshold
    pub fn apply_availability_penalty(&mut self, penalty_multiplier: Decimal) {
        let ma = self.mechanical_availability.unwrap_or(Decimal::from(100));
        let threshold = self.ma_threshold.unwrap_or(Decimal::from(85));
        let base_rate = self
            .unit_rate
            .unwrap_or(self.hourly_rate.unwrap_or(Decimal::ZERO));

        if ma < threshold && !base_rate.is_zero() {
            // Penalty = (Threshold - Actual MA) × Base Rate × Multiplier
            let deficit = (threshold - ma) / Decimal::from(100); // Convert to decimal
            let operating = self.total_operating_hours.unwrap_or(Decimal::ZERO);
            let penalty = deficit * base_rate * operating * penalty_multiplier;
            self.availability_penalty = Some(penalty.round_dp(2));
        } else {
            self.availability_penalty = Some(Decimal::ZERO);
        }
    }

    /// Full calculation including KPI and penalties
    pub fn calculate_with_kpi(&mut self, penalty_multiplier: Option<Decimal>) {
        // First calculate KPI metrics
        self.calculate_kpi_metrics();

        // Apply availability penalty
        self.apply_availability_penalty(penalty_multiplier.unwrap_or(Decimal::ONE));

        // Then do standard calculation
        self.calculate();

        // Add penalty to total
        let penalty = self.availability_penalty.unwrap_or(Decimal::ZERO);
        if !penalty.is_zero() {
            let current_total = self.total_amount.unwrap_or(Decimal::ZERO);
            self.total_amount = Some(current_total + penalty);
        }
    }
}

/// Summary for billing calculation
#[derive(Debug, Clone, Serialize)]
pub struct BillingCalculationSummary {
    pub period: String,
    pub total_operating_hours: Decimal,
    pub total_standby_hours: Decimal,
    pub total_overtime_hours: Decimal,
    pub total_breakdown_hours: Decimal,
    pub minimum_hours: Decimal,
    pub billable_hours: Decimal,
    pub shortfall_hours: Decimal,
    pub base_amount: Decimal,
    pub standby_amount: Decimal,
    pub overtime_amount: Decimal,
    pub breakdown_penalty: Decimal,
    pub subtotal: Decimal,
    pub discount: Decimal,
    pub tax: Decimal,
    pub total: Decimal,
}
