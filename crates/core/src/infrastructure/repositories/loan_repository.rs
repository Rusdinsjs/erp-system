//! Loan Repository

use chrono::NaiveDate;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Loan;

#[derive(Clone)]
pub struct LoanRepository {
    pool: PgPool,
}

impl LoanRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn find_by_number(&self, loan_number: &str) -> Result<Option<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.loan_number = $1
            "#,
        )
        .bind(loan_number)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            ORDER BY al.created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_borrower(&self, borrower_id: Uuid) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.borrower_id = $1
            ORDER BY al.created_at DESC
            "#,
        )
        .bind(borrower_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_employee(&self, employee_id: Uuid) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.employee_id = $1
            ORDER BY al.created_at DESC
            "#,
        )
        .bind(employee_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.asset_id = $1
            ORDER BY al.created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_overdue(&self) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.expected_return_date < CURRENT_DATE 
              AND al.actual_return_date IS NULL
              AND al.status NOT IN ('returned', 'lost', 'rejected')
            ORDER BY al.expected_return_date
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_pending_approval(&self) -> Result<Vec<Loan>, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            SELECT al.*, u.name as borrower_name, e.name as employee_name, a.name as asset_name
            FROM asset_loans al
            LEFT JOIN users u ON al.borrower_id = u.id
            LEFT JOIN employees e ON al.employee_id = e.id
            LEFT JOIN assets a ON al.asset_id = a.id
            WHERE al.status = 'requested'
            ORDER BY al.created_at ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(&self, loan: &Loan) -> Result<Loan, sqlx::Error> {
        sqlx::query_as::<_, Loan>(
            r#"
            INSERT INTO asset_loans (
                id, loan_number, asset_id, borrower_id, employee_id, approver_id,
                loan_date, expected_return_date, actual_return_date, status,
                condition_before, condition_after, damage_description, damage_photos,
                terms_accepted, agreement_document,
                deposit_amount, deposit_returned, penalty_amount, penalty_paid,
                checked_out_by, checked_in_by, check_out_photos, return_photos
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *
            "#
        )
        .bind(loan.id)
        .bind(&loan.loan_number)
        .bind(loan.asset_id)
        .bind(loan.borrower_id)
        .bind(loan.employee_id)
        .bind(loan.approver_id)
        .bind(loan.loan_date)
        .bind(loan.expected_return_date)
        .bind(loan.actual_return_date)
        .bind(&loan.status)
        .bind(&loan.condition_before)
        .bind(&loan.condition_after)
        .bind(&loan.damage_description)
        .bind(&loan.damage_photos)
        .bind(loan.terms_accepted)
        .bind(&loan.agreement_document)
        .bind(loan.deposit_amount)
        .bind(loan.deposit_returned)
        .bind(loan.penalty_amount)
        .bind(loan.penalty_paid)
        .bind(loan.checked_out_by)
        .bind(loan.checked_in_by)
        .bind(&loan.check_out_photos)
        .bind(&loan.return_photos)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<bool, sqlx::Error> {
        let result =
            sqlx::query("UPDATE asset_loans SET status = $2, updated_at = NOW() WHERE id = $1")
                .bind(id)
                .bind(status)
                .execute(&self.pool)
                .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn approve(&self, id: Uuid, approver_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE asset_loans 
            SET status = 'approved', approver_id = $2, updated_at = NOW() 
            WHERE id = $1 AND status = 'requested'
            "#,
        )
        .bind(id)
        .bind(approver_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn reject(&self, id: Uuid, reason: Option<&str>) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE asset_loans 
            SET status = 'rejected', damage_description = COALESCE($2, damage_description), updated_at = NOW() 
            WHERE id = $1 AND status = 'requested'
            "#,
        )
        .bind(id)
        .bind(reason)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn checkout(
        &self,
        id: Uuid,
        checked_out_by: Uuid,
        condition_before: &str,
        check_out_photos: Option<Vec<String>>,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE asset_loans 
            SET status = 'checked_out', checked_out_by = $2, condition_before = $3, 
                check_out_photos = $4, terms_accepted = true, updated_at = NOW() 
            WHERE id = $1 AND status = 'approved'
            "#,
        )
        .bind(id)
        .bind(checked_out_by)
        .bind(condition_before)
        .bind(check_out_photos)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn checkin(
        &self,
        id: Uuid,
        checked_in_by: Uuid,
        condition_after: &str,
        return_photos: Option<Vec<String>>,
        return_date: NaiveDate,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE asset_loans 
            SET status = 'returned', checked_in_by = $2, condition_after = $3, 
                return_photos = $4, actual_return_date = $5, updated_at = NOW() 
            WHERE id = $1 AND status IN ('checked_out', 'in_use', 'overdue')
            "#,
        )
        .bind(id)
        .bind(checked_in_by)
        .bind(condition_after)
        .bind(return_photos)
        .bind(return_date)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM asset_loans WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn get_analytics(&self) -> Result<LoanAnalyticsData, sqlx::Error> {
        // 1. Status Counts
        let status_counts = sqlx::query_as::<_, LoanStatusCount>(
            r#"
            SELECT status, COUNT(*) as count
            FROM asset_loans
            GROUP BY status
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        // 2. Active Loans vs Overdue
        let active_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM asset_loans WHERE status IN ('checked_out', 'in_use', 'overdue')",
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        let overdue_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM asset_loans WHERE expected_return_date < CURRENT_DATE AND actual_return_date IS NULL AND status NOT IN ('returned', 'cancelled', 'rejected')"
        )
        .fetch_one(&self.pool)
        .await
        .unwrap_or(0);

        // 3. Most Borrowed Assets (Top 5)
        let most_borrowed = sqlx::query_as::<_, MostBorrowedAsset>(
            r#"
            SELECT a.name as asset_name, COUNT(al.id) as loan_count
            FROM asset_loans al
            JOIN assets a ON al.asset_id = a.id
            GROUP BY a.name
            ORDER BY loan_count DESC
            LIMIT 5
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(LoanAnalyticsData {
            status_counts,
            active_loans: active_count,
            overdue_loans: overdue_count,
            most_borrowed,
        })
    }
}

// Analytics Structs
#[derive(sqlx::FromRow, serde::Serialize)]
pub struct LoanStatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(sqlx::FromRow, serde::Serialize)]
pub struct MostBorrowedAsset {
    pub asset_name: String,
    pub loan_count: i64,
}

#[derive(serde::Serialize)]
pub struct LoanAnalyticsData {
    pub status_counts: Vec<LoanStatusCount>,
    pub active_loans: i64,
    pub overdue_loans: i64,
    pub most_borrowed: Vec<MostBorrowedAsset>,
}
