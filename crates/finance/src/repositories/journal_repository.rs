use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::entities::journal::{
    CreateJournalEntryRequest, JournalEntry, JournalEntryDetail, JournalLine, JournalStatus,
};
use management_system_core::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct JournalRepository {
    pool: PgPool,
}

impl JournalRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_journal_entry(
        &self,
        transaction_number: String,
        req: &CreateJournalEntryRequest,
        created_by: Option<Uuid>,
    ) -> DomainResult<JournalEntryDetail> {
        // Start transaction
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        // 1. Insert Header
        let header = sqlx::query_as!(
            JournalEntry,
            r#"
            INSERT INTO journal_entries (
                transaction_number, date, description, reference, status, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING 
                id, transaction_number, date, description, reference, 
                status as "status: JournalStatus", 
                created_by, created_at, updated_at
            "#,
            transaction_number,
            req.date,
            req.description,
            req.reference,
            JournalStatus::Draft as JournalStatus,
            created_by
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        // 2. Insert Lines
        let mut lines = Vec::new();
        for line_req in &req.lines {
            let line = sqlx::query_as!(
                JournalLine,
                r#"
                INSERT INTO journal_lines (
                    journal_entry_id, account_id, description, debit, credit
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, journal_entry_id, account_id, description, debit, credit
                "#,
                header.id,
                line_req.account_id,
                line_req.description,
                line_req.debit,
                line_req.credit
            )
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
            lines.push(line);
        }

        // Commit transaction
        tx.commit()
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(JournalEntryDetail { header, lines })
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<JournalEntryDetail>> {
        let header = sqlx::query_as!(
            JournalEntry,
            r#"
            SELECT 
                id, transaction_number, date, description, reference, 
                status as "status: JournalStatus", 
                created_by, created_at, updated_at
            FROM journal_entries
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        if let Some(h) = header {
            let lines = sqlx::query_as!(
                JournalLine,
                r#"
                SELECT id, journal_entry_id, account_id, description, debit, credit
                FROM journal_lines
                WHERE journal_entry_id = $1
                ORDER BY debit DESC, credit ASC
                "#,
                h.id
            )
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            Ok(Some(JournalEntryDetail { header: h, lines }))
        } else {
            Ok(None)
        }
    }

    pub async fn list(&self, limit: i64, offset: i64) -> DomainResult<Vec<JournalEntry>> {
        let recs = sqlx::query_as!(
            JournalEntry,
            r#"
            SELECT 
                id, transaction_number, date, description, reference, 
                status as "status: JournalStatus", 
                created_by, created_at, updated_at
            FROM journal_entries
            ORDER BY date DESC, created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    // Utility to generate transaction number (simple approach for now)
    // Format: JE-YYYYMM-XXXX
    pub async fn get_next_sequence_number(&self, date: chrono::NaiveDate) -> DomainResult<String> {
        let prefix = format!("JE-{}", date.format("%Y%m"));
        // Get the highest sequence number for this prefix
        let last_entry = sqlx::query!(
            r#"
            SELECT transaction_number FROM journal_entries 
            WHERE transaction_number LIKE $1 || '-%'
            ORDER BY transaction_number DESC 
            LIMIT 1
            "#,
            prefix
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let next_seq = if let Some(rec) = last_entry {
            let parts: Vec<&str> = rec.transaction_number.split('-').collect();
            if parts.len() >= 3 {
                // Try to parse the last part as a number
                if let Some(last_part) = parts.last() {
                    if let Ok(num) = last_part.parse::<i32>() {
                        num + 1
                    } else {
                        1
                    }
                } else {
                    1
                }
            } else {
                1
            }
        } else {
            1
        };

        Ok(format!("{}-{:04}", prefix, next_seq))
    }
}
