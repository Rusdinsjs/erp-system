//! Timesheet Repository
//!
//! Database operations for rental timesheets and billing periods.

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::application::dto::TimesheetDetailResponse;
use crate::domain::entities::{ClientContact, RentalBillingPeriod, RentalTimesheet};

#[derive(Clone)]
pub struct TimesheetRepository {
    pool: PgPool,
}

impl TimesheetRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ==================== TIMESHEET OPERATIONS ====================

    /// Create timesheet entry
    pub async fn create_timesheet(
        &self,
        timesheet: &RentalTimesheet,
    ) -> Result<RentalTimesheet, sqlx::Error> {
        sqlx::query_as!(
            RentalTimesheet,
            r#"INSERT INTO rental_timesheets (
                id, rental_id, rental_item_id, work_date, start_time, end_time,
                operating_hours, standby_hours, overtime_hours, breakdown_hours,
                hm_km_start, hm_km_end, hm_km_usage,
                operation_status, breakdown_reason, work_description, work_location,
                photos, checker_id, checker_at, checker_notes, status,
                production_volume, production_unit, fuel_consumed_liters
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            RETURNING *"#,
            timesheet.id,
            timesheet.rental_id,
            timesheet.rental_item_id,
            timesheet.work_date,
            timesheet.start_time,
            timesheet.end_time,
            timesheet.operating_hours,
            timesheet.standby_hours,
            timesheet.overtime_hours,
            timesheet.breakdown_hours,
            timesheet.hm_km_start,
            timesheet.hm_km_end,
            timesheet.hm_km_usage,
            timesheet.operation_status,
            timesheet.breakdown_reason,
            timesheet.work_description,
            timesheet.work_location,
            timesheet.photos,
            timesheet.checker_id,
            timesheet.checker_at,
            timesheet.checker_notes,
            timesheet.status,
            timesheet.production_volume,
            timesheet.production_unit,
            timesheet.fuel_consumed_liters
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Get timesheet by ID
    pub async fn find_timesheet_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as!(
            RentalTimesheet,
            r#"SELECT * FROM rental_timesheets WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// List timesheets for a rental
    pub async fn list_timesheets_by_rental(
        &self,
        rental_id: Uuid,
        start_date: Option<NaiveDate>,
        end_date: Option<NaiveDate>,
    ) -> Result<Vec<RentalTimesheet>, sqlx::Error> {
        sqlx::query_as!(
            RentalTimesheet,
            r#"SELECT * FROM rental_timesheets 
            WHERE rental_id = $1
            AND ($2::date IS NULL OR work_date >= $2)
            AND ($3::date IS NULL OR work_date <= $3)
            ORDER BY work_date ASC"#,
            rental_id,
            start_date,
            end_date
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Update timesheet record
    pub async fn update_timesheet(
        &self,
        timesheet: &RentalTimesheet,
    ) -> Result<RentalTimesheet, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as!(
            RentalTimesheet,
            r#"UPDATE rental_timesheets SET
                start_time = $2, end_time = $3,
                operating_hours = $4, standby_hours = $5, overtime_hours = $6, breakdown_hours = $7,
                hm_km_start = $8, hm_km_end = $9, hm_km_usage = $10,
                operation_status = $11, breakdown_reason = $12, work_description = $13, work_location = $14,
                photos = $15, checker_notes = $16,
                production_volume = $17, production_unit = $18,
                fuel_consumed_liters = $19,
                updated_at = $20
            WHERE id = $1
            RETURNING *"#,
            timesheet.id,
            timesheet.start_time,
            timesheet.end_time,
            timesheet.operating_hours,
            timesheet.standby_hours,
            timesheet.overtime_hours,
            timesheet.breakdown_hours,
            timesheet.hm_km_start,
            timesheet.hm_km_end,
            timesheet.hm_km_usage,
            timesheet.operation_status,
            timesheet.breakdown_reason,
            timesheet.work_description,
            timesheet.work_location,
            timesheet.photos,
            timesheet.checker_notes,
            timesheet.production_volume,
            timesheet.production_unit,
            timesheet.fuel_consumed_liters,
            now
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Submit timesheet for verification
    pub async fn submit_timesheet(
        &self,
        id: Uuid,
        checker_notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_timesheets 
            SET status = 'submitted', checker_notes = $2, checker_at = $3, updated_at = $3
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(checker_notes)
        .bind(now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Verify timesheet (by Verifier)
    pub async fn verify_timesheet(
        &self,
        id: Uuid,
        verifier_id: Uuid,
        status: &str,
        notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        let new_status = if status == "approved" {
            "verified"
        } else {
            status
        };
        sqlx::query(
            r#"UPDATE rental_timesheets 
            SET verifier_id = $2, verifier_at = $3, verifier_status = $4, 
                verifier_notes = $5, status = $6, updated_at = $3
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(verifier_id)
        .bind(now)
        .bind(status)
        .bind(notes)
        .bind(new_status)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Client PIC approval
    pub async fn client_approve_timesheet(
        &self,
        id: Uuid,
        client_pic_id: Uuid,
        signature: Option<String>,
        notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_timesheets 
            SET client_pic_id = $2, client_approved_at = $3, 
                client_signature = $4, client_notes = $5, status = 'approved', updated_at = $3
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(client_pic_id)
        .bind(now)
        .bind(signature)
        .bind(notes)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// List timesheets pending verification
    pub async fn list_pending_verification(
        &self,
    ) -> Result<Vec<TimesheetDetailResponse>, sqlx::Error> {
        sqlx::query_as!(
            TimesheetDetailResponse,
            r#"SELECT 
                ts.id, ts.rental_id, ts.rental_item_id, r.rental_number, a.name as asset_name, c.name as client_name,
                ts.work_date, ts.operating_hours as "operating_hours!", 
                ts.standby_hours as "standby_hours!", 
                ts.overtime_hours as "overtime_hours!", 
                ts.breakdown_hours as "breakdown_hours!",
                ts.hm_km_start, ts.hm_km_end, ts.hm_km_usage, ts.operation_status,
                ts.work_description, ts.photos, 
                ts.production_volume, ts.production_unit,
                ts.status as "status!", ts.checker_notes
            FROM rental_timesheets ts
            JOIN rentals r ON ts.rental_id = r.id
            JOIN rental_items ri ON ts.rental_item_id = ri.id
            JOIN assets a ON ri.asset_id = a.id
            JOIN clients c ON r.client_id = c.id
            WHERE ts.status = 'submitted'
            ORDER BY ts.work_date ASC"#
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Sum timesheets for billing period
    pub async fn sum_timesheets_for_period(
        &self,
        rental_id: Uuid,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<TimesheetSummaryRow, sqlx::Error> {
        sqlx::query_as!(
            TimesheetSummaryRow,
            r#"SELECT 
                COALESCE(SUM(operating_hours), 0) as "total_operating_hours!",
                COALESCE(SUM(standby_hours), 0) as "total_standby_hours!",
                COALESCE(SUM(overtime_hours), 0) as "total_overtime_hours!",
                COALESCE(SUM(breakdown_hours), 0) as "total_breakdown_hours!",
                COALESCE(SUM(hm_km_usage), 0) as "total_hm_km_usage!",
                COALESCE(SUM(production_volume), 0) as "total_production_volume!",
                COALESCE(SUM(fuel_consumed_liters), 0) as "total_fuel_consumed!",
                COUNT(*) as "working_days!"
            FROM rental_timesheets
            WHERE rental_id = $1 
                AND work_date >= $2 
                AND work_date <= $3
                AND status = 'approved'"#,
            rental_id,
            start_date,
            end_date
        )
        .fetch_one(&self.pool)
        .await
    }

    // ==================== BILLING PERIOD OPERATIONS ====================

    /// Create billing period
    pub async fn create_billing_period(
        &self,
        billing: &RentalBillingPeriod,
    ) -> Result<RentalBillingPeriod, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"INSERT INTO rental_billing_periods (
                id, rental_id, period_start, period_end, period_type, status,
                total_production_volume,
                total_fuel_consumed, fuel_surcharge_rate, fuel_surcharge_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *"#,
            billing.id,
            billing.rental_id,
            billing.period_start,
            billing.period_end,
            billing.period_type,
            billing.status,
            billing.total_production_volume,
            billing.total_fuel_consumed,
            billing.fuel_surcharge_rate,
            billing.fuel_surcharge_amount
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Get billing period by ID
    pub async fn find_billing_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"SELECT * FROM rental_billing_periods WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Update billing calculation
    pub async fn update_billing_calculation(
        &self,
        id: Uuid,
        billing: &RentalBillingPeriod,
        calculated_by: Uuid,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_billing_periods SET
                total_operating_hours = $2,
                total_standby_hours = $3,
                total_overtime_hours = $4,
                total_breakdown_hours = $5,
                total_hm_km_usage = $6,
                working_days = $7,
                rate_basis = $8,
                unit_rate = $9,
                minimum_hours = $10,
                overtime_multiplier = $11,
                standby_multiplier = $12,
                breakdown_penalty_per_day = $13,
                billable_hours = $14,
                shortfall_hours = $15,
                base_amount = $16,
                standby_amount = $17,
                overtime_amount = $18,
                breakdown_penalty_amount = $19,
                mobilization_fee = $20,
                demobilization_fee = $21,
                other_charges = $22,
                other_charges_description = $23,
                subtotal = $24,
                discount_percentage = $25,
                discount_amount = $26,
                tax_percentage = $27,
                tax_amount = $28,
                total_amount = $29,
                status = 'calculated',
                calculated_by = $30,
                calculated_at = $31,
                updated_at = $31,
                total_production_volume = $32,
                total_fuel_consumed = $33,
                fuel_surcharge_rate = $34,
                fuel_surcharge_amount = $35
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(billing.total_operating_hours)
        .bind(billing.total_standby_hours)
        .bind(billing.total_overtime_hours)
        .bind(billing.total_breakdown_hours)
        .bind(billing.total_hm_km_usage)
        .bind(billing.working_days)
        .bind(&billing.rate_basis)
        .bind(billing.unit_rate)
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
        .bind(calculated_by)
        .bind(now)
        .bind(billing.total_production_volume)
        .bind(billing.total_fuel_consumed)
        .bind(billing.fuel_surcharge_rate)
        .bind(billing.fuel_surcharge_amount)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Approve billing
    pub async fn approve_billing(
        &self,
        id: Uuid,
        approved_by: Uuid,
        notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_billing_periods 
            SET status = 'approved', approved_by = $2, approved_at = $3, notes = $4, updated_at = $3
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(approved_by)
        .bind(now)
        .bind(notes)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Generate invoice
    pub async fn generate_invoice(
        &self,
        id: Uuid,
        invoice_number: &str,
        due_date: NaiveDate,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        let invoice_date = now.date_naive();
        sqlx::query(
            r#"UPDATE rental_billing_periods 
            SET status = 'invoiced', invoice_number = $2, invoice_date = $3, due_date = $4, updated_at = $5
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(invoice_number)
        .bind(invoice_date)
        .bind(due_date)
        .bind(now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// List billing periods for rental
    pub async fn list_billing_by_rental(
        &self,
        rental_id: Uuid,
    ) -> Result<Vec<RentalBillingPeriod>, sqlx::Error> {
        sqlx::query_as!(
            RentalBillingPeriod,
            r#"SELECT * FROM rental_billing_periods 
            WHERE rental_id = $1 
            ORDER BY period_start DESC"#,
            rental_id
        )
        .fetch_all(&self.pool)
        .await
    }

    // ==================== CLIENT CONTACT OPERATIONS ====================

    /// Create client contact
    pub async fn create_client_contact(
        &self,
        contact: &ClientContact,
    ) -> Result<ClientContact, sqlx::Error> {
        sqlx::query_as!(
            ClientContact,
            r#"INSERT INTO client_contacts (
                id, client_id, name, position, email, phone,
                can_approve_timesheet, can_approve_billing, approval_limit,
                is_primary, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *"#,
            contact.id,
            contact.client_id,
            contact.name,
            contact.position,
            contact.email,
            contact.phone,
            contact.can_approve_timesheet,
            contact.can_approve_billing,
            contact.approval_limit,
            contact.is_primary,
            contact.is_active
        )
        .fetch_one(&self.pool)
        .await
    }

    /// List contacts for client
    pub async fn list_contacts_by_client(
        &self,
        client_id: Uuid,
    ) -> Result<Vec<ClientContact>, sqlx::Error> {
        sqlx::query_as!(
            ClientContact,
            r#"SELECT * FROM client_contacts WHERE client_id = $1 AND is_active = true ORDER BY is_primary DESC, name"#,
            client_id
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Get contact by ID
    pub async fn find_contact_by_id(&self, id: Uuid) -> Result<Option<ClientContact>, sqlx::Error> {
        sqlx::query_as!(
            ClientContact,
            r#"SELECT * FROM client_contacts WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }
}

/// Helper struct for timesheet summary query
#[derive(Debug)]
pub struct TimesheetSummaryRow {
    pub total_operating_hours: Decimal,
    pub total_standby_hours: Decimal,
    pub total_overtime_hours: Decimal,
    pub total_breakdown_hours: Decimal,
    pub total_hm_km_usage: Decimal,
    pub total_production_volume: Decimal,
    pub total_fuel_consumed: Decimal,
    pub working_days: i64,
}
