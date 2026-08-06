use uuid::Uuid;

use crate::domain::entities::journal::{
    CreateJournalEntryRequest, JournalEntry, JournalEntryDetail,
};
use crate::repositories::{FinanceRepository, JournalRepository};
use management_system_core::domain::errors::{DomainError, DomainResult};

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

    pub async fn create_journal_entry(
        &self,
        transaction_number: String,
        req: CreateJournalEntryRequest,
        created_by: Option<Uuid>,
    ) -> DomainResult<JournalEntryDetail> {
        // Validate debits == credits
        let total_debit: rust_decimal::Decimal = req.lines.iter().map(|l| l.debit).sum();
        let total_credit: rust_decimal::Decimal = req.lines.iter().map(|l| l.credit).sum();

        if total_debit != total_credit {
            return Err(DomainError::business_rule(
                "UnbalancedJournalEntry",
                &format!(
                    "Total debit ({}) must equal total credit ({})",
                    total_debit, total_credit
                ),
            ));
        }

        if req.lines.is_empty() {
            return Err(DomainError::business_rule(
                "EmptyJournalEntry",
                "Journal entry must contain at least one line",
            ));
        }

        // Validate accounts exist
        for line in &req.lines {
            if self
                .finance_repo
                .find_by_id(line.account_id)
                .await?
                .is_none()
            {
                return Err(DomainError::not_found("ChartOfAccount", line.account_id));
            }
        }

        self.journal_repo
            .create_journal_entry(transaction_number, &req, created_by)
            .await
    }

    pub async fn get_journal_entry_detail(
        &self,
        id: Uuid,
    ) -> DomainResult<Option<JournalEntryDetail>> {
        self.journal_repo.get_journal_entry_detail(id).await
    }

    pub async fn list_journal_entries(&self) -> DomainResult<Vec<JournalEntry>> {
        self.journal_repo.list_journal_entries().await
    }

    pub async fn post_journal_entry(&self, id: Uuid) -> DomainResult<()> {
        let entry = self
            .journal_repo
            .get_journal_entry_detail(id)
            .await?
            .ok_or_else(|| DomainError::not_found("JournalEntry", id))?;

        // Re-validate debits == credits before posting
        let total_debit: rust_decimal::Decimal = entry.lines.iter().map(|l| l.debit).sum();
        let total_credit: rust_decimal::Decimal = entry.lines.iter().map(|l| l.credit).sum();

        if total_debit != total_credit {
            return Err(DomainError::business_rule(
                "UnbalancedJournalEntry",
                &format!(
                    "Cannot post unbalanced journal entry: debit ({}) != credit ({})",
                    total_debit, total_credit
                ),
            ));
        }

        if entry.lines.is_empty() {
            return Err(DomainError::business_rule(
                "EmptyJournalEntry",
                "Cannot post empty journal entry",
            ));
        }

        // Validate all accounts exist
        for line in &entry.lines {
            if self
                .finance_repo
                .find_by_id(line.account_id)
                .await?
                .is_none()
            {
                return Err(DomainError::not_found("ChartOfAccount", line.account_id));
            }
        }

        self.journal_repo
            .update_status(id, crate::domain::entities::journal::JournalStatus::Posted)
            .await
    }

    pub async fn unpost_journal_entry(&self, id: Uuid) -> DomainResult<()> {
        let entry = self
            .journal_repo
            .get_journal_entry_detail(id)
            .await?
            .ok_or_else(|| DomainError::not_found("JournalEntry", id))?;

        if entry.header.status == crate::domain::entities::journal::JournalStatus::Draft {
            return Err(DomainError::business_rule(
                "AlreadyDraft",
                "Journal entry is already in Draft status",
            ));
        }

        self.journal_repo
            .update_status(id, crate::domain::entities::journal::JournalStatus::Draft)
            .await
    }
}
