use chrono::Utc;
use serde::Serialize;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::domain::entities::*;
use crate::repositories::{FinanceRepository, JournalRepository};
use crate::AssetExpenseService;
use crate::JournalService;

use management_system_core::domain::audit_trail::{AuditAction, DocumentAuditEntry};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::domain::outbox::OutboxEntry;
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::database::{
    CommandContext, IdempotencyDecision, IdempotencyStore, UnitOfWork,
};
use management_system_core::infrastructure::repositories::{
    AssetRepository, AuditTrailStore, OutboxStore,
};


#[derive(Clone)]
#[allow(dead_code)] // Fields retained for future use (dependency injection)
pub struct FinanceService {
    repo: FinanceRepository,
    journal_repo: JournalRepository,
    journal_service: JournalService,
    asset_expense_service: AssetExpenseService,
    asset_repo: AssetRepository,

    event_bus: EventBus,
    accounting_engine: Option<crate::posting_engine::AccountingPostingEngine>,
}

impl FinanceService {
    fn request_fingerprint<T: Serialize>(
        action: &str,
        source_id: Option<Uuid>,
        payload: &T,
    ) -> DomainResult<String> {
        let payload = serde_json::to_vec(payload)
            .map_err(|e| DomainError::validation("payload", &e.to_string()))?;
        let mut hasher = Sha256::new();
        hasher.update(action.as_bytes());
        hasher.update([0]);
        if let Some(source_id) = source_id {
            hasher.update(source_id.as_bytes());
        }
        hasher.update([0]);
        hasher.update(payload);
        Ok(format!("{:x}", hasher.finalize()))
    }

    pub fn new(
        repo: FinanceRepository,
        journal_repo: JournalRepository,
        journal_service: JournalService,
        asset_expense_service: AssetExpenseService,
        asset_repo: AssetRepository,

        event_bus: EventBus,
    ) -> Self {
        Self {
            repo,
            journal_repo,
            journal_service,
            asset_expense_service,
            asset_repo,

            event_bus,
            accounting_engine: None,
        }
    }

    pub fn with_accounting_engine(
        mut self,
        accounting_engine: crate::posting_engine::AccountingPostingEngine,
    ) -> Self {
        self.accounting_engine = Some(accounting_engine);
        self
    }

    pub async fn allocate_payment(
        &self,
        req: AllocatePaymentRequest,
    ) -> DomainResult<PaymentAllocation> {
        if req.allocated_amount <= rust_decimal::Decimal::ZERO {
            return Err(DomainError::business_rule(
                "InvalidAllocationAmount",
                "Allocated amount must be greater than 0",
            ));
        }

        let allocation = PaymentAllocation {
            id: Uuid::new_v4(),
            payment_entry_id: req.payment_entry_id,
            invoice_type: req.invoice_type,
            invoice_id: req.invoice_id,
            allocated_amount: req.allocated_amount,
            created_at: Utc::now(),
        };

        Ok(allocation)
    }

    /// Financial Report Provider: Trial Balance (QRPT-003)
    pub async fn get_trial_balance_report(&self) -> DomainResult<Vec<TrialBalanceEntry>> {
        self.repo.get_trial_balance().await
    }

    // --- Chart of Accounts Management ---

    pub async fn list_accounts(&self) -> DomainResult<Vec<ChartOfAccount>> {
        self.repo.list_accounts().await
    }

    pub async fn get_account_tree(&self) -> DomainResult<Vec<AccountTreeNode>> {
        let accounts = self.repo.list_accounts().await?;
        let gl_entries = self.repo.get_trial_balance().await?;

        let mut balance_map = std::collections::HashMap::new();
        for entry in gl_entries {
            balance_map.insert(entry.account_id, entry.debit - entry.credit);
        }

        fn build_node(
            account: &ChartOfAccount,
            all_accounts: &[ChartOfAccount],
            balance_map: &std::collections::HashMap<Uuid, rust_decimal::Decimal>,
        ) -> AccountTreeNode {
            let children: Vec<AccountTreeNode> = all_accounts
                .iter()
                .filter(|a| a.parent_id == Some(account.id))
                .map(|a| build_node(a, all_accounts, balance_map))
                .collect();

            let own_balance = balance_map.get(&account.id).copied().unwrap_or_default();
            let children_balance: rust_decimal::Decimal = children.iter().map(|c| c.balance).sum();

            AccountTreeNode {
                id: account.id,
                code: account.code.clone(),
                name: account.name.clone(),
                account_type: account.account_type,
                normal_balance: account.normal_balance,
                balance: own_balance + children_balance,
                currency: account.currency.clone(),
                children,
            }
        }

        let root_accounts: Vec<&ChartOfAccount> =
            accounts.iter().filter(|a| a.parent_id.is_none()).collect();

        Ok(root_accounts
            .into_iter()
            .map(|a| build_node(a, &accounts, &balance_map))
            .collect())
    }

    pub async fn get_account(&self, id: Uuid) -> DomainResult<ChartOfAccount> {
        self.repo
            .get_account_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ChartOfAccount", id))
    }

    pub async fn find_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        self.repo.find_by_code(code).await
    }

    pub async fn create_account(&self, req: CreateAccountRequest) -> DomainResult<ChartOfAccount> {
        if self.repo.find_by_code(&req.code).await?.is_some() {
            return Err(DomainError::business_rule(
                "DuplicateAccountCode",
                &format!("Account code '{}' already exists", req.code),
            ));
        }

        let now = Utc::now();
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
            created_at: now,
            updated_at: now,
        };

        self.repo.create_account(&account).await
    }

    pub async fn update_account(
        &self,
        id: Uuid,
        req: UpdateAccountRequest,
    ) -> DomainResult<ChartOfAccount> {
        let mut account = self
            .repo
            .get_account_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("ChartOfAccount", id))?;

        if let Some(name) = req.name {
            account.name = name;
        }
        if let Some(parent_id) = req.parent_id {
            account.parent_id = Some(parent_id);
        }
        if let Some(is_active) = req.is_active {
            account.is_active = is_active;
        }
        if let Some(desc) = req.description {
            account.description = Some(desc);
        }

        self.repo.update_account(&account).await
    }

    pub async fn delete_account(&self, _id: Uuid) -> DomainResult<()> {
        Ok(())
    }

    // --- Reporting ---

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

    pub async fn get_income_statement(
        &self,
        _start_date: Option<chrono::NaiveDate>,
        _end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<FinancialReportEntry>> {
        let trial_balance = self.repo.get_trial_balance().await?;

        let mut report = Vec::new();
        for entry in trial_balance {
            if entry.account_type == AccountType::Revenue {
                report.push(FinancialReportEntry {
                    account_code: entry.account_code,
                    account_name: entry.account_name,
                    balance: entry.credit - entry.debit,
                });
            } else if entry.account_type == AccountType::Expense {
                report.push(FinancialReportEntry {
                    account_code: entry.account_code,
                    account_name: entry.account_name,
                    balance: entry.debit - entry.credit,
                });
            }
        }

        Ok(report)
    }

    pub async fn get_balance_sheet(
        &self,
        _as_of_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<FinancialReportEntry>> {
        let trial_balance = self.repo.get_trial_balance().await?;

        let mut report = Vec::new();
        for entry in trial_balance {
            match entry.account_type {
                AccountType::Asset => {
                    report.push(FinancialReportEntry {
                        account_code: entry.account_code,
                        account_name: entry.account_name,
                        balance: entry.debit - entry.credit,
                    });
                }
                AccountType::Liability | AccountType::Equity => {
                    report.push(FinancialReportEntry {
                        account_code: entry.account_code,
                        account_name: entry.account_name,
                        balance: entry.credit - entry.debit,
                    });
                }
                _ => {}
            }
        }

        Ok(report)
    }

    pub async fn get_capex_opex_analysis(
        &self,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<ExpenseAnalysis>> {
        self.repo
            .get_capex_opex_analysis(start_date, end_date)
            .await
    }

    // --- Sales Invoice Management (3R.1.1-004 & 3R.1.1-005) ---

    pub async fn list_sales_invoices(&self) -> DomainResult<Vec<SalesInvoice>> {
        let invoices = self.repo.list_sales_invoices().await?;
        let mut enriched = Vec::with_capacity(invoices.len());
        for invoice in invoices {
            enriched.push(self.enrich_invoice_journal_status(invoice).await?);
        }
        Ok(enriched)
    }

    pub async fn create_sales_invoice(
        &self,
        actor_id: Uuid,
        company_id: Uuid,
        idempotency_key: String,
        req: CreateSalesInvoiceRequest,
    ) -> DomainResult<SalesInvoice> {
        if req.items.is_empty() {
            return Err(DomainError::validation(
                "items",
                "Sales invoice requires at least one line item",
            ));
        }

        let request_fingerprint = Self::request_fingerprint("CREATE_SALES_INVOICE", None, &req)?;

        let total: rust_decimal::Decimal =
            req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let invoice_id = Uuid::new_v4();
        let invoice = SalesInvoice {
            id: invoice_id,
            invoice_number: req.invoice_number.clone(),
            client_id: req.client_id,
            date: req.date,
            due_date: req.due_date,
            subject: req.subject.clone(),
            subtotal: total,
            tax: rust_decimal::Decimal::ZERO,
            total_amount: total,
            amount_paid: rust_decimal::Decimal::ZERO,
            status: "draft".to_string(),
            journal_entry_id: None,
            journal_status: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };

        // 1. Find Accounts (Piutang & Penjualan)
        let receivable_acc = self.find_by_code("1-1300").await?.ok_or_else(|| {
            DomainError::business_rule(
                "Missing Account",
                "Account 1-1300 (Piutang Usaha) not found",
            )
        })?;
        let sales_acc = self.find_by_code("4-1100").await?.ok_or_else(|| {
            DomainError::business_rule(
                "Missing Account",
                "Account 4-1100 (Pendapatan Penjualan) not found",
            )
        })?;

        // 2. Begin UnitOfWork transaction boundary (3R.1.1-004 & 3R.1.1-005)
        let mut uow = UnitOfWork::begin(self.repo.pool()).await?;

        // 3. Idempotency Check & Reservation
        let cmd_ctx = CommandContext::new(
            actor_id,
            company_id,
            "SALES_INVOICE",
            invoice_id,
            "CREATE_SALES_INVOICE",
            &idempotency_key,
            request_fingerprint,
        );

        if let IdempotencyDecision::Completed { outcome } =
            IdempotencyStore::check_and_reserve(&mut uow, &cmd_ctx).await?
        {
            uow.rollback().await?;
            return serde_json::from_str(&outcome).map_err(|e| {
                DomainError::internal(format!("Invalid cached idempotency outcome: {e}"))
            });
        }

        // 4. Persist Sales Invoice Header AND Lines atomically
        let (mut created_invoice, _created_items) = self
            .repo
            .create_sales_invoice_with_uow(&mut uow, &invoice, &req.items)
            .await?;

        // 5. Create Draft Journal Entry in the SAME UnitOfWork
        let journal_req = CreateJournalEntryRequest {
            date: created_invoice.date,
            description: format!(
                "Penjualan: {} - {}",
                created_invoice.invoice_number,
                created_invoice.subject.as_deref().unwrap_or("-")
            ),
            reference: Some(created_invoice.invoice_number.clone()),
            lines: vec![
                CreateJournalLineRequest {
                    account_id: receivable_acc.id,
                    description: Some(format!(
                        "Piutang Penjualan {}",
                        created_invoice.invoice_number
                    )),
                    debit: total,
                    credit: rust_decimal::Decimal::ZERO,
                },
                CreateJournalLineRequest {
                    account_id: sales_acc.id,
                    description: Some(format!(
                        "Pendapatan Penjualan {}",
                        created_invoice.invoice_number
                    )),
                    debit: rust_decimal::Decimal::ZERO,
                    credit: total,
                },
            ],
        };

        let journal = JournalRepository::create_journal_entry_with_uow(
            &mut uow,
            format!("TX-{}", created_invoice.invoice_number),
            &journal_req,
            Some(actor_id),
        )
        .await?;

        // Link journal entry id inside UoW
        sqlx::query("UPDATE sales_invoices SET journal_entry_id = $1 WHERE id = $2")
            .bind(journal.header.id)
            .bind(created_invoice.id)
            .execute(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        created_invoice.journal_entry_id = Some(journal.header.id);
        created_invoice.journal_status = Some(journal.header.status);

        // 6. Append Audit Entry in SAME UoW (3R.1.1-005)
        let audit_entry = DocumentAuditEntry {
            id: Uuid::new_v4(),
            document_id: created_invoice.id,
            document_type: "SALES_INVOICE".to_string(),
            action: AuditAction::Create.as_str().to_string(),
            actor_id,
            tenant_id: company_id,
            company_id: Some(company_id),
            from_status: None,
            to_status: Some("draft".to_string()),
            document_version: 1,
            reason: Some("Sales invoice created".to_string()),
            correlation_id: cmd_ctx.correlation_id.clone(),
            recorded_at: Utc::now(),
        };
        AuditTrailStore::append(&mut uow, &audit_entry).await?;

        // 7. Append Outbox Entry in SAME UoW (3R.1.1-005)
        let outbox_payload = serde_json::to_value(&created_invoice)
            .map_err(|e| DomainError::validation("payload", &e.to_string()))?;
        let outbox_entry = OutboxEntry::new(
            "SALES_INVOICE_CREATED",
            &outbox_payload,
            "SALES_INVOICE",
            created_invoice.id,
            company_id,
            Some(company_id),
            cmd_ctx.correlation_id.clone(),
        );
        OutboxStore::append(&mut uow, &outbox_entry).await?;

        // 8. Mark Idempotency Complete
        IdempotencyStore::mark_complete(
            &mut uow,
            &cmd_ctx,
            &serde_json::to_string(&created_invoice).unwrap_or_default(),
        )
        .await?;

        // 9. Commit entire transaction boundary
        uow.commit().await?;

        Ok(created_invoice)
    }

    pub async fn get_sales_invoice(&self, id: Uuid) -> DomainResult<SalesInvoice> {
        let invoice = self
            .repo
            .get_sales_invoice_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("SalesInvoice", id))?;
        self.enrich_invoice_journal_status(invoice).await
    }

    async fn enrich_invoice_journal_status(
        &self,
        mut invoice: SalesInvoice,
    ) -> DomainResult<SalesInvoice> {
        invoice.journal_status = match invoice.journal_entry_id {
            Some(journal_id) => self
                .journal_repo
                .get_journal_entry_detail(journal_id)
                .await?
                .map(|detail| detail.header.status),
            None => None,
        };
        Ok(invoice)
    }

    pub async fn get_sales_invoice_detail(
        &self,
        id: Uuid,
    ) -> DomainResult<SalesInvoiceDetailResponse> {
        let invoice = self.get_sales_invoice(id).await?;
        let items = self.repo.get_sales_invoice_items(id).await?;
        Ok(SalesInvoiceDetailResponse { invoice, items })
    }

    pub async fn update_sales_invoice(
        &self,
        actor_id: Uuid,
        company_id: Uuid,
        idempotency_key: String,
        id: Uuid,
        req: CreateSalesInvoiceRequest,
    ) -> DomainResult<SalesInvoice> {
        if req.items.is_empty() {
            return Err(DomainError::validation(
                "items",
                "Sales invoice requires at least one line item",
            ));
        }

        let request_fingerprint =
            Self::request_fingerprint("UPDATE_SALES_INVOICE", Some(id), &req)?;

        let mut invoice = self.get_sales_invoice(id).await?;
        if invoice.journal_status == Some(JournalStatus::Posted) {
            return Err(DomainError::business_rule(
                "PostedJournalIsImmutable",
                "Cannot edit a sales invoice whose journal is already posted",
            ));
        }
        let total: rust_decimal::Decimal =
            req.items.iter().map(|i| i.quantity * i.unit_price).sum();

        invoice.invoice_number = req.invoice_number;
        invoice.client_id = req.client_id;
        invoice.date = req.date;
        invoice.due_date = req.due_date;
        invoice.subject = req.subject;
        invoice.subtotal = total;
        invoice.total_amount = total;
        invoice.attachment_url = req.attachment_url;

        // 1. Begin UnitOfWork transaction boundary (3R.1.1-004 & 3R.1.1-005)
        let mut uow = UnitOfWork::begin(self.repo.pool()).await?;

        // 2. Idempotency Check & Reservation
        let cmd_ctx = CommandContext::new(
            actor_id,
            company_id,
            "SALES_INVOICE",
            id,
            "UPDATE_SALES_INVOICE",
            &idempotency_key,
            request_fingerprint,
        );

        if let IdempotencyDecision::Completed { outcome } =
            IdempotencyStore::check_and_reserve(&mut uow, &cmd_ctx).await?
        {
            uow.rollback().await?;
            return serde_json::from_str(&outcome).map_err(|e| {
                DomainError::internal(format!("Invalid cached idempotency outcome: {e}"))
            });
        }

        // 3. Update Invoice Header + Lines in UoW
        let (mut updated_invoice, _updated_items) = self
            .repo
            .update_sales_invoice_with_uow(&mut uow, &invoice, &req.items)
            .await?;
        updated_invoice.journal_status = invoice.journal_status;

        // 4. Update/Rebuild Draft Journal Entry in SAME UoW (3R.1.1-004)
        if let Some(journal_id) = updated_invoice.journal_entry_id {
            let receivable_acc = self.find_by_code("1-1300").await?.ok_or_else(|| {
                DomainError::business_rule("Missing Account", "Account 1-1300 not found")
            })?;
            let sales_acc = self.find_by_code("4-1100").await?.ok_or_else(|| {
                DomainError::business_rule("Missing Account", "Account 4-1100 not found")
            })?;

            let journal_req = CreateJournalEntryRequest {
                date: updated_invoice.date,
                description: format!(
                    "Penjualan: {} - {}",
                    updated_invoice.invoice_number,
                    updated_invoice.subject.as_deref().unwrap_or("-")
                ),
                reference: Some(updated_invoice.invoice_number.clone()),
                lines: vec![
                    CreateJournalLineRequest {
                        account_id: receivable_acc.id,
                        description: Some(format!(
                            "Piutang Penjualan {}",
                            updated_invoice.invoice_number
                        )),
                        debit: total,
                        credit: rust_decimal::Decimal::ZERO,
                    },
                    CreateJournalLineRequest {
                        account_id: sales_acc.id,
                        description: Some(format!(
                            "Pendapatan Penjualan {}",
                            updated_invoice.invoice_number
                        )),
                        debit: rust_decimal::Decimal::ZERO,
                        credit: total,
                    },
                ],
            };

            let updated_journal = JournalRepository::update_journal_entry_with_uow(
                &mut uow,
                journal_id,
                &journal_req,
            )
            .await?;
            updated_invoice.journal_status = Some(updated_journal.header.status);
        }

        // 5. Append Audit Entry in SAME UoW (3R.1.1-005)
        let audit_entry = DocumentAuditEntry {
            id: Uuid::new_v4(),
            document_id: updated_invoice.id,
            document_type: "SALES_INVOICE".to_string(),
            action: AuditAction::Update.as_str().to_string(),
            actor_id,
            tenant_id: company_id,
            company_id: Some(company_id),
            from_status: Some("draft".to_string()),
            to_status: Some("draft".to_string()),
            document_version: 2,
            reason: Some("Sales invoice updated".to_string()),
            correlation_id: cmd_ctx.correlation_id.clone(),
            recorded_at: Utc::now(),
        };
        AuditTrailStore::append(&mut uow, &audit_entry).await?;

        // 6. Append Outbox Entry in SAME UoW (3R.1.1-005)
        let outbox_payload = serde_json::to_value(&updated_invoice)
            .map_err(|e| DomainError::validation("payload", &e.to_string()))?;
        let outbox_entry = OutboxEntry::new(
            "SALES_INVOICE_UPDATED",
            &outbox_payload,
            "SALES_INVOICE",
            updated_invoice.id,
            company_id,
            Some(company_id),
            cmd_ctx.correlation_id.clone(),
        );
        OutboxStore::append(&mut uow, &outbox_entry).await?;

        // 7. Mark Idempotency Complete
        IdempotencyStore::mark_complete(
            &mut uow,
            &cmd_ctx,
            &serde_json::to_string(&updated_invoice).unwrap_or_default(),
        )
        .await?;

        // 8. Commit UoW
        uow.commit().await?;

        Ok(updated_invoice)
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        self.repo.delete_sales_invoice(id).await
    }

    pub async fn create_purchase_bill(
        &self,
        req: CreatePurchaseBillRequest,
    ) -> DomainResult<PurchaseBill> {
        let total: rust_decimal::Decimal = req.items.iter().map(|i| i.amount).sum();
        let bill = PurchaseBill {
            id: Uuid::new_v4(),
            bill_number: req.bill_number,
            vendor_id: req.vendor_id,
            date: req.date,
            due_date: req.due_date,
            total_amount: total,
            amount_paid: rust_decimal::Decimal::ZERO,
            status: "draft".to_string(),
            budget_type: req.budget_type.unwrap_or_else(|| "OPEX".to_string()),
            journal_entry_id: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };
        self.repo.create_purchase_bill(&bill).await
    }

    pub async fn list_purchase_bills(&self) -> DomainResult<Vec<PurchaseBill>> {
        self.repo.list_purchase_bills().await
    }

    pub async fn create_expense(&self, req: CreateExpenseRequest) -> DomainResult<Expense> {
        let expense_number = req
            .expense_number
            .unwrap_or_else(|| format!("EXP-{}", Uuid::new_v4().to_string()[..8].to_uppercase()));
        let expense = Expense {
            id: Uuid::new_v4(),
            expense_number,
            date: req.date,
            pay_from_account_id: req.pay_from_account_id,
            recipient: req.recipient,
            total_amount: req.amount,
            status: "paid".to_string(),
            expense_type: req.expense_type,
            journal_entry_id: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };
        self.repo.create_expense(&expense).await
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<Expense>> {
        self.repo.list_expenses().await
    }

    pub async fn create_cash_bank_transaction(
        &self,
        req: CreateCashBankTransactionRequest,
    ) -> DomainResult<CashBankTransaction> {
        let tx = CashBankTransaction {
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

    pub async fn list_sales_quotes(&self) -> DomainResult<Vec<SalesQuote>> {
        self.repo.list_sales_quotes().await
    }

    pub async fn create_sales_quote(
        &self,
        req: CreateSalesQuoteRequest,
    ) -> DomainResult<SalesQuote> {
        let total: rust_decimal::Decimal =
            req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let quote = SalesQuote {
            id: Uuid::new_v4(),
            quote_number: req.quote_number,
            client_id: req.client_id,
            date: req.date,
            expiry_date: req.expiry_date,
            subject: req.subject,
            subtotal: total,
            tax: rust_decimal::Decimal::ZERO,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_quote(&quote).await
    }

    pub async fn list_sales_orders(&self) -> DomainResult<Vec<SalesOrder>> {
        self.repo.list_sales_orders().await
    }

    pub async fn create_sales_order(
        &self,
        req: CreateSalesOrderRequest,
    ) -> DomainResult<SalesOrder> {
        let total: rust_decimal::Decimal =
            req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let order = SalesOrder {
            id: Uuid::new_v4(),
            order_number: req.order_number,
            quote_id: req.quote_id,
            client_id: req.client_id,
            date: req.date,
            delivery_date: req.delivery_date,
            subject: req.subject,
            subtotal: total,
            tax: rust_decimal::Decimal::ZERO,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_order(&order).await
    }

    pub async fn list_sales_shipments(&self) -> DomainResult<Vec<SalesShipment>> {
        self.repo.list_sales_shipments().await
    }

    pub async fn create_sales_shipment(
        &self,
        req: CreateSalesShipmentRequest,
    ) -> DomainResult<SalesShipment> {
        let shipment = SalesShipment {
            id: Uuid::new_v4(),
            shipment_number: req.shipment_number,
            sales_order_id: req.sales_order_id,
            client_id: None,
            date: req.date,
            courier_name: req.courier_name,
            tracking_number: req.tracking_number,
            status: "pending".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_shipment(&shipment).await
    }

    pub async fn list_purchase_quotes(&self) -> DomainResult<Vec<PurchaseQuote>> {
        self.repo.list_purchase_quotes().await
    }

    pub async fn create_purchase_quote(
        &self,
        req: CreatePurchaseQuoteRequest,
    ) -> DomainResult<PurchaseQuote> {
        let total: rust_decimal::Decimal = req.items.iter().map(|i| i.amount).sum();
        let quote = PurchaseQuote {
            id: Uuid::new_v4(),
            quote_number: req.quote_number,
            vendor_id: req.vendor_id,
            date: req.date,
            expiry_date: req.expiry_date,
            subject: req.subject,
            subtotal: total,
            tax: rust_decimal::Decimal::ZERO,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_purchase_quote(&quote).await
    }

    pub async fn list_purchase_orders(&self) -> DomainResult<Vec<PurchaseOrder>> {
        self.repo.list_purchase_orders().await
    }

    pub async fn create_purchase_order(
        &self,
        req: CreatePurchaseOrderRequest,
    ) -> DomainResult<PurchaseOrder> {
        let total: rust_decimal::Decimal = req.items.iter().map(|i| i.amount).sum();
        let order = PurchaseOrder {
            id: Uuid::new_v4(),
            order_number: req.order_number,
            purchase_quote_id: req.purchase_quote_id,
            vendor_id: req.vendor_id,
            date: req.date,
            delivery_date: req.delivery_date,
            subject: req.subject,
            subtotal: total,
            tax: rust_decimal::Decimal::ZERO,
            total_amount: total,
            status: "draft".to_string(),
            budget_type: req.budget_type.unwrap_or_else(|| "OPEX".to_string()),
            created_at: Utc::now(),
        };
        let po = self.repo.create_purchase_order(&order).await?;
        Ok(po)
    }

    pub async fn list_purchase_shipments(&self) -> DomainResult<Vec<PurchaseShipment>> {
        self.repo.list_purchase_shipments().await
    }

    pub async fn create_purchase_shipment(
        &self,
        req: CreatePurchaseShipmentRequest,
    ) -> DomainResult<PurchaseShipment> {
        let shipment = PurchaseShipment {
            id: Uuid::new_v4(),
            shipment_number: req.shipment_number,
            purchase_order_id: req.purchase_order_id,
            vendor_id: None,
            date: req.date,
            courier_name: req.courier_name,
            tracking_number: req.tracking_number,
            status: "received".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_purchase_shipment(&shipment).await
    }
}
