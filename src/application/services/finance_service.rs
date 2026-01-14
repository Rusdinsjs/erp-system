use chrono::Utc;
use uuid::Uuid;

use crate::domain::entities::{
    AccountTreeNode, ChartOfAccount, CreateAccountRequest, FinancialReportEntry,
    GeneralLedgerEntry, TrialBalanceEntry, UpdateAccountRequest,
};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::FinanceRepository;

#[derive(Clone)]
pub struct FinanceService {
    repo: FinanceRepository,
}

impl FinanceService {
    pub fn new(repo: FinanceRepository) -> Self {
        Self { repo }
    }

    pub async fn create_account(&self, req: CreateAccountRequest) -> DomainResult<ChartOfAccount> {
        // TODO: Validate code uniqueness if not handled by unique constraint (it is handled by DB)
        // TODO: specific business rules (e.g. format of code)

        let account = ChartOfAccount {
            id: Uuid::new_v4(),
            code: req.code,
            name: req.name,
            account_type: req.account_type,
            normal_balance: req.normal_balance,
            parent_id: req.parent_id,
            is_active: true,
            description: req.description,
            currency: req.currency.unwrap_or_else(|| "IDR".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.repo
            .create_account(&account)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_all(&self) -> DomainResult<Vec<ChartOfAccount>> {
        self.repo
            .list_all()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_tree(&self) -> DomainResult<Vec<AccountTreeNode>> {
        let all_accounts = self.list_all().await?;
        Ok(self.build_tree(&all_accounts, None))
    }

    fn build_tree(
        &self,
        accounts: &[ChartOfAccount],
        parent_id: Option<Uuid>,
    ) -> Vec<AccountTreeNode> {
        let mut nodes = Vec::new();

        for acc in accounts {
            if acc.parent_id == parent_id {
                let children = self.build_tree(accounts, Some(acc.id));
                nodes.push(AccountTreeNode {
                    id: acc.id,
                    code: acc.code.clone(),
                    name: acc.name.clone(),
                    account_type: acc.account_type,
                    normal_balance: acc.normal_balance,
                    is_active: acc.is_active,
                    currency: acc.currency.clone(),
                    children,
                });
            }
        }

        // Sort by code just to be safe, though Repo already sorts
        nodes.sort_by(|a, b| a.code.cmp(&b.code));
        nodes
    }

    pub async fn update_account(
        &self,
        id: Uuid,
        req: UpdateAccountRequest,
    ) -> DomainResult<ChartOfAccount> {
        let updated = self
            .repo
            .update_account(id, req.name, req.parent_id, req.is_active, req.description)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        updated.ok_or_else(|| DomainError::not_found("ChartOfAccount", id))
    }

    pub async fn get_general_ledger(
        &self,
        account_id: Uuid,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<GeneralLedgerEntry>> {
        self.repo
            .get_general_ledger(account_id, start_date, end_date)
            .await
    }

    pub async fn get_trial_balance(&self) -> DomainResult<Vec<TrialBalanceEntry>> {
        self.repo.get_trial_balance().await
    }

    pub async fn get_balance_sheet(&self) -> DomainResult<Vec<FinancialReportEntry>> {
        let trial_balance = self.get_trial_balance().await?;

        let entries = trial_balance
            .into_iter()
            .filter(|e| {
                matches!(
                    e.account_type,
                    crate::domain::entities::AccountType::Asset
                        | crate::domain::entities::AccountType::Liability
                        | crate::domain::entities::AccountType::Equity
                )
            })
            .map(|e| {
                // Balance calculation based on account type
                let balance = match e.account_type {
                    crate::domain::entities::AccountType::Asset => e.debit - e.credit,
                    crate::domain::entities::AccountType::Liability
                    | crate::domain::entities::AccountType::Equity => e.credit - e.debit,
                    _ => 0.0,
                };
                FinancialReportEntry {
                    account_code: e.account_code,
                    account_name: e.account_name,
                    balance,
                }
            })
            .collect();

        Ok(entries)
    }

    pub async fn get_income_statement(&self) -> DomainResult<Vec<FinancialReportEntry>> {
        let trial_balance = self.get_trial_balance().await?;

        let entries = trial_balance
            .into_iter()
            .filter(|e| {
                matches!(
                    e.account_type,
                    crate::domain::entities::AccountType::Revenue
                        | crate::domain::entities::AccountType::Expense
                )
            })
            .map(|e| {
                let balance = match e.account_type {
                    crate::domain::entities::AccountType::Revenue => e.credit - e.debit,
                    crate::domain::entities::AccountType::Expense => e.debit - e.credit,
                    _ => 0.0,
                };
                FinancialReportEntry {
                    account_code: e.account_code,
                    account_name: e.account_name,
                    balance,
                }
            })
            .collect();

        Ok(entries)
    }

    // --- Operational Finance ---

    pub async fn list_sales_invoices(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::SalesInvoice>> {
        self.repo.list_sales_invoices().await
    }

    pub async fn list_purchase_bills(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::PurchaseBill>> {
        self.repo.list_purchase_bills().await
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<crate::domain::entities::Expense>> {
        self.repo.list_expenses().await
    }

    pub async fn list_cash_bank_transactions(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::CashBankTransaction>> {
        self.repo.list_cash_bank_transactions().await
    }

    pub async fn create_sales_invoice(
        &self,
        req: crate::domain::entities::CreateSalesInvoiceRequest,
    ) -> DomainResult<crate::domain::entities::SalesInvoice> {
        let invoice = crate::domain::entities::SalesInvoice {
            id: Uuid::new_v4(),
            invoice_number: req.invoice_number,
            client_id: req.client_id,
            date: req.date,
            due_date: req.due_date,
            subject: req.subject,
            subtotal: req.items.iter().map(|i| i.quantity * i.unit_price).sum(),
            tax: 0.0,
            total_amount: req.items.iter().map(|i| i.quantity * i.unit_price).sum(),
            amount_paid: 0.0,
            status: "draft".to_string(),
            journal_entry_id: None,
            created_at: Utc::now(),
        };
        self.repo.create_sales_invoice(&invoice).await
    }

    pub async fn create_purchase_bill(
        &self,
        req: crate::domain::entities::CreatePurchaseBillRequest,
    ) -> DomainResult<crate::domain::entities::PurchaseBill> {
        let total = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let bill = crate::domain::entities::PurchaseBill {
            id: Uuid::new_v4(),
            bill_number: req.bill_number,
            vendor_id: req.vendor_id,
            date: req.date,
            due_date: req.due_date,
            total_amount: total,
            amount_paid: 0.0,
            status: "draft".to_string(),
            journal_entry_id: None,
            created_at: Utc::now(),
        };
        self.repo.create_purchase_bill(&bill).await
    }

    pub async fn create_expense(
        &self,
        req: crate::domain::entities::CreateExpenseRequest,
    ) -> DomainResult<crate::domain::entities::Expense> {
        let total = req.items.iter().map(|i| i.amount).sum();
        let expense = crate::domain::entities::Expense {
            id: Uuid::new_v4(),
            expense_number: req.expense_number,
            date: req.date,
            pay_from_account_id: req.pay_from_account_id,
            recipient: req.recipient,
            total_amount: total,
            status: "paid".to_string(),
            journal_entry_id: None,
            created_at: Utc::now(),
        };
        self.repo.create_expense(&expense).await
    }

    pub async fn create_cash_bank_transaction(
        &self,
        req: crate::domain::entities::CreateCashBankTransactionRequest,
    ) -> DomainResult<crate::domain::entities::CashBankTransaction> {
        let tx = crate::domain::entities::CashBankTransaction {
            id: Uuid::new_v4(),
            transaction_number: req.transaction_number.unwrap_or_else(|| {
                format!("TX-{}", Uuid::new_v4().to_string()[..8].to_uppercase())
            }),
            transaction_type: req.transaction_type,
            date: req.date,
            amount: req.amount,
            from_account_id: req.from_account_id,
            to_account_id: req.to_account_id,
            account_id: req.account_id,
            contact_name: req.contact_name,
            description: req.description,
            journal_entry_id: None,
            created_at: Utc::now(),
        };
        self.repo.create_cash_bank_transaction(&tx).await
    }
}
