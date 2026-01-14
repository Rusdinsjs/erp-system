//! Rental Repository
//!
//! Data access layer for rental transactions and handovers.

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{Rental, RentalHandover, RentalRate};

#[derive(Clone)]
pub struct RentalRepository {
    pool: PgPool,
}

impl RentalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ==================== RENTAL CRUD ====================

    /// Create a new rental
    pub async fn create(&self, rental: &Rental) -> Result<Rental, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"
            INSERT INTO rentals (
                id, rental_number, asset_id, client_id, rental_rate_id, status,
                request_date, start_date, expected_end_date, actual_end_date,
                daily_rate, total_days, subtotal, deposit_amount, deposit_returned,
                penalty_amount, total_amount, requested_by, approved_by, approved_at,
                rejection_reason, dispatched_by, dispatched_at, returned_by, returned_at,
                agreement_document, delivery_note, invoice_number, notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
            )
            RETURNING *
            "#,
            rental.id,
            rental.rental_number,
            rental.asset_id,
            rental.client_id,
            rental.rental_rate_id,
            rental.status,
            rental.request_date,
            rental.start_date,
            rental.expected_end_date,
            rental.actual_end_date,
            rental.daily_rate,
            rental.total_days,
            rental.subtotal,
            rental.deposit_amount,
            rental.deposit_returned,
            rental.penalty_amount,
            rental.total_amount,
            rental.requested_by,
            rental.approved_by,
            rental.approved_at,
            rental.rejection_reason,
            rental.dispatched_by,
            rental.dispatched_at,
            rental.returned_by,
            rental.returned_at,
            rental.agreement_document,
            rental.delivery_note,
            rental.invoice_number,
            rental.notes,
            rental.created_at,
            rental.updated_at
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Find rental by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Rental>, sqlx::Error> {
        sqlx::query_as!(Rental, r#"SELECT * FROM rentals WHERE id = $1"#, id)
            .fetch_optional(&self.pool)
            .await
    }

    /// Find rental by rental number
    pub async fn find_by_number(&self, number: &str) -> Result<Option<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals WHERE rental_number = $1"#,
            number
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// List all rentals with pagination
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals ORDER BY created_at DESC LIMIT $1 OFFSET $2"#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List rentals by status
    pub async fn list_by_status(&self, status: &str) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals WHERE status = $1 ORDER BY created_at DESC"#,
            status
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List rentals by client
    pub async fn list_by_client(&self, client_id: Uuid) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals WHERE client_id = $1 ORDER BY created_at DESC"#,
            client_id
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List rentals by asset
    pub async fn list_by_asset(&self, asset_id: Uuid) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals WHERE asset_id = $1 ORDER BY created_at DESC"#,
            asset_id
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List pending rentals (waiting for approval)
    pub async fn list_pending(&self) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"SELECT * FROM rentals WHERE status = 'requested' ORDER BY created_at ASC"#
        )
        .fetch_all(&self.pool)
        .await
    }

    /// List overdue rentals
    pub async fn list_overdue(&self) -> Result<Vec<Rental>, sqlx::Error> {
        sqlx::query_as!(
            Rental,
            r#"
            SELECT * FROM rentals 
            WHERE status = 'rented_out' 
            AND expected_end_date < CURRENT_DATE
            ORDER BY expected_end_date ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Update rental status
    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"UPDATE rentals SET status = $2, updated_at = NOW() WHERE id = $1"#,
            id,
            status
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Approve rental
    pub async fn approve(
        &self,
        id: Uuid,
        approved_by: Uuid,
        start_date: NaiveDate,
        expected_end_date: NaiveDate,
        daily_rate: Decimal,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE rentals SET 
                status = 'approved',
                approved_by = $2,
                approved_at = NOW(),
                start_date = $3,
                expected_end_date = $4,
                daily_rate = $5,
                updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            approved_by,
            start_date,
            expected_end_date,
            daily_rate
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Reject rental
    pub async fn reject(&self, id: Uuid, reason: &str) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE rentals SET 
                status = 'rejected',
                rejection_reason = $2,
                updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            reason
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Dispatch rental (handover out)
    pub async fn dispatch(
        &self,
        id: Uuid,
        dispatched_by: Uuid,
        delivery_note: Option<String>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE rentals SET 
                status = 'rented_out',
                dispatched_by = $2,
                dispatched_at = NOW(),
                delivery_note = $3,
                updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            dispatched_by,
            delivery_note
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Return rental (handover in)
    pub async fn return_rental(
        &self,
        id: Uuid,
        returned_by: Uuid,
        actual_end_date: NaiveDate,
        total_days: i32,
        subtotal: Decimal,
        penalty_amount: Decimal,
        total_amount: Decimal,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            UPDATE rentals SET 
                status = 'returned',
                returned_by = $2,
                returned_at = NOW(),
                actual_end_date = $3,
                total_days = $4,
                subtotal = $5,
                penalty_amount = $6,
                total_amount = $7,
                updated_at = NOW()
            WHERE id = $1
            "#,
            id,
            returned_by,
            actual_end_date,
            total_days,
            subtotal,
            penalty_amount,
            total_amount
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Mark overdue rentals
    pub async fn mark_overdue(&self) -> Result<i64, sqlx::Error> {
        let result = sqlx::query!(
            r#"
            UPDATE rentals SET status = 'overdue', updated_at = NOW()
            WHERE status = 'rented_out' AND expected_end_date < CURRENT_DATE
            "#
        )
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() as i64)
    }

    // ==================== HANDOVER CRUD ====================

    /// Create handover record
    pub async fn create_handover(
        &self,
        handover: &RentalHandover,
    ) -> Result<RentalHandover, sqlx::Error> {
        sqlx::query_as!(
            RentalHandover,
            r#"
            INSERT INTO rental_handovers (
                id, rental_id, handover_type, condition_rating, condition_notes,
                photos, has_damage, damage_description, damage_photos,
                recorded_by, recorded_at, signature_data, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
            "#,
            handover.id,
            handover.rental_id,
            handover.handover_type,
            handover.condition_rating,
            handover.condition_notes,
            handover.photos,
            handover.has_damage,
            handover.damage_description,
            handover.damage_photos,
            handover.recorded_by,
            handover.recorded_at,
            handover.signature_data,
            handover.created_at
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Get handovers for a rental
    pub async fn get_handovers(&self, rental_id: Uuid) -> Result<Vec<RentalHandover>, sqlx::Error> {
        sqlx::query_as!(
            RentalHandover,
            r#"SELECT * FROM rental_handovers WHERE rental_id = $1 ORDER BY created_at"#,
            rental_id
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Get dispatch handover for a rental
    pub async fn get_dispatch_handover(
        &self,
        rental_id: Uuid,
    ) -> Result<Option<RentalHandover>, sqlx::Error> {
        sqlx::query_as!(
            RentalHandover,
            r#"SELECT * FROM rental_handovers WHERE rental_id = $1 AND handover_type = 'dispatch'"#,
            rental_id
        )
        .fetch_optional(&self.pool)
        .await
    }

    // ==================== RENTAL RATES ====================

    /// Create rental rate
    pub async fn create_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"
            INSERT INTO rental_rates (
                id, name, category_id, asset_id, rate_type, rate_amount, currency,
                minimum_duration, deposit_percentage, late_fee_per_day, is_active,
                rate_basis, minimum_hours, overtime_multiplier, standby_multiplier,
                breakdown_penalty_per_day, hours_per_day, days_per_month,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
            "#,
            rate.id,
            rate.name,
            rate.category_id,
            rate.asset_id,
            rate.rate_type,
            rate.rate_amount,
            rate.currency,
            rate.minimum_duration,
            rate.deposit_percentage,
            rate.late_fee_per_day,
            rate.is_active,
            rate.rate_basis,
            rate.minimum_hours,
            rate.overtime_multiplier,
            rate.standby_multiplier,
            rate.breakdown_penalty_per_day,
            rate.hours_per_day,
            rate.days_per_month,
            rate.created_at,
            rate.updated_at
        )
        .fetch_one(&self.pool)
        .await
    }

    /// List active rental rates
    pub async fn list_rates(&self) -> Result<Vec<RentalRate>, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"SELECT * FROM rental_rates WHERE is_active = true ORDER BY name"#
        )
        .fetch_all(&self.pool)
        .await
    }

    /// Find rate by category
    pub async fn find_rate_by_category(
        &self,
        category_id: Uuid,
    ) -> Result<Option<RentalRate>, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"SELECT * FROM rental_rates WHERE category_id = $1 AND is_active = true LIMIT 1"#,
            category_id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Find rate by asset
    pub async fn find_rate_by_asset(
        &self,
        asset_id: Uuid,
    ) -> Result<Option<RentalRate>, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"SELECT * FROM rental_rates WHERE asset_id = $1 AND is_active = true LIMIT 1"#,
            asset_id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Find rate by ID
    pub async fn find_rate_by_id(&self, id: Uuid) -> Result<Option<RentalRate>, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"SELECT * FROM rental_rates WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    /// Update rental rate
    pub async fn update_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        let now = Utc::now();
        sqlx::query_as!(
            RentalRate,
            r#"UPDATE rental_rates SET
                name = $2, rate_type = $3, rate_amount = $4, currency = $5,
                minimum_duration = $6, deposit_percentage = $7, late_fee_per_day = $8,
                rate_basis = $9, minimum_hours = $10, overtime_multiplier = $11,
                standby_multiplier = $12, breakdown_penalty_per_day = $13,
                hours_per_day = $14, days_per_month = $15, updated_at = $16,
                category_id = $17, asset_id = $18
            WHERE id = $1
            RETURNING *"#,
            rate.id,
            rate.name,
            rate.rate_type,
            rate.rate_amount,
            rate.currency,
            rate.minimum_duration,
            rate.deposit_percentage,
            rate.late_fee_per_day,
            rate.rate_basis,
            rate.minimum_hours,
            rate.overtime_multiplier,
            rate.standby_multiplier,
            rate.breakdown_penalty_per_day,
            rate.hours_per_day,
            rate.days_per_month,
            now,
            rate.category_id,
            rate.asset_id
        )
        .fetch_one(&self.pool)
        .await
    }

    /// Delete rental rate (soft delete)
    pub async fn delete_rate(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"UPDATE rental_rates SET is_active = false, updated_at = $2 WHERE id = $1"#,
            id,
            Utc::now()
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Count total rentals
    pub async fn count(&self) -> Result<i64, sqlx::Error> {
        let result = sqlx::query_scalar!(r#"SELECT COUNT(*) as "count!" FROM rentals"#)
            .fetch_one(&self.pool)
            .await?;
        Ok(result)
    }
}
