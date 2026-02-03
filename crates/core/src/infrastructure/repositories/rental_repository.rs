//! Rental Repository
//!
//! Data access layer for rental transactions and handovers.
//! Refactored for Multi-Asset support.

use chrono::{NaiveDate, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::application::dto::RentalScheduleItem;
use crate::domain::entities::{Rental, RentalItem, RentalRate};

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

    /// Create a new rental (Header + Items)
    pub async fn create(&self, rental: &Rental) -> Result<Rental, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Insert Header
        sqlx::query!(
            r#"
            INSERT INTO rentals (
                id, rental_number, client_id, status,
                request_date, start_date, expected_end_date, actual_end_date,
                subtotal, deposit_amount, deposit_returned,
                penalty_amount, total_amount, requested_by, approved_by, approved_at,
                rejection_reason, agreement_document, invoice_number, notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, 
                $5, $6, $7, $8, 
                $9, $10, $11, 
                $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22
            )
            "#,
            rental.id,
            rental.rental_number,
            rental.client_id,
            rental.status,
            rental.request_date,
            rental.start_date,
            rental.expected_end_date,
            rental.actual_end_date,
            rental.subtotal,
            rental.deposit_amount,
            rental.deposit_returned,
            rental.penalty_amount,
            rental.total_amount,
            rental.requested_by,
            rental.approved_by,
            rental.approved_at,
            rental.rejection_reason,
            rental.agreement_document,
            rental.invoice_number,
            rental.notes,
            rental.created_at,
            rental.updated_at
        )
        .execute(&mut *tx)
        .await?;

        // 2. Insert Items matches items in the struct
        if let Some(items) = &rental.items {
            for item in items {
                sqlx::query!(
                    r#"
                    INSERT INTO rental_items (
                        id, rental_id, asset_id, rental_rate_id,
                        rate_amount, rate_basis, status,
                        start_date, expected_end_date, actual_end_date,
                        dispatched_by, dispatched_at, returned_by, returned_at,
                        subtotal, penalty_amount, notes, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6, $7,
                        $8, $9, $10,
                        $11, $12, $13, $14,
                        $15, $16, $17, $18, $19
                    )
                    "#,
                    item.id,
                    rental.id, // Ensure link to header
                    item.asset_id,
                    item.rental_rate_id,
                    item.rate_amount,
                    item.rate_basis,
                    item.status,
                    item.start_date,
                    item.expected_end_date,
                    item.actual_end_date,
                    item.dispatched_by,
                    item.dispatched_at,
                    item.returned_by,
                    item.returned_at,
                    item.subtotal,
                    item.penalty_amount,
                    item.notes,
                    item.created_at,
                    item.updated_at
                )
                .execute(&mut *tx)
                .await?;
            }
        }

        tx.commit().await?;

        // Return the object as passed (it already has new IDs)
        Ok(rental.clone())
    }

    /// Find rental by ID with Items populated
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Rental>, sqlx::Error> {
        // Fetch Header
        let rental = sqlx::query(
            r#"
            SELECT 
                r.*,
                c.name as client_name
            FROM rentals r
            JOIN clients c ON r.client_id = c.id
            WHERE r.id = $1
            "#,
        )
        .bind(id)
        .map(|row: sqlx::postgres::PgRow| {
            use sqlx::Row;
            Rental {
                id: row.get("id"),
                rental_number: row.get("rental_number"),
                client_id: row.get("client_id"),
                status: row.get("status"),
                request_date: row.get("request_date"),
                start_date: row.get("start_date"),
                expected_end_date: row.get("expected_end_date"),
                actual_end_date: row.get("actual_end_date"),
                subtotal: row.get("subtotal"),
                deposit_amount: row.get("deposit_amount"),
                deposit_returned: row.get("deposit_returned"),
                penalty_amount: row.get("penalty_amount"),
                total_amount: row.get("total_amount"),
                requested_by: row.get("requested_by"),
                approved_by: row.get("approved_by"),
                approved_at: row.get("approved_at"),
                rejection_reason: row.get("rejection_reason"),
                agreement_document: row.get("agreement_document"),
                invoice_number: row.get("invoice_number"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                items: Some(vec![]),
                client_name: row.get("client_name"),
            }
        })
        .fetch_optional(&self.pool)
        .await?;

        if let Some(mut r) = rental {
            // Fetch Items with Asset Details
            let items = sqlx::query_as!(
                RentalItem,
                r#"
                SELECT 
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1
                ORDER BY a.name
                "#,
                id
            )
            .fetch_all(&self.pool)
            .await?;

            r.items = Some(items);
            Ok(Some(r))
        } else {
            Ok(None)
        }
    }

    /// List active rentals (for list view)
    /// Optimizes by JSON aggregating items or just fetching headers if needed.
    /// Use search params later.
    pub async fn list_active(&self) -> Result<Vec<Rental>, sqlx::Error> {
        self.list_active_filtered(None, None).await
    }

    /// List active rentals with optional filtering by Asset ID (Operator) or Location ID (Checker)
    pub async fn list_active_filtered(
        &self, 
        asset_id: Option<Uuid>, 
        location_id: Option<Uuid>
    ) -> Result<Vec<Rental>, sqlx::Error> {
        // Logic using standard sqlx::query with branches to avoid dynamic binding complexity
        let rentals = if let Some(aid) = asset_id {
             sqlx::query(
                r#"
                SELECT DISTINCT
                    r.*, c.name as client_name
                FROM rentals r
                JOIN clients c ON r.client_id = c.id
                JOIN rental_items ri ON ri.rental_id = r.id
                WHERE r.status = 'rented_out' AND ri.asset_id = $1
                ORDER BY r.created_at DESC LIMIT 50
                "#
            )
            .bind(aid)
            .map(Self::map_rental_row)
            .fetch_all(&self.pool)
            .await?
        } else if let Some(lid) = location_id {
             sqlx::query(
                r#"
                SELECT DISTINCT
                    r.*, c.name as client_name
                FROM rentals r
                JOIN clients c ON r.client_id = c.id
                JOIN rental_items ri ON ri.rental_id = r.id
                JOIN assets a ON ri.asset_id = a.id
                WHERE r.status = 'rented_out' AND a.location_id = $1
                ORDER BY r.created_at DESC LIMIT 50
                "#
            )
            .bind(lid)
            .map(Self::map_rental_row)
            .fetch_all(&self.pool)
            .await?
        } else {
             // Default no filter
             sqlx::query(
                r#"
                SELECT 
                    r.*,
                    c.name as client_name
                FROM rentals r
                JOIN clients c ON r.client_id = c.id
                WHERE r.status = 'rented_out'
                ORDER BY r.created_at DESC
                LIMIT 50
                "#
            )
            .map(Self::map_rental_row)
            .fetch_all(&self.pool)
            .await?
        };

        // Populate items (N+1 efficiency trade-off accepted for simplicity here)
        // Note: We need a mutable rentals list.
        let mut result_rentals = rentals;
        
        for r in &mut result_rentals {
            let items = sqlx::query_as!(
                RentalItem,
                r#"
                SELECT 
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1
                "#,
                r.id
            )
            .fetch_all(&self.pool)
            .await?;
            r.items = Some(items);
        }

        Ok(result_rentals)
    }

    // Helper for mapping rows to Rental
    fn map_rental_row(row: sqlx::postgres::PgRow) -> Rental {
        use sqlx::Row;
        Rental {
            id: row.get("id"),
            rental_number: row.get("rental_number"),
            client_id: row.get("client_id"),
            status: row.get("status"),
            request_date: row.get("request_date"),
            start_date: row.get("start_date"),
            expected_end_date: row.get("expected_end_date"),
            actual_end_date: row.get("actual_end_date"),
            subtotal: row.get("subtotal"),
            deposit_amount: row.get("deposit_amount"),
            deposit_returned: row.get("deposit_returned"),
            penalty_amount: row.get("penalty_amount"),
            total_amount: row.get("total_amount"),
            requested_by: row.get("requested_by"),
            approved_by: row.get("approved_by"),
            approved_at: row.get("approved_at"),
            rejection_reason: row.get("rejection_reason"),
            agreement_document: row.get("agreement_document"),
            invoice_number: row.get("invoice_number"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            items: Some(vec![]),
            client_name: row.get("client_name"),
        }
    }

    /// Update rental header
    pub async fn update(&self, rental: &Rental) -> Result<Rental, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        sqlx::query!(
            r#"
            UPDATE rentals SET
                client_id = $1, status = $2,
                request_date = $3, start_date = $4, expected_end_date = $5, actual_end_date = $6,
                subtotal = $7, deposit_amount = $8, deposit_returned = $9,
                penalty_amount = $10, total_amount = $11, 
                approved_by = $12, approved_at = $13, rejection_reason = $14,
                agreement_document = $15, invoice_number = $16, notes = $17, updated_at = $18
            WHERE id = $19
            "#,
            rental.client_id,
            rental.status,
            rental.request_date,
            rental.start_date,
            rental.expected_end_date,
            rental.actual_end_date,
            rental.subtotal,
            rental.deposit_amount,
            rental.deposit_returned,
            rental.penalty_amount,
            rental.total_amount,
            rental.approved_by,
            rental.approved_at,
            rental.rejection_reason,
            rental.agreement_document,
            rental.invoice_number,
            rental.notes,
            rental.updated_at,
            rental.id
        )
        .execute(&mut *tx)
        .await?;

        // Note: does not update items loop here. Item updates usually happen via specific actions.
        // If we need to sync items, we'd need DTO logic in service.

        tx.commit().await?;

        // After update, fetch the updated rental
        // If not found, this is a data consistency issue
        self.find_by_id(rental.id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)
    }

    /// Approve Rental (and all items)
    pub async fn approve_rental(
        &self,
        id: Uuid,
        approved_by: Uuid,
        at: chrono::DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // Approve Header
        sqlx::query!(
            r#"
            UPDATE rentals 
            SET status = 'approved', approved_by = $1, approved_at = $2, updated_at = NOW()
            WHERE id = $3
            "#,
            approved_by,
            at,
            id
        )
        .execute(&mut *tx)
        .await?;

        // Approve All Items
        sqlx::query!(
            r#"
            UPDATE rental_items
            SET status = 'approved', updated_at = NOW()
            WHERE rental_id = $1
            "#,
            id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await
    }

    pub async fn reject_rental(&self, id: Uuid, reason: String) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        sqlx::query!(
            r#"UPDATE rentals SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2"#,
            reason, id
        ).execute(&mut *tx).await?;

        sqlx::query!(
            r#"UPDATE rental_items SET status = 'rejected', updated_at = NOW() WHERE rental_id = $1"#,
            id
        ).execute(&mut *tx).await?;

        tx.commit().await
    }

    // ==================== DISPATCH / RETURN (Item Level) ====================

    /// Dispatch a specific item
    pub async fn dispatch_item(
        &self,
        _rental_id: Uuid, // Redundant but kept for interface consistency
        item_id: Uuid,
        dispatched_by: Uuid,
        notes: Option<String>,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Get Item details (asset_id)
        let item = sqlx::query!("SELECT asset_id FROM rental_items WHERE id = $1", item_id)
            .fetch_one(&mut *tx)
            .await?;

        // 2. Update Item Status
        sqlx::query!(
            r#"
            UPDATE rental_items 
            SET status = 'rented_out', dispatched_by = $1, dispatched_at = NOW(), notes = $2, updated_at = NOW()
            WHERE id = $3
            "#,
            dispatched_by,
            notes,
            item_id
        )
        .execute(&mut *tx)
        .await?;

        // 3. Update Asset Status to 'Rented'
        sqlx::query!(
            "UPDATE assets SET status = 'Rented', updated_at = NOW() WHERE id = $1",
            item.asset_id
        )
        .execute(&mut *tx)
        .await?;

        // 4. Update Header Status to 'rented_out' IF it's not already
        // (Simplification: First item dispatch triggers header RentedOut)
        sqlx::query!(
            r#"
            UPDATE rentals 
            SET status = 'rented_out', updated_at = NOW()
            WHERE id = (SELECT rental_id FROM rental_items WHERE id = $1)
            AND status != 'rented_out'
            "#,
            item_id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await
    }

    /// Return a specific item
    pub async fn return_item(&self, item_id: Uuid, returned_by: Uuid) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        // 1. Get Asset ID
        let item = sqlx::query!(
            "SELECT asset_id, rental_id FROM rental_items WHERE id = $1",
            item_id
        )
        .fetch_one(&mut *tx)
        .await?;

        // 2. Update Item Status
        sqlx::query!(
            r#"
            UPDATE rental_items 
            SET status = 'returned', returned_by = $1, returned_at = NOW(), actual_end_date = CURRENT_DATE, updated_at = NOW()
            WHERE id = $2
            "#,
            returned_by,
            item_id
        )
        .execute(&mut *tx)
        .await?;

        // 3. Update Asset Status to 'Available' (or 'Inspection'? User flow says Available usually, unless Handover condition bad)
        // Let's set 'Available' for now.
        sqlx::query!(
            "UPDATE assets SET status = 'Available', updated_at = NOW() WHERE id = $1",
            item.asset_id
        )
        .execute(&mut *tx)
        .await?;

        // 4. Check if ALL items are returned. If so, update Header to 'returned'
        let pending = sqlx::query!(
            "SELECT COUNT(*) as count FROM rental_items WHERE rental_id = $1 AND status != 'returned'",
            item.rental_id
        )
        .fetch_one(&mut *tx)
        .await?;

        if pending.count.unwrap_or(0) == 0 {
            sqlx::query!(
                "UPDATE rentals SET status = 'returned', actual_end_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1",
                item.rental_id
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await
    }

    // ==================== RENTAL RATES ====================

    pub async fn create_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"
            INSERT INTO rental_rates (
                id, name, category_id, asset_id, rate_type, rate_amount, currency,
                minimum_duration, deposit_percentage, ma_threshold, availability_penalty_multiplier,
                rate_basis, minimum_hours, overtime_multiplier, standby_multiplier,
                breakdown_penalty_per_day, hours_per_day, days_per_month, late_fee_per_day, is_active,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
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
            rate.ma_threshold,
            rate.availability_penalty_multiplier,
            
            rate.rate_basis,
            rate.minimum_hours,
            rate.overtime_multiplier,
            rate.standby_multiplier,
            rate.breakdown_penalty_per_day,
            rate.hours_per_day,
            rate.days_per_month,
            rate.late_fee_per_day,
            rate.is_active,

            rate.created_at,
            rate.updated_at
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_rate(&self, rate: &RentalRate) -> Result<RentalRate, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            r#"
            UPDATE rental_rates SET
                name = $1, category_id = $2, asset_id = $3, rate_type = $4,
                rate_amount = $5, currency = $6, minimum_duration = $7,
                deposit_percentage = $8, ma_threshold = $9, availability_penalty_multiplier = $10,
                rate_basis = $11, minimum_hours = $12, overtime_multiplier = $13, standby_multiplier = $14,
                breakdown_penalty_per_day = $15, hours_per_day = $16, days_per_month = $17, late_fee_per_day = $18, is_active = $19,
                updated_at = $20
            WHERE id = $21
            RETURNING *
            "#,
            rate.name,
            rate.category_id,
            rate.asset_id,
            rate.rate_type,
            rate.rate_amount,
            rate.currency,
            rate.minimum_duration,
            rate.deposit_percentage,
            rate.ma_threshold,
            rate.availability_penalty_multiplier,
            
            rate.rate_basis,
            rate.minimum_hours,
            rate.overtime_multiplier,
            rate.standby_multiplier,
            rate.breakdown_penalty_per_day,
            rate.hours_per_day,
            rate.days_per_month,
            rate.late_fee_per_day,
            rate.is_active,

            rate.updated_at,
            rate.id
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn list_rates(&self) -> Result<Vec<RentalRate>, sqlx::Error> {
        sqlx::query_as!(
            RentalRate,
            "SELECT * FROM rental_rates ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn find_rate_by_id(&self, id: Uuid) -> Result<Option<RentalRate>, sqlx::Error> {
        sqlx::query_as!(RentalRate, "SELECT * FROM rental_rates WHERE id = $1", id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn delete_rate(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query!("DELETE FROM rental_rates WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ==================== LISTS ====================

    pub async fn list_pending(&self) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query(
            r#"
            SELECT r.*, c.name as client_name 
            FROM rentals r 
            JOIN clients c ON r.client_id = c.id
            WHERE r.status = 'requested' 
            ORDER BY r.created_at DESC
            "#,
        )
        .map(|row: sqlx::postgres::PgRow| {
            use sqlx::Row;
            Rental {
                id: row.get("id"),
                rental_number: row.get("rental_number"),
                client_id: row.get("client_id"),
                status: row.get("status"),
                request_date: row.get("request_date"),
                start_date: row.get::<Option<NaiveDate>, _>("start_date"), // Handle generic nulls if needed, or simple get
                expected_end_date: row.get("expected_end_date"),
                actual_end_date: row.get("actual_end_date"),
                subtotal: row.get("subtotal"),
                deposit_amount: row.get("deposit_amount"),
                deposit_returned: row.get("deposit_returned"),
                penalty_amount: row.get("penalty_amount"),
                total_amount: row.get("total_amount"),
                requested_by: row.get("requested_by"),
                approved_by: row.get("approved_by"),
                approved_at: row.get("approved_at"),
                rejection_reason: row.get("rejection_reason"),
                agreement_document: row.get("agreement_document"),
                invoice_number: row.get("invoice_number"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                items: Some(vec![]),
                client_name: row.get("client_name"),
            }
        })
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for mut r in rentals {
            let items = sqlx::query_as!(
                RentalItem,
                r#"
                SELECT 
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1
                "#,
                r.id
            )
            .fetch_all(&self.pool)
            .await?;
            r.items = Some(items);
            result.push(r);
        }
        Ok(result)
    }

    pub async fn list_overdue(&self) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query(
            r#"
            SELECT r.*, c.name as client_name
            FROM rentals r 
            JOIN clients c ON r.client_id = c.id
            WHERE r.status = 'rented_out' AND r.expected_end_date < CURRENT_DATE
            ORDER BY r.expected_end_date ASC
            "#,
        )
        .map(|row: sqlx::postgres::PgRow| {
            use sqlx::Row;
            Rental {
                id: row.get("id"),
                rental_number: row.get("rental_number"),
                client_id: row.get("client_id"),
                status: row.get("status"),
                request_date: row.get("request_date"),
                start_date: row.get("start_date"),
                expected_end_date: row.get("expected_end_date"),
                actual_end_date: row.get("actual_end_date"),
                subtotal: row.get("subtotal"),
                deposit_amount: row.get("deposit_amount"),
                deposit_returned: row.get("deposit_returned"),
                penalty_amount: row.get("penalty_amount"),
                total_amount: row.get("total_amount"),
                requested_by: row.get("requested_by"),
                approved_by: row.get("approved_by"),
                approved_at: row.get("approved_at"),
                rejection_reason: row.get("rejection_reason"),
                agreement_document: row.get("agreement_document"),
                invoice_number: row.get("invoice_number"),
                notes: row.get("notes"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
                items: Some(vec![]),
                client_name: row.get("client_name"),
            }
        })
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for mut r in rentals {
            let items = sqlx::query_as!(
                RentalItem,
                r#"
                SELECT 
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1
                "#,
                r.id
            )
            .fetch_all(&self.pool)
            .await?;
            r.items = Some(items);
            result.push(r);
        }
        Ok(result)
    }

    /// Find rentals linked to a specific contract
    pub async fn find_by_contract_id(&self, contract_id: Uuid) -> Result<Vec<Rental>, sqlx::Error> {
        let rentals = sqlx::query(
            r#"
            SELECT 
                r.*,
                c.name as client_name
            FROM rentals r
            JOIN clients c ON r.client_id = c.id
            WHERE r.contract_id = $1
            ORDER BY r.created_at DESC
            "#,
        )
        .bind(contract_id)
        .map(Self::map_rental_row)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for mut r in rentals {
            let items = sqlx::query_as!(
                RentalItem,
                r#"
                SELECT 
                    ri.*,
                    a.name as asset_name,
                    a.asset_code as asset_code
                FROM rental_items ri
                JOIN assets a ON ri.asset_id = a.id
                WHERE ri.rental_id = $1
                "#,
                r.id
            )
            .fetch_all(&self.pool)
            .await?;
            r.items = Some(items);
            result.push(r);
        }
        Ok(result)
    }

    /// Find items active within a date range for Scheduler
    pub async fn find_items_in_range(&self, start: NaiveDate, end: NaiveDate) -> Result<Vec<RentalScheduleItem>, sqlx::Error> {
        sqlx::query_as!(
            RentalScheduleItem,
            r#"
            SELECT 
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
            ORDER BY a.name ASC, ri.start_date ASC
            "#,
            start,
            end
        )
        .fetch_all(&self.pool)
        .await
    }
}
