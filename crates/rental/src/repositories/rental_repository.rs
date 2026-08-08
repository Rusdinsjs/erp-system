//! Rental Repository
//!
//! Database operations for rentals and rental items.
//! Uses runtime queries (sqlx::query_as / sqlx::query) to avoid compile-time
//! schema validation that breaks when the DB schema drifts from checked-in
//! sqlx-data.json.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{Rental, RentalItem, RentalRate};

#[derive(Clone)]
pub struct RentalRepository {
    pool: PgPool,
}

impl RentalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get a reference to the underlying pool for ad-hoc queries
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ==================== RENTAL OPERATIONS ====================

    /// Create a new rental
    pub async fn create_rental(&self, rental: &Rental) -> Result<Rental, sqlx::Error> {
        let rec = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"INSERT INTO rentals (
                id, rental_number, client_id, status, request_date,
                start_date, expected_end_date, actual_end_date,
                subtotal, deposit_amount, deposit_returned, penalty_amount, total_amount,
                requested_by, approved_by, approved_at, rejection_reason,
                agreement_document, invoice_number, notes,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
            RETURNING *"#,
        )
        .bind(rental.id)
        .bind(&rental.rental_number)
        .bind(rental.client_id)
        .bind(&rental.status)
        .bind(rental.request_date)
        .bind(rental.start_date)
        .bind(rental.expected_end_date)
        .bind(rental.actual_end_date)
        .bind(rental.subtotal)
        .bind(rental.deposit_amount)
        .bind(rental.deposit_returned)
        .bind(rental.penalty_amount)
        .bind(rental.total_amount)
        .bind(rental.requested_by)
        .bind(rental.approved_by)
        .bind(rental.approved_at)
        .bind(&rental.rejection_reason)
        .bind(&rental.agreement_document)
        .bind(&rental.invoice_number)
        .bind(&rental.notes)
        .bind(rental.created_at)
        .bind(rental.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    /// Get rental by ID (with items)
    pub async fn find_rental_by_id(&self, id: Uuid) -> Result<Option<Rental>, sqlx::Error> {
        let mut rental = match sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"SELECT * FROM rentals WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        {
            Some(r) => r,
            None => return Ok(None),
        };

        // Fetch items
        let items = sqlx::query_as::<sqlx::Postgres, RentalItem>(
            r#"SELECT
                ri.*,
                a.name as asset_name,
                a.asset_code as asset_code
            FROM rental_items ri
            JOIN assets a ON ri.asset_id = a.id
            WHERE ri.rental_id = $1"#,
        )
        .bind(rental.id)
        .fetch_all(&self.pool)
        .await?;

        rental.items = Some(items);

        Ok(Some(rental))
    }

    /// Get all rentals (with basic filtering)
    pub async fn list_rentals(
        &self,
        status: Option<&str>,
        client_id: Option<Uuid>,
    ) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"SELECT * FROM rentals
            WHERE ($1::text IS NULL OR status = $1)
            AND ($2::uuid IS NULL OR client_id = $2)
            ORDER BY created_at DESC"#,
        )
        .bind(status)
        .bind(client_id)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for mut r in rentals {
            let items = sqlx::query_as::<sqlx::Postgres, RentalItem>(
                r#"SELECT
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1"#,
            )
            .bind(r.id)
            .fetch_all(&self.pool)
            .await?;
            r.items = Some(items);
            result.push(r);
        }

        Ok(result)
    }

    /// Update rental
    pub async fn update_rental(&self, rental: &Rental) -> Result<Rental, sqlx::Error> {
        let now = Utc::now();
        let rec = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"UPDATE rentals SET
                client_id = $2, status = $3,
                start_date = $4, expected_end_date = $5, actual_end_date = $6,
                subtotal = $7, deposit_amount = $8, deposit_returned = $9,
                penalty_amount = $10, total_amount = $11,
                approved_by = $12, approved_at = $13, rejection_reason = $14,
                agreement_document = $15, invoice_number = $16, notes = $17,
                updated_at = $18
            WHERE id = $1
            RETURNING *"#,
        )
        .bind(rental.id)
        .bind(rental.client_id)
        .bind(&rental.status)
        .bind(rental.start_date)
        .bind(rental.expected_end_date)
        .bind(rental.actual_end_date)
        .bind(rental.subtotal)
        .bind(rental.deposit_amount)
        .bind(rental.deposit_returned)
        .bind(rental.penalty_amount)
        .bind(rental.total_amount)
        .bind(rental.approved_by)
        .bind(rental.approved_at)
        .bind(&rental.rejection_reason)
        .bind(&rental.agreement_document)
        .bind(&rental.invoice_number)
        .bind(&rental.notes)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    /// Delete rental
    pub async fn delete_rental(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM rentals WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ==================== RENTAL ITEM OPERATIONS ====================

    /// Create a new rental item
    pub async fn create_rental_item(
        &self,
        item: &RentalItem,
    ) -> Result<RentalItem, sqlx::Error> {
        let rec = sqlx::query_as::<sqlx::Postgres, RentalItem>(
            r#"INSERT INTO rental_items (
                id, rental_id, asset_id, rental_rate_id,
                rate_amount, rate_basis, status,
                start_date, expected_end_date, actual_end_date,
                dispatched_by, dispatched_at, returned_by, returned_at,
                subtotal, penalty_amount, mob_demob_cost, is_fuel_included,
                notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            )
            RETURNING *, NULL::text as asset_name, NULL::text as asset_code"#,
        )
        .bind(item.id)
        .bind(item.rental_id)
        .bind(item.asset_id)
        .bind(item.rental_rate_id)
        .bind(item.rate_amount)
        .bind(&item.rate_basis)
        .bind(&item.status)
        .bind(item.start_date)
        .bind(item.expected_end_date)
        .bind(item.actual_end_date)
        .bind(item.dispatched_by)
        .bind(item.dispatched_at)
        .bind(item.returned_by)
        .bind(item.returned_at)
        .bind(item.subtotal)
        .bind(item.penalty_amount)
        .bind(item.mob_demob_cost)
        .bind(item.is_fuel_included)
        .bind(&item.notes)
        .bind(item.created_at)
        .bind(item.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    /// Update rental item
    pub async fn update_rental_item(
        &self,
        item: &RentalItem,
    ) -> Result<RentalItem, sqlx::Error> {
        let now = Utc::now();
        let rec = sqlx::query_as::<sqlx::Postgres, RentalItem>(
            r#"UPDATE rental_items SET
                asset_id = $2, rental_rate_id = $3,
                rate_amount = $4, rate_basis = $5, status = $6,
                start_date = $7, expected_end_date = $8, actual_end_date = $9,
                dispatched_by = $10, dispatched_at = $11,
                returned_by = $12, returned_at = $13,
                subtotal = $14, penalty_amount = $15, mob_demob_cost = $16,
                is_fuel_included = $17, notes = $18, updated_at = $19
            WHERE id = $1
            RETURNING *, NULL::text as asset_name, NULL::text as asset_code"#,
        )
        .bind(item.id)
        .bind(item.asset_id)
        .bind(item.rental_rate_id)
        .bind(item.rate_amount)
        .bind(&item.rate_basis)
        .bind(&item.status)
        .bind(item.start_date)
        .bind(item.expected_end_date)
        .bind(item.actual_end_date)
        .bind(item.dispatched_by)
        .bind(item.dispatched_at)
        .bind(item.returned_by)
        .bind(item.returned_at)
        .bind(item.subtotal)
        .bind(item.penalty_amount)
        .bind(item.mob_demob_cost)
        .bind(item.is_fuel_included)
        .bind(&item.notes)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(rec)
    }

    /// Complete a rental item (return asset)
    pub async fn complete_rental_item(
        &self,
        id: Uuid,
        actual_end_date: NaiveDate,
        _hm_km_end: Option<f64>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_items SET
                actual_end_date = $2, status = 'completed', updated_at = $3
            WHERE id = $1"#,
        )
        .bind(id)
        .bind(actual_end_date)
        .bind(now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Dispatch a rental item
    pub async fn dispatch_item(
        &self,
        rental_id: Uuid,
        item_id: Uuid,
        dispatched_by: Uuid,
        notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"UPDATE rental_items SET
                status = 'rented_out', dispatched_by = $3, dispatched_at = $4,
                notes = COALESCE($5, notes), start_date = CURRENT_DATE
            WHERE id = $2 AND rental_id = $1"#,
        )
        .bind(rental_id)
        .bind(item_id)
        .bind(dispatched_by)
        .bind(now)
        .bind(notes)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Find items active within a date range for Scheduler
    pub async fn find_items_in_range(
        &self,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<management_system_core::application::dto::RentalScheduleItem>, sqlx::Error> {
        sqlx::query_as::<sqlx::Postgres, management_system_core::application::dto::RentalScheduleItem>(
            r#"SELECT
                r.id as rental_id,
                ri.id as rental_item_id,
                r.rental_number,
                c.name as client_name,
                ri.asset_id,
                a.name as asset_name,
                a.asset_code,
                ri.start_date,
                ri.expected_end_date,
                ri.actual_end_date,
                ri.status
            FROM rental_items ri
            JOIN rentals r ON ri.rental_id = r.id
            JOIN assets a ON ri.asset_id = a.id
            JOIN clients c ON r.client_id = c.id
            WHERE
                ri.status NOT IN ('cancelled', 'rejected')
                AND (
                    ri.start_date <= $2
                    AND (
                        (ri.actual_end_date IS NOT NULL AND ri.actual_end_date >= $1)
                        OR
                        (ri.actual_end_date IS NULL AND ri.expected_end_date >= $1)
                    )
                )
            ORDER BY a.name ASC, ri.start_date ASC"#,
        )
        .bind(start)
        .bind(end)
        .fetch_all(&self.pool)
        .await
    }

    // ==================== ADDITIONAL METHODS ====================

    pub async fn approve_rental(
        &self,
        id: Uuid,
        approved_by: Uuid,
        approved_at: DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"UPDATE rentals SET status = 'approved', approved_by = $1, approved_at = $2 WHERE id = $3"#,
        )
        .bind(approved_by)
        .bind(approved_at)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn reject_rental(
        &self,
        id: Uuid,
        reason: Option<String>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"UPDATE rentals SET status = 'rejected', rejection_reason = $1 WHERE id = $2"#,
        )
        .bind(reason)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn return_item(
        &self,
        item_id: Uuid,
        returned_by: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"UPDATE rental_items SET returned_by = $1, returned_at = NOW(), actual_end_date = CURRENT_DATE WHERE id = $2"#,
        )
        .bind(returned_by)
        .bind(item_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_active_filtered(
        &self,
        _asset_id: Option<Uuid>,
        _location_id: Option<Uuid>,
    ) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"SELECT * FROM rentals WHERE status = 'rented_out'"#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rentals)
    }

    pub async fn list_pending(&self) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"SELECT * FROM rentals WHERE status = 'requested'"#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rentals)
    }

    pub async fn list_overdue(&self) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query_as::<sqlx::Postgres, Rental>(
            r#"SELECT * FROM rentals WHERE status = 'overdue'"#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rentals)
    }

    pub async fn list_rates(&self) -> Result<Vec<RentalRate>, sqlx::Error> {
        let rates = sqlx::query_as::<sqlx::Postgres, RentalRate>(
            r#"SELECT * FROM rental_rates ORDER BY name ASC"#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(rates)
    }

    pub async fn create_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        let rec = sqlx::query_as::<sqlx::Postgres, RentalRate>(
            r#"INSERT INTO rental_rates (
                id, name, category_id, asset_id, rate_type, rate_amount, currency,
                minimum_duration, deposit_percentage, ma_threshold, availability_penalty_multiplier,
                standby_multiplier, breakdown_penalty_per_day, hours_per_day, days_per_month,
                rate_basis, minimum_hours, overtime_multiplier, late_fee_per_day, fuel_surcharge_rate,
                tier_config, is_active, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
            ) RETURNING *"#,
        )
        .bind(rate.id).bind(&rate.name).bind(rate.category_id).bind(rate.asset_id)
        .bind(&rate.rate_type).bind(rate.rate_amount).bind(&rate.currency)
        .bind(rate.minimum_duration).bind(rate.deposit_percentage)
        .bind(rate.ma_threshold).bind(rate.availability_penalty_multiplier)
        .bind(rate.standby_multiplier).bind(rate.breakdown_penalty_per_day)
        .bind(rate.hours_per_day).bind(rate.days_per_month)
        .bind(&rate.rate_basis).bind(rate.minimum_hours).bind(rate.overtime_multiplier)
        .bind(rate.late_fee_per_day).bind(rate.fuel_surcharge_rate)
        .bind(&rate.tier_config).bind(rate.is_active)
        .bind(rate.created_at).bind(rate.updated_at)
        .fetch_one(&self.pool)
        .await?;
        Ok(rec)
    }

    pub async fn find_rate_by_id(&self, id: Uuid) -> Result<Option<RentalRate>, sqlx::Error> {
        let rate = sqlx::query_as::<sqlx::Postgres, RentalRate>(
            r#"SELECT * FROM rental_rates WHERE id = $1"#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(rate)
    }

    pub async fn update_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        let rec = sqlx::query_as::<sqlx::Postgres, RentalRate>(
            r#"UPDATE rental_rates SET
                name = $2, category_id = $3, asset_id = $4, rate_type = $5, rate_amount = $6, currency = $7,
                minimum_duration = $8, deposit_percentage = $9, ma_threshold = $10, availability_penalty_multiplier = $11,
                standby_multiplier = $12, breakdown_penalty_per_day = $13, hours_per_day = $14, days_per_month = $15,
                rate_basis = $16, minimum_hours = $17, overtime_multiplier = $18, late_fee_per_day = $19, fuel_surcharge_rate = $20,
                tier_config = $21, is_active = $22, updated_at = $23
            WHERE id = $1 RETURNING *"#,
        )
        .bind(rate.id).bind(&rate.name).bind(rate.category_id).bind(rate.asset_id)
        .bind(&rate.rate_type).bind(rate.rate_amount).bind(&rate.currency)
        .bind(rate.minimum_duration).bind(rate.deposit_percentage)
        .bind(rate.ma_threshold).bind(rate.availability_penalty_multiplier)
        .bind(rate.standby_multiplier).bind(rate.breakdown_penalty_per_day)
        .bind(rate.hours_per_day).bind(rate.days_per_month)
        .bind(&rate.rate_basis).bind(rate.minimum_hours).bind(rate.overtime_multiplier)
        .bind(rate.late_fee_per_day).bind(rate.fuel_surcharge_rate)
        .bind(&rate.tier_config).bind(rate.is_active).bind(rate.updated_at)
        .fetch_one(&self.pool)
        .await?;
        Ok(rec)
    }

    pub async fn delete_rate(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(r#"DELETE FROM rental_rates WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
