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

impl PeriodType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
            Self::Biweekly => "biweekly",
            Self::Monthly => "monthly",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "daily" => Some(Self::Daily),
            "weekly" => Some(Self::Weekly),
            "biweekly" => Some(Self::Biweekly),
            "monthly" => Some(Self::Monthly),
            _ => None,
        }
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

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "calculated" => Some(Self::Calculated),
            "pending_approval" => Some(Self::PendingApproval),
            "approved" => Some(Self::Approved),
            "invoiced" => Some(Self::Invoiced),
            "paid" => Some(Self::Paid),
            "disputed" => Some(Self::Disputed),
            _ => None,
        }
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

impl RateBasis {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Hourly => "hourly",
            Self::Daily => "daily",
            Self::Monthly => "monthly",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "hourly" => Some(Self::Hourly),
            "daily" => Some(Self::Daily),
            "monthly" => Some(Self::Monthly),
            _ => None,
        }
    }
}

/// Rental billing period
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RentalBillingPeriod {
    pub id: Uuid,
    pub rental_id: Uuid,

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
    pub working_days: Option<i32>,

    // Rate configuration snapshot
    pub rate_basis: Option<String>,
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

    pub notes: Option<String>,

    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

impl RentalBillingPeriod {
    /// Create new billing period
    pub fn new(rental_id: Uuid, period_start: NaiveDate, period_end: NaiveDate) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            rental_id,
            period_start,
            period_end,
            period_type: Some(PeriodType::Monthly.as_str().to_string()),
            total_operating_hours: Some(Decimal::ZERO),
            total_standby_hours: Some(Decimal::ZERO),
            total_overtime_hours: Some(Decimal::ZERO),
            total_breakdown_hours: Some(Decimal::ZERO),
            total_hm_km_usage: Some(Decimal::ZERO),
            working_days: Some(0),
            rate_basis: Some(RateBasis::Hourly.as_str().to_string()),
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
        let hourly_rate = self.hourly_rate.unwrap_or(Decimal::ZERO);
        let overtime_mult = self
            .overtime_multiplier
            .unwrap_or(Decimal::from_str_exact("1.25").unwrap_or(Decimal::ONE));
        let standby_mult = self
            .standby_multiplier
            .unwrap_or(Decimal::from_str_exact("0.50").unwrap_or(Decimal::ONE));
        let breakdown_penalty = self.breakdown_penalty_per_day.unwrap_or(Decimal::ZERO);

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
        let base = billable * hourly_rate;
        self.base_amount = Some(base);

        // Standby amount (standby hours × rate × standby multiplier)
        let standby_amt = standby * hourly_rate * standby_mult;
        self.standby_amount = Some(standby_amt);

        // Overtime amount (overtime hours × rate × overtime multiplier)
        let overtime_amt = overtime * hourly_rate * overtime_mult;
        self.overtime_amount = Some(overtime_amt);

        // Breakdown penalty (breakdown days × penalty per day)
        let breakdown_hours = self.total_breakdown_hours.unwrap_or(Decimal::ZERO);
        let breakdown_days = breakdown_hours / Decimal::from(8);
        let breakdown_amt = breakdown_days * breakdown_penalty;
        self.breakdown_penalty_amount = Some(breakdown_amt);

        // Subtotal
        let mob = self.mobilization_fee.unwrap_or(Decimal::ZERO);
        let demob = self.demobilization_fee.unwrap_or(Decimal::ZERO);
        let other = self.other_charges.unwrap_or(Decimal::ZERO);
        let subtotal = base + standby_amt + overtime_amt - breakdown_amt + mob + demob + other;
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
