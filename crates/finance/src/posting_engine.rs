use crate::domain::entities::gl_entry::{GLEntry, PostingInstruction};
use management_system_core::domain::errors::{DomainError, DomainResult};
use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

/// Centralized Accounting Posting Engine (QACC-004)
///
/// Ensures all general ledger postings adhere strictly to:
/// 1. Balance rule: Sum(Debit) == Sum(Credit)
/// 2. Chart of Accounts integrity: active, non-group (is_group = false), non-frozen
/// 3. Fiscal Year / Accounting Period rule: posting_date must be in an OPEN period
/// 4. Immutability: Writes gl_entries inside an atomic UnitOfWork transaction
#[derive(Clone)]
pub struct AccountingPostingEngine {
    pool: PgPool,
}

impl AccountingPostingEngine {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Validate a posting instruction against accounting rules (QACC-001, QACC-002, QACC-004)
    pub async fn validate_instruction(&self, instruction: &PostingInstruction) -> DomainResult<()> {
        if instruction.lines.is_empty() {
            return Err(DomainError::business_rule(
                "EmptyPostingInstruction",
                "Posting instruction must contain at least one line",
            ));
        }

        // 1. Balance check: Sum(Debit) == Sum(Credit) (QACC-004)
        let total_debit: Decimal = instruction.lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = instruction.lines.iter().map(|l| l.credit).sum();

        if total_debit != total_credit {
            return Err(DomainError::business_rule(
                "UnbalancedPostingInstruction",
                &format!(
                    "Total debit ({}) must equal total credit ({})",
                    total_debit, total_credit
                ),
            ));
        }

        // 2. Fiscal Period Check (QACC-002)
        // If an accounting period exists for posting_date, ensure it is NOT closed.
        let closed_period: Option<bool> = sqlx::query_scalar(
            r#"
            SELECT ap.is_closed
            FROM accounting_periods ap
            JOIN fiscal_years fy ON ap.fiscal_year_id = fy.id
            WHERE fy.company_id = $1 AND $2 BETWEEN ap.start_date AND ap.end_date
            "#,
        )
        .bind(instruction.company_id)
        .bind(instruction.posting_date)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e.to_string()))?;

        if let Some(true) = closed_period {
            return Err(DomainError::business_rule(
                "ClosedAccountingPeriod",
                &format!(
                    "Posting date {} falls into a closed accounting period",
                    instruction.posting_date
                ),
            ));
        }

        // 3. COA Validation (QACC-001)
        for line in &instruction.lines {
            let account: Option<(bool, bool, bool)> = sqlx::query_as(
                "SELECT is_active, COALESCE(is_group, FALSE), COALESCE(is_frozen, FALSE) FROM chart_of_accounts WHERE id = $1",
            )
            .bind(line.account_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            match account {
                None => {
                    return Err(DomainError::not_found("ChartOfAccount", line.account_id));
                }
                Some((false, _, _)) => {
                    return Err(DomainError::business_rule(
                        "InactiveAccount",
                        &format!("Account {} is inactive", line.account_id),
                    ));
                }
                Some((_, true, _)) => {
                    return Err(DomainError::business_rule(
                        "GroupAccountPostingDenied",
                        &format!("Cannot post directly to group account {}", line.account_id),
                    ));
                }
                Some((_, _, true)) => {
                    return Err(DomainError::business_rule(
                        "FrozenAccountPostingDenied",
                        &format!("Account {} is frozen", line.account_id),
                    ));
                }
                Some((true, false, false)) => {}
            }
        }

        Ok(())
    }

    /// Execute posting atomically inside an existing UnitOfWork / Transaction (QACC-004)
    pub async fn post_in_uow(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        instruction: &PostingInstruction,
    ) -> DomainResult<Vec<GLEntry>> {
        self.validate_instruction(instruction).await?;

        let mut entries = Vec::new();

        for line in &instruction.lines {
            let currency = line.currency.clone().unwrap_or_else(|| "IDR".to_string());
            let rate = line.exchange_rate.unwrap_or_else(|| Decimal::from(1));
            let debit_acc = line.debit * rate;
            let credit_acc = line.credit * rate;

            let row: (
                Uuid,
                chrono::DateTime<chrono::Utc>,
                chrono::DateTime<chrono::Utc>,
            ) = sqlx::query_as(
                r#"
                INSERT INTO gl_entries (
                    company_id, posting_date, account_id, party_type, party_id,
                    cost_center_id, project_id, currency, exchange_rate,
                    debit, credit, debit_in_account_currency, credit_in_account_currency,
                    voucher_type, voucher_no, voucher_id, is_reversal, reversal_source_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, FALSE, NULL, $17)
                RETURNING id, posting_datetime, created_at
                "#,
            )
            .bind(instruction.company_id)
            .bind(instruction.posting_date)
            .bind(line.account_id)
            .bind(&line.party_type)
            .bind(line.party_id)
            .bind(line.cost_center_id)
            .bind(line.project_id)
            .bind(&currency)
            .bind(rate)
            .bind(line.debit)
            .bind(line.credit)
            .bind(debit_acc)
            .bind(credit_acc)
            .bind(&instruction.voucher_type)
            .bind(&instruction.voucher_no)
            .bind(instruction.voucher_id)
            .bind(instruction.created_by)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            entries.push(GLEntry {
                id: row.0,
                company_id: instruction.company_id,
                posting_date: instruction.posting_date,
                posting_datetime: row.1,
                account_id: line.account_id,
                party_type: line.party_type.clone(),
                party_id: line.party_id,
                cost_center_id: line.cost_center_id,
                project_id: line.project_id,
                currency,
                exchange_rate: rate,
                debit: line.debit,
                credit: line.credit,
                debit_in_account_currency: debit_acc,
                credit_in_account_currency: credit_acc,
                voucher_type: instruction.voucher_type.clone(),
                voucher_no: instruction.voucher_no.clone(),
                voucher_id: instruction.voucher_id,
                is_reversal: false,
                reversal_source_id: None,
                created_at: row.2,
                created_by: instruction.created_by,
            });
        }

        Ok(entries)
    }

    /// Create exact reversing GL entries for a voucher (QACC-005)
    pub async fn reverse_voucher_in_uow(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        company_id: Uuid,
        voucher_type: &str,
        voucher_id: Uuid,
        reversal_date: chrono::NaiveDate,
        created_by: Option<Uuid>,
    ) -> DomainResult<Vec<GLEntry>> {
        let originals: Vec<GLEntry> = sqlx::query_as!(
            GLEntry,
            r#"
            SELECT
                id, company_id, posting_date, posting_datetime, account_id,
                party_type, party_id, cost_center_id, project_id, currency,
                exchange_rate, debit, credit, debit_in_account_currency,
                credit_in_account_currency, voucher_type, voucher_no, voucher_id,
                is_reversal, reversal_source_id, created_at, created_by
            FROM gl_entries
            WHERE company_id = $1 AND voucher_type = $2 AND voucher_id = $3 AND is_reversal = FALSE
            "#,
            company_id,
            voucher_type,
            voucher_id
        )
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| DomainError::internal(e.to_string()))?;

        if originals.is_empty() {
            return Err(DomainError::business_rule(
                "NoGLEntriesToReverse",
                &format!("No original GL entries found for voucher {}", voucher_id),
            ));
        }

        let mut reversals = Vec::new();
        for orig in originals {
            let rev_debit = orig.credit;
            let rev_credit = orig.debit;
            let rev_debit_acc = orig.credit_in_account_currency;
            let rev_credit_acc = orig.debit_in_account_currency;
            let rev_voucher_no = format!("{}-REV", orig.voucher_no);

            let row: (
                Uuid,
                chrono::DateTime<chrono::Utc>,
                chrono::DateTime<chrono::Utc>,
            ) = sqlx::query_as(
                r#"
                INSERT INTO gl_entries (
                    company_id, posting_date, account_id, party_type, party_id,
                    cost_center_id, project_id, currency, exchange_rate,
                    debit, credit, debit_in_account_currency, credit_in_account_currency,
                    voucher_type, voucher_no, voucher_id, is_reversal, reversal_source_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, $17, $18)
                RETURNING id, posting_datetime, created_at
                "#,
            )
            .bind(orig.company_id)
            .bind(reversal_date)
            .bind(orig.account_id)
            .bind(&orig.party_type)
            .bind(orig.party_id)
            .bind(orig.cost_center_id)
            .bind(orig.project_id)
            .bind(&orig.currency)
            .bind(orig.exchange_rate)
            .bind(rev_debit)
            .bind(rev_credit)
            .bind(rev_debit_acc)
            .bind(rev_credit_acc)
            .bind(&orig.voucher_type)
            .bind(&rev_voucher_no)
            .bind(orig.voucher_id)
            .bind(orig.id)
            .bind(created_by)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

            reversals.push(GLEntry {
                id: row.0,
                company_id: orig.company_id,
                posting_date: reversal_date,
                posting_datetime: row.1,
                account_id: orig.account_id,
                party_type: orig.party_type,
                party_id: orig.party_id,
                cost_center_id: orig.cost_center_id,
                project_id: orig.project_id,
                currency: orig.currency,
                exchange_rate: orig.exchange_rate,
                debit: rev_debit,
                credit: rev_credit,
                debit_in_account_currency: rev_debit_acc,
                credit_in_account_currency: rev_credit_acc,
                voucher_type: orig.voucher_type,
                voucher_no: rev_voucher_no,
                voucher_id: orig.voucher_id,
                is_reversal: true,
                reversal_source_id: Some(orig.id),
                created_at: row.2,
                created_by,
            });
        }

        Ok(reversals)
    }
}
