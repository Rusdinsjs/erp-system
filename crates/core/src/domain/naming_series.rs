//! Concurrency-safe Document Naming Series — QKRN-010
//!
//! Allocates sequential document numbers (e.g. `INV-2026-00001`) with
//! database-level atomicity, so concurrent document creation cannot produce
//! duplicate numbers within the same series.
//!
//! # How it works
//!
//! The `naming_series` table holds the current counter for each
//! `(entity_type, company_id, series_prefix)` combination.  The allocation
//! uses `UPDATE … RETURNING` with a row-level lock inside the active
//! `UnitOfWork` transaction, ensuring no two concurrent transactions receive
//! the same counter value.
//!
//! # Usage
//!
//! ```rust,ignore
//! let mut uow = UnitOfWork::begin(&pool).await?;
//! let doc_number = NamingSeriesService::next_number(
//!     &mut uow,
//!     "INVOICE",
//!     company_id,
//!     "INV",
//!     2026,
//! ).await?;
//! // doc_number == "INV-2026-00001" (or next in sequence)
//! ```

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;
use uuid::Uuid;

/// Service for allocating concurrency-safe, sequential document numbers.
pub struct NamingSeriesService;

impl NamingSeriesService {
    /// Allocate the next document number for a given entity/company/series.
    ///
    /// The result is formatted as `{prefix}-{year}-{counter:05}`,
    /// e.g. `INV-2026-00001`.
    ///
    /// The counter resets to 1 at the start of each calendar year.
    ///
    /// # Arguments
    /// - `uow`         — active unit-of-work transaction
    /// - `entity_type` — e.g. `"INVOICE"`, `"PURCHASE_ORDER"`
    /// - `company_id`  — company scope (series are per-company)
    /// - `prefix`      — short code, e.g. `"INV"`, `"PO"`, `"BL"`
    /// - `year`        — calendar year (use `Utc::now().year()`)
    pub async fn next_number(
        uow: &mut UnitOfWork,
        entity_type: &str,
        company_id: Uuid,
        prefix: &str,
        year: i32,
    ) -> DomainResult<String> {
        // Upsert the counter row and atomically increment it.
        // FOR UPDATE ensures no concurrent transaction reads the same counter.
        let row: (i64,) = sqlx::query_as(
            r#"
            INSERT INTO naming_series
                (entity_type, company_id, prefix, year, last_counter)
            VALUES ($1, $2, $3, $4, 1)
            ON CONFLICT (entity_type, company_id, prefix, year)
            DO UPDATE SET last_counter = naming_series.last_counter + 1
            RETURNING last_counter
            "#,
        )
        .bind(entity_type)
        .bind(company_id)
        .bind(prefix)
        .bind(year)
        .fetch_one(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let counter = row.0;
        Ok(format!("{prefix}-{year}-{counter:05}"))
    }

    /// Preview the *current* counter value without incrementing.
    ///
    /// Useful for display; not a guaranteed reservation.
    pub async fn current_counter(
        uow: &mut UnitOfWork,
        entity_type: &str,
        company_id: Uuid,
        prefix: &str,
        year: i32,
    ) -> DomainResult<i64> {
        let row: Option<(i64,)> = sqlx::query_as(
            "SELECT last_counter FROM naming_series \
             WHERE entity_type = $1 AND company_id = $2 AND prefix = $3 AND year = $4",
        )
        .bind(entity_type)
        .bind(company_id)
        .bind(prefix)
        .bind(year)
        .fetch_optional(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.map(|r| r.0).unwrap_or(0))
    }
}
