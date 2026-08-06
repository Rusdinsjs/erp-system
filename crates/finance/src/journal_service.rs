use rust_decimal::Decimal;
use uuid::Uuid;

use crate::repositories::FinanceRepository;
use management_system_core::domain::entities::journal::{
    CreateJournalEntryRequest, JournalEntry, JournalEntryDetail,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::repositories::JournalRepository;

#[derive(Clone)]
pub struct JournalService {
    journal_repo: JournalRepository,
    finance_repo: FinanceRepository,
}

impl JournalService {
    pub fn new(journal_repo: JournalRepository, finance_repo: FinanceRepository) -> Self {
        Self {
            journal_repo,
            finance_repo,
        }
    }

    pub async fn create_entry(
        &self,
        req: CreateJournalEntryRequest,
        user_id: Option<Uuid>,
    ) -> DomainResult<JournalEntryDetail> {
        // 1. Validate: Total Debit == Total Credit
        let mut total_debit = Decimal::ZERO;
        let mut total_credit = Decimal::ZERO;

        for line in &req.lines {
            total_debit += line.debit;
            total_credit += line.credit;

            // Validate negative amounts
            if line.debit < Decimal::ZERO || line.credit < Decimal::ZERO {
                return Err(DomainError::business_rule(
                    "Positive Amounts",
                    "Debit and Credit amounts must be non-negative",
                ));
            }

            // Validate at least one side
            if line.debit.is_zero() && line.credit.is_zero() {
                return Err(DomainError::business_rule(
                    "Zero Line",
                    "Journal line must have either debit or credit amount",
                ));
            }

            // Validate one side only (optional but good practice)
            if !line.debit.is_zero() && !line.credit.is_zero() {
                return Err(DomainError::business_rule(
                    "Split Line",
                    "Journal line cannot have both debit and credit amounts",
                ));
            }

            // Validate Account Exists
            if self
                .finance_repo
                .find_by_id(line.account_id)
                .await?
                .is_none()
            {
                return Err(DomainError::not_found("ChartOfAccount", line.account_id));
            }
        }

        if total_debit != total_credit {
            return Err(DomainError::business_rule(
                "Double Entry",
                &format!(
                    "Total Debit ({}) does not equal Total Credit ({})",
                    total_debit, total_credit
                ),
            ));
        }

        if total_debit.is_zero() {
            return Err(DomainError::business_rule(
                "Zero Entry",
                "Total transaction amount cannot be zero",
            ));
        }

        // 2. Generate Transaction Number
        let transaction_number = self.journal_repo.get_next_sequence_number(req.date).await?;

        // 3. Create Entry
        let entry = self
            .journal_repo
            .create_journal_entry(transaction_number, &req, user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        Ok(entry)
    }

    pub async fn create_entry_with_uow(
        &self,
        uow: &mut management_system_core::infrastructure::database::UnitOfWork,
        req: CreateJournalEntryRequest,
        user_id: Option<Uuid>,
    ) -> DomainResult<JournalEntryDetail> {
        let mut total_debit = Decimal::ZERO;
        let mut total_credit = Decimal::ZERO;

        for line in &req.lines {
            total_debit += line.debit;
            total_credit += line.credit;

            if line.debit < Decimal::ZERO || line.credit < Decimal::ZERO {
                return Err(DomainError::business_rule(
                    "Positive Amounts",
                    "Debit and Credit amounts must be non-negative",
                ));
            }

            if line.debit.is_zero() && line.credit.is_zero() {
                return Err(DomainError::business_rule(
                    "Zero Line",
                    "Journal line must have either debit or credit amount",
                ));
            }

            if !line.debit.is_zero() && !line.credit.is_zero() {
                return Err(DomainError::business_rule(
                    "Split Line",
                    "Journal line cannot have both debit and credit amounts",
                ));
            }

            if self
                .finance_repo
                .find_by_id(line.account_id)
                .await?
                .is_none()
            {
                return Err(DomainError::not_found("ChartOfAccount", line.account_id));
            }
        }

        if total_debit != total_credit {
            return Err(DomainError::business_rule(
                "Double Entry",
                &format!(
                    "Total Debit ({}) does not equal Total Credit ({})",
                    total_debit, total_credit
                ),
            ));
        }

        if total_debit.is_zero() {
            return Err(DomainError::business_rule(
                "Zero Entry",
                "Total transaction amount cannot be zero",
            ));
        }

        let transaction_number = self.journal_repo.get_next_sequence_number(req.date).await?;

        let entry = self
            .journal_repo
            .create_journal_entry_with_uow(uow, transaction_number, &req, user_id)
            .await?;

        Ok(entry)
    }

    pub async fn list(&self, limit: i64, offset: i64) -> DomainResult<Vec<JournalEntry>> {
        self.journal_repo.list(limit, offset).await
    }

    pub async fn get_details(&self, id: Uuid) -> DomainResult<JournalEntryDetail> {
        self.journal_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("JournalEntry", id))
    }
}
