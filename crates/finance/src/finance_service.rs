use chrono::Utc;
use rust_decimal::prelude::ToPrimitive;
use uuid::Uuid;

use management_system_core::infrastructure::repositories::FinanceRepository;
use crate::AssetExpenseService;
use crate::JournalService;
use management_system_core::domain::entities::{
    AccountTreeNode, ChartOfAccount, CreateAccountRequest, FinancialReportEntry,
    GeneralLedgerEntry, TrialBalanceEntry, UpdateAccountRequest,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::bus::EventBus;

use management_system_core::infrastructure::repositories::{AssetRepository, RentalRepository};

#[derive(Clone)]
pub struct FinanceService {
    repo: FinanceRepository,
    journal_service: JournalService,
    asset_expense_service: AssetExpenseService,
    asset_repo: AssetRepository,
    rental_repo: RentalRepository,
    event_bus: EventBus,
}

impl FinanceService {
    pub fn new(
        repo: FinanceRepository,
        journal_service: JournalService,
        asset_expense_service: AssetExpenseService,
        asset_repo: AssetRepository,
        rental_repo: RentalRepository,
        event_bus: EventBus,
    ) -> Self {
        Self {
            repo,
            journal_service,
            asset_expense_service,
            asset_repo,
            rental_repo,
            event_bus,
        }
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

    pub async fn find_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        self.repo.find_by_code(code).await
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
        Ok(Self::build_tree(&all_accounts, None))
    }

    fn build_tree(accounts: &[ChartOfAccount], parent_id: Option<Uuid>) -> Vec<AccountTreeNode> {
        let mut nodes = Vec::new();

        for acc in accounts {
            if acc.parent_id == parent_id {
                let children = Self::build_tree(accounts, Some(acc.id));
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
                    management_system_core::domain::entities::AccountType::Asset
                        | management_system_core::domain::entities::AccountType::Liability
                        | management_system_core::domain::entities::AccountType::Equity
                )
            })
            .map(|e| {
                // Balance calculation based on account type
                let balance = match e.account_type {
                    management_system_core::domain::entities::AccountType::Asset => {
                        e.debit - e.credit
                    }
                    management_system_core::domain::entities::AccountType::Liability
                    | management_system_core::domain::entities::AccountType::Equity => {
                        e.credit - e.debit
                    }
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
                    management_system_core::domain::entities::AccountType::Revenue
                        | management_system_core::domain::entities::AccountType::Expense
                )
            })
            .map(|e| {
                let balance = match e.account_type {
                    management_system_core::domain::entities::AccountType::Revenue => {
                        e.credit - e.debit
                    }
                    management_system_core::domain::entities::AccountType::Expense => {
                        e.debit - e.credit
                    }
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
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesInvoice>> {
        self.repo.list_sales_invoices().await
    }

    pub async fn list_purchase_bills(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseBill>> {
        self.repo.list_purchase_bills().await
    }

    pub async fn list_expenses(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::Expense>> {
        self.repo.list_expenses().await
    }

    pub async fn list_cash_bank_transactions(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::CashBankTransaction>> {
        self.repo.list_cash_bank_transactions().await
    }

    pub async fn create_sales_invoice(
        &self,
        req: management_system_core::domain::entities::CreateSalesInvoiceRequest,
    ) -> DomainResult<management_system_core::domain::entities::SalesInvoice> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let mut invoice = management_system_core::domain::entities::SalesInvoice {
            id: Uuid::new_v4(),
            invoice_number: req.invoice_number.clone(),
            client_id: req.client_id,
            date: req.date,
            due_date: req.due_date,
            subject: req.subject.clone(),
            subtotal: total,
            tax: 0.0,
            total_amount: total,
            amount_paid: 0.0,
            status: "draft".to_string(),
            journal_entry_id: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };

        // --- Automated Journaling Logic ---
        // 1. Find Accounts (Piutang & Penjualan)
        let receivable_acc = self.find_by_code("1-1300").await?.ok_or_else(|| {
            DomainError::business_rule("Missing Account", "Account 1-1300 (Piutang Usaha) not found")
        })?;
        let sales_acc = self.find_by_code("4-1100").await?.ok_or_else(|| {
            DomainError::business_rule("Missing Account", "Account 4-1100 (Pendapatan Penjualan) not found")
        })?;

        // 2. Prepare Journal Entry
        use rust_decimal::prelude::FromPrimitive;
        let decimal_total = rust_decimal::Decimal::from_f64(total).unwrap_or_default();

        let journal_req =
            management_system_core::domain::entities::journal::CreateJournalEntryRequest {
                date: invoice.date,
                description: format!(
                    "Penjualan: {} - {}",
                    invoice.invoice_number,
                    invoice.subject.as_deref().unwrap_or("-")
                ),
                reference: Some(invoice.invoice_number.clone()),
                lines: vec![
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: receivable_acc.id,
                        description: Some(format!("Piutang Penjualan {}", invoice.invoice_number)),
                        debit: decimal_total,
                        credit: rust_decimal::Decimal::ZERO,
                    },
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: sales_acc.id,
                        description: Some(format!(
                            "Pendapatan Penjualan {}",
                            invoice.invoice_number
                        )),
                        debit: rust_decimal::Decimal::ZERO,
                        credit: decimal_total,
                    },
                ],
            };

        // 3. Create Journal
        let journal = self.journal_service.create_entry(journal_req, None).await?;
        invoice.journal_entry_id = Some(journal.header.id);
        invoice.status = "posted".to_string();

        self.repo.create_sales_invoice(&invoice).await
    }

    pub async fn get_sales_invoice(
        &self,
        id: Uuid,
    ) -> DomainResult<management_system_core::domain::entities::SalesInvoice> {
        self.repo
            .get_sales_invoice_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("SalesInvoice", id))
    }

    pub async fn update_sales_invoice(
        &self,
        id: Uuid,
        req: management_system_core::domain::entities::CreateSalesInvoiceRequest,
    ) -> DomainResult<management_system_core::domain::entities::SalesInvoice> {
        let mut invoice = self.get_sales_invoice(id).await?;
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();

        invoice.invoice_number = req.invoice_number;
        invoice.client_id = req.client_id;
        invoice.date = req.date;
        invoice.due_date = req.due_date;
        invoice.subject = req.subject;
        invoice.subtotal = total;
        invoice.total_amount = total;
        invoice.attachment_url = req.attachment_url;

        self.repo.update_sales_invoice(&invoice).await
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        self.repo.delete_sales_invoice(id).await
    }

    pub async fn create_purchase_bill(
        &self,
        req: management_system_core::domain::entities::CreatePurchaseBillRequest,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseBill> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let mut bill = management_system_core::domain::entities::PurchaseBill {
            id: Uuid::new_v4(),
            bill_number: req.bill_number.clone(),
            vendor_id: req.vendor_id,
            date: req.date,
            due_date: req.due_date,
            total_amount: total,
            amount_paid: 0.0,
            status: "draft".to_string(),
            budget_type: req.budget_type.unwrap_or_else(|| "OPEX".to_string()),
            journal_entry_id: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };

        // --- Automated Journaling Logic ---
        // 1. Find Accounts (Beban & Utang Usaha)
        // For simplicity, we use account from the first item or a generic "Purchases" account 5-1000
        let purchase_acc = self.find_by_code("5-1000").await?.ok_or_else(|| {
            DomainError::business_rule("Missing Account", "Account 5-1000 (Purchases) not found")
        })?;

        // Use custom payable account if provided, else default to 2-1100
        let payable_acc = if let Some(id) = req.account_payable_id {
            // Validate it exists
            self.repo
                .find_by_id(id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?
                .ok_or_else(|| DomainError::not_found("ChartOfAccount", id))?
        } else {
            self.find_by_code("2-1100").await?.ok_or_else(|| {
                DomainError::business_rule(
                    "Missing Account",
                    "Account 2-1100 (Utang Usaha) not found",
                )
            })?
        };

        // 2. Prepare Journal Entry
        use rust_decimal::prelude::FromPrimitive;
        let decimal_total = rust_decimal::Decimal::from_f64(total).unwrap_or_default();

        let journal_req =
            management_system_core::domain::entities::journal::CreateJournalEntryRequest {
                date: bill.date,
                description: format!("Pembelian: {}", bill.bill_number),
                reference: Some(bill.bill_number.clone()),
                lines: vec![
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: purchase_acc.id,
                        description: Some(format!("Beban Pembelian {}", bill.bill_number)),
                        debit: decimal_total,
                        credit: rust_decimal::Decimal::ZERO,
                    },
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: payable_acc.id,
                        description: Some(format!("Utang Usaha {}", bill.bill_number)),
                        debit: rust_decimal::Decimal::ZERO,
                        credit: decimal_total,
                    },
                ],
            };

        // 3. Create Journal
        let journal = self.journal_service.create_entry(journal_req, None).await?;
        bill.journal_entry_id = Some(journal.header.id);
        bill.status = "posted".to_string();

        self.repo.create_purchase_bill(&bill).await
    }

    pub async fn create_expense(
        &self,
        req: management_system_core::domain::entities::CreateExpenseRequest,
    ) -> DomainResult<management_system_core::domain::entities::Expense> {
        let total: f64 = req.items.iter().map(|i| i.amount).sum();
        let mut expense = management_system_core::domain::entities::Expense {
            id: Uuid::new_v4(),
            expense_number: req.expense_number.clone(),
            date: req.date,
            pay_from_account_id: req.pay_from_account_id,
            recipient: req.recipient.clone(),
            total_amount: total,
            status: req.status.unwrap_or_else(|| "paid".to_string()),
            expense_type: req.expense_type.unwrap_or_else(|| "OPEX".to_string()),
            journal_entry_id: None,
            created_at: Utc::now(),
            attachment_url: req.attachment_url,
        };

        // --- Automated Journaling Logic ---
        // For Expenses, we can have multiple items (different expense categories)
        let mut lines = Vec::new();
        use rust_decimal::prelude::FromPrimitive;

        for item in &req.items {
            let decimal_amount = rust_decimal::Decimal::from_f64(item.amount).unwrap_or_default();
            lines.push(
                management_system_core::domain::entities::journal::CreateJournalLineRequest {
                    account_id: item.account_id,
                    description: Some(
                        item.description
                            .clone()
                            .unwrap_or_else(|| "Biaya".to_string()),
                    ),
                    debit: decimal_amount,
                    credit: rust_decimal::Decimal::ZERO,
                },
            );
        }

        // Kredit Kas/Bank
        let decimal_total = rust_decimal::Decimal::from_f64(total).unwrap_or_default();
        lines.push(
            management_system_core::domain::entities::journal::CreateJournalLineRequest {
                account_id: expense.pay_from_account_id,
                description: Some(format!("Bayar Biaya {}", expense.expense_number)),
                debit: rust_decimal::Decimal::ZERO,
                credit: decimal_total,
            },
        );

        let journal_req =
            management_system_core::domain::entities::journal::CreateJournalEntryRequest {
                date: expense.date,
                description: format!(
                    "Biaya: {} - {}",
                    expense.expense_number,
                    expense.recipient.as_deref().unwrap_or("-")
                ),
                reference: Some(expense.expense_number.clone()),
                lines,
            };

        let journal = self.journal_service.create_entry(journal_req, None).await?;
        expense.journal_entry_id = Some(journal.header.id);

        let created = self.repo.create_expense(&expense).await?;

        // Publish Event
        self.event_bus.publish(
            management_system_core::domain::events::SystemEvent::ExpenseCreated(created.clone()),
        );

        Ok(created)
    }

    pub async fn create_cash_bank_transaction(
        &self,
        req: management_system_core::domain::entities::CreateCashBankTransactionRequest,
    ) -> DomainResult<management_system_core::domain::entities::CashBankTransaction> {
        let tx = management_system_core::domain::entities::CashBankTransaction {
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
    pub async fn list_sales_quotes(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesQuote>> {
        self.repo.list_sales_quotes().await
    }

    pub async fn create_sales_quote(
        &self,
        req: management_system_core::domain::entities::CreateSalesQuoteRequest,
    ) -> DomainResult<management_system_core::domain::entities::SalesQuote> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let quote = management_system_core::domain::entities::SalesQuote {
            id: Uuid::new_v4(),
            quote_number: req.quote_number,
            client_id: req.client_id,
            date: req.date,
            expiry_date: req.expiry_date,
            subject: req.subject,
            subtotal: total,
            tax: 0.0,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_quote(&quote).await
    }

    pub async fn list_sales_orders(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesOrder>> {
        self.repo.list_sales_orders().await
    }

    pub async fn create_sales_order(
        &self,
        req: management_system_core::domain::entities::CreateSalesOrderRequest,
    ) -> DomainResult<management_system_core::domain::entities::SalesOrder> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let order = management_system_core::domain::entities::SalesOrder {
            id: Uuid::new_v4(),
            order_number: req.order_number,
            quote_id: req.quote_id,
            client_id: req.client_id,
            date: req.date,
            delivery_date: req.delivery_date,
            subject: req.subject,
            subtotal: total,
            tax: 0.0,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_order(&order).await
    }

    pub async fn list_sales_shipments(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesShipment>> {
        self.repo.list_sales_shipments().await
    }

    pub async fn create_sales_shipment(
        &self,
        req: management_system_core::domain::entities::CreateSalesShipmentRequest,
    ) -> DomainResult<management_system_core::domain::entities::SalesShipment> {
        let shipment = management_system_core::domain::entities::SalesShipment {
            id: Uuid::new_v4(),
            shipment_number: req.shipment_number,
            sales_order_id: req.sales_order_id,
            client_id: None, // Logic to fetch from SO or Client can be added here
            date: req.date,
            courier_name: req.courier_name,
            tracking_number: req.tracking_number,
            status: "pending".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_sales_shipment(&shipment).await
    }

    // --- Purchase Module ---

    pub async fn list_purchase_quotes(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseQuote>> {
        self.repo.list_purchase_quotes().await
    }

    pub async fn create_purchase_quote(
        &self,
        req: management_system_core::domain::entities::CreatePurchaseQuoteRequest,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseQuote> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let quote = management_system_core::domain::entities::PurchaseQuote {
            id: Uuid::new_v4(),
            quote_number: req.quote_number,
            vendor_id: req.vendor_id,
            date: req.date,
            expiry_date: req.expiry_date,
            subject: req.subject,
            subtotal: total,
            tax: 0.0,
            total_amount: total,
            status: "draft".to_string(),
            created_at: Utc::now(),
        };
        self.repo.create_purchase_quote(&quote).await
    }

    pub async fn list_purchase_orders(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseOrder>> {
        self.repo.list_purchase_orders().await
    }

    pub async fn create_purchase_order(
        &self,
        req: management_system_core::domain::entities::CreatePurchaseOrderRequest,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseOrder> {
        let total: f64 = req.items.iter().map(|i| i.quantity * i.unit_price).sum();
        let order = management_system_core::domain::entities::PurchaseOrder {
            id: Uuid::new_v4(),
            order_number: req.order_number,
            purchase_quote_id: req.purchase_quote_id,
            vendor_id: req.vendor_id,
            date: req.date,
            delivery_date: req.delivery_date,
            subject: req.subject,
            subtotal: total,
            tax: 0.0,
            total_amount: total,
            status: "draft".to_string(),
            budget_type: req.budget_type.unwrap_or_else(|| "OPEX".to_string()),
            created_at: Utc::now(),
        };
        let po = self.repo.create_purchase_order(&order).await?;

        // Publish Event
        self.event_bus.publish(
            management_system_core::domain::events::SystemEvent::PurchaseOrderCreated(po.clone()),
        );

        Ok(po)
    }

    pub async fn list_purchase_shipments(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseShipment>> {
        self.repo.list_purchase_shipments().await
    }

    pub async fn create_purchase_shipment(
        &self,
        req: management_system_core::domain::entities::CreatePurchaseShipmentRequest,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseShipment> {
        let shipment = management_system_core::domain::entities::PurchaseShipment {
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

    // --- Event Listeners ---

    pub fn start_event_listener(
        &self,
        mut rx: tokio::sync::broadcast::Receiver<
            management_system_core::domain::events::SystemEvent,
        >,
    ) {
        let service = self.clone();
        tokio::spawn(async move {
            tracing::info!("Finance Service event listener started");
            while let Ok(event) = rx.recv().await {
                match event {
                    management_system_core::domain::events::SystemEvent::FuelLogCompleted(log) => {
                        if let Err(e) = service.handle_fuel_log_completed(log).await {
                            tracing::error!("Failed to process FuelLogCompleted event: {:?}", e);
                        }
                    }
                    management_system_core::domain::events::SystemEvent::WorkOrderFinalized(wo) => {
                        if let Err(e) = service.handle_work_order_finalized(wo).await {
                            tracing::error!("Failed to process WorkOrderFinalized event: {:?}", e);
                        }
                    }
                    management_system_core::domain::events::SystemEvent::RentalInvoiceGenerated(
                        period,
                    ) => {
                        if let Err(e) = service.handle_rental_invoice_generated(period).await {
                            tracing::error!("Failed to process RentalInvoiceGenerated event: {:?}", e);
                        }
                    }
                    _ => {}
                }
            }
        });
    }

    async fn handle_fuel_log_completed(
        &self,
        log: management_system_core::domain::entities::fuel::FuelLog,
    ) -> DomainResult<()> {
        let amount = log.actual_filled_amount.unwrap_or_default();
        if amount.is_zero() {
            return Ok(());
        }

        // 1. CREATE JOURNAL ENTRY
        // Debit: 5-1140 (Biaya Bahan Bakar)
        // Kredit: 2-1130 (Hutang BBM)
        let expense_acc = self.find_by_code("5-1140").await?.ok_or_else(|| {
            DomainError::business_rule("Missing Account", "Account 5-1140 (Fuel Expense) not found")
        })?;
        let payable_acc = self.find_by_code("2-1130").await?.ok_or_else(|| {
            DomainError::business_rule("Missing Account", "Account 2-1130 (Fuel Payable) not found")
        })?;

        let journal_req =
            management_system_core::domain::entities::journal::CreateJournalEntryRequest {
                date: log.completed_at.unwrap_or_else(Utc::now).date_naive(),
                description: format!(
                    "BBM: {} - {} ({})",
                    log.tracking_number,
                    log.asset_name.clone().unwrap_or_default(),
                    log.coupon_code.clone().unwrap_or_default()
                ),
                reference: Some(log.tracking_number.clone()),
                lines: vec![
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: expense_acc.id,
                        description: Some(format!("Beban BBM {}", log.tracking_number)),
                        debit: amount,
                        credit: rust_decimal::Decimal::ZERO,
                    },
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: payable_acc.id,
                        description: Some(format!("Hutang BBM {}", log.tracking_number)),
                        debit: rust_decimal::Decimal::ZERO,
                        credit: amount,
                    },
                ],
            };

        let _journal = self.journal_service.create_entry(journal_req, None).await?;

        // 2. CREATE ASSET EXPENSE (TCO Tracking)
        use management_system_core::application::dto::asset_expense_dto::{
            CreateAssetExpenseItemRequest, CreateAssetExpenseRequest,
        };
        let expense_req = CreateAssetExpenseRequest {
            description: format!(
                "Fuel Usage: {} Liters - {}",
                log.actual_volume.unwrap_or_default(),
                log.tracking_number
            ),
            items: vec![CreateAssetExpenseItemRequest {
                description: format!("Fuel Asset Usage ({})", log.tracking_number),
                amount,
            }],
            date: log.completed_at.unwrap_or_else(Utc::now).date_naive(),
            vendor_name: None,
            invoice_number: Some(log.tracking_number.clone()),
            proof_url: log.receipt_image_url.clone(),
            expense_type: Some("OPEX".to_string()),
        };

        let _ = self
            .asset_expense_service
            .create(log.asset_id, expense_req, log.requested_by)
            .await?;

        Ok(())
    }

    async fn handle_work_order_finalized(
        &self,
        wo: management_system_core::domain::entities::work_order::WorkOrder,
    ) -> DomainResult<()> {
        let labor_cost = wo.labor_cost.unwrap_or_default();
        if labor_cost.is_zero() {
            return Ok(());
        }

        // Account 6-1999 (Labor Applied) - Contra Expense
        let maintenance_acc = self.find_by_code("5-1110").await?.ok_or_else(|| {
            DomainError::business_rule(
                "Missing Account",
                "Account 5-1110 (Maintenance Expense) not found",
            )
        })?;
        let labor_applied_acc = self.find_by_code("6-1999").await?.ok_or_else(|| {
            DomainError::business_rule(
                "Missing Account",
                "Account 6-1999 (Labor Applied) not found",
            )
        })?;

        // Determine Debit Account: Asset Control Account (if CAPEX) or Maintenance Expense
        let debit_account_id = if wo.labor_expense_type.as_deref() == Some("CAPEX") {
            if let Ok(Some(acc_id)) = self.asset_repo.get_asset_account_id(wo.asset_id).await {
                acc_id
            } else {
                maintenance_acc.id
            }
        } else {
            maintenance_acc.id
        };

        let journal_req =
            management_system_core::domain::entities::journal::CreateJournalEntryRequest {
                date: wo.actual_end_date.unwrap_or_else(Utc::now).date_naive(),
                description: format!(
                    "Labor Allocation: {} - {}",
                    wo.wo_number,
                    wo.asset_name.clone().unwrap_or_default()
                ),
                reference: Some(wo.wo_number.clone()),
                lines: vec![
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: debit_account_id,
                        description: Some(format!("Biaya Tenaga Kerja WO {}", wo.wo_number)),
                        debit: labor_cost,
                        credit: rust_decimal::Decimal::ZERO,
                    },
                    management_system_core::domain::entities::journal::CreateJournalLineRequest {
                        account_id: labor_applied_acc.id,
                        description: Some(format!("Alokasi Tenaga Kerja WO {}", wo.wo_number)),
                        debit: rust_decimal::Decimal::ZERO,
                        credit: labor_cost,
                    },
                ],
            };

        let _ = self.journal_service.create_entry(journal_req, None).await?;

        Ok(())
    }

    async fn handle_rental_invoice_generated(
        &self,
        period: management_system_core::domain::entities::rental_billing::RentalBillingPeriod,
    ) -> DomainResult<()> {
        let total = period.total_amount.unwrap_or_default();
        if total.is_zero() {
            return Ok(());
        }

        // 1. Fetch Rental to get Client
        let rental = self
            .rental_repo
            .find_by_id(period.rental_id)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?
            .ok_or_else(|| DomainError::not_found("Rental", period.rental_id))?;

        // 2. Create Sales Invoice
        let inv_number = period
            .invoice_number
            .clone()
            .unwrap_or_else(|| format!("INV-RNT-{}", period.id.to_string()[..8].to_uppercase()));

        let req = management_system_core::domain::entities::CreateSalesInvoiceRequest {
            invoice_number: inv_number,
            client_id: rental.client_id,
            date: period
                .invoice_date
                .unwrap_or_else(|| Utc::now().date_naive()),
            due_date: period.due_date,
            subject: Some(format!(
                "Rental Billing: {} ({} - {})",
                rental.rental_number, period.period_start, period.period_end
            )),
            items: vec![
                management_system_core::domain::entities::CreateInvoiceItemRequest {
                    description: format!("Rental Service Fee - Period {}", period.id),
                    quantity: 1.0,
                    unit_price: total.to_f64().unwrap_or_default(),
                    account_id: None,
                },
            ],
            attachment_url: None,
        };

        let _ = self.create_sales_invoice(req).await?;

        Ok(())
    }
}
