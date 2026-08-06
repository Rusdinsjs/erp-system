//! Naming Series Repository Implementation (QARC-005)
//!
//! Persistence service for allocating concurrency-safe sequential document numbers.

use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::database::UnitOfWork;
use uuid::Uuid;

/// Service for allocating concurrency-safe, sequential document numbers.
pub struct NamingSeriesService;

impl NamingSeriesService {
    /// Allocate the next document number for a given entity/company/series.
    ///
    /// Format: `{prefix}-{year}-{counter:05}` (e.g. `INV-2026-00001`).
    pub async fn next_number(
        uow: &mut UnitOfWork,
        entity_type: &str,
        company_id: Uuid,
        prefix: &str,
        year: i32,
    ) -> DomainResult<String> {
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

    /// Preview the current counter value without incrementing.
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
