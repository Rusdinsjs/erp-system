use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::entities::{
    AccountType, CashBankTransaction, ChartOfAccount, CreateInvoiceItemRequest, Expense,
    GeneralLedgerEntry, NormalBalance, PurchaseBill, PurchaseOrder, PurchaseQuote,
    PurchaseShipment, SalesInvoice, SalesInvoiceItem, SalesOrder, SalesQuote, SalesShipment,
    TrialBalanceEntry,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::database::UnitOfWork;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExpenseAnalysis {
    pub month: chrono::NaiveDate,
    pub expense_type: String,
    pub total_amount: Decimal,
}

#[derive(Clone)]
pub struct FinanceRepository {
    pool: PgPool,
}

impl FinanceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ChartOfAccount>> {
        self.get_account_by_id(id).await
    }

    pub async fn find_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        self.get_account_by_code(code).await
    }

    pub async fn list_all(&self) -> DomainResult<Vec<ChartOfAccount>> {
        self.list_accounts().await
    }

    pub async fn create_sales_invoice_with_uow(
        &self,
        uow: &mut UnitOfWork,
        invoice: &SalesInvoice,
        items: &[CreateInvoiceItemRequest],
    ) -> DomainResult<(SalesInvoice, Vec<SalesInvoiceItem>)> {
        if items.is_empty() {
            return Err(DomainError::validation(
                "items",
                "Sales invoice requires at least one line item",
            ));
        }

        let created_invoice = sqlx::query_as::<_, SalesInvoice>(
            r#"
            INSERT INTO sales_invoices (
                id, invoice_number, client_id, date, due_date, subject, 
                subtotal, tax, total_amount, amount_paid, status, journal_entry_id, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, invoice_number, client_id, date, due_date, subject, 
                      subtotal, tax, total_amount, amount_paid, 
                      status, journal_entry_id, created_at, attachment_url
            "#,
        )
        .bind(invoice.id)
        .bind(&invoice.invoice_number)
        .bind(invoice.client_id)
        .bind(invoice.date)
        .bind(invoice.due_date)
        .bind(&invoice.subject)
        .bind(invoice.subtotal)
        .bind(invoice.tax)
        .bind(invoice.total_amount)
        .bind(invoice.amount_paid)
        .bind(&invoice.status)
        .bind(invoice.journal_entry_id)
        .bind(&invoice.attachment_url)
        .fetch_one(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut created_items = Vec::new();
        for item in items {
            let item_id = Uuid::new_v4();
            let total_price = item.quantity * item.unit_price;
            let item_rec = sqlx::query_as::<_, SalesInvoiceItem>(
                r#"
                INSERT INTO sales_invoice_items (
                    id, invoice_id, description, quantity, unit_price, total_price, account_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, invoice_id, description, quantity, unit_price, total_price, account_id
                "#,
            )
            .bind(item_id)
            .bind(created_invoice.id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(total_price)
            .bind(item.account_id)
            .fetch_one(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
            created_items.push(item_rec);
        }

        Ok((created_invoice, created_items))
    }

    /// Update Sales Invoice header + replace line items atomically within UnitOfWork (3R.1-004)
    pub async fn update_sales_invoice_with_uow(
        &self,
        uow: &mut UnitOfWork,
        invoice: &SalesInvoice,
        items: &[CreateInvoiceItemRequest],
    ) -> DomainResult<(SalesInvoice, Vec<SalesInvoiceItem>)> {
        if items.is_empty() {
            return Err(DomainError::validation(
                "items",
                "Sales invoice requires at least one line item",
            ));
        }

        let updated_invoice = sqlx::query_as::<_, SalesInvoice>(
            r#"
            UPDATE sales_invoices 
            SET invoice_number = $1, client_id = $2, date = $3, due_date = $4, subject = $5, 
                subtotal = $6, tax = $7, total_amount = $8, attachment_url = $9
            WHERE id = $10
            RETURNING id, invoice_number, client_id, date, due_date, subject, 
                      subtotal, tax, total_amount, amount_paid, 
                      status, journal_entry_id, created_at, attachment_url
            "#,
        )
        .bind(&invoice.invoice_number)
        .bind(invoice.client_id)
        .bind(invoice.date)
        .bind(invoice.due_date)
        .bind(&invoice.subject)
        .bind(invoice.subtotal)
        .bind(invoice.tax)
        .bind(invoice.total_amount)
        .bind(&invoice.attachment_url)
        .bind(invoice.id)
        .fetch_one(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        // Synchronize lines: delete old line items and insert updated lines atomically (3R.1-004)
        sqlx::query("DELETE FROM sales_invoice_items WHERE invoice_id = $1")
            .bind(invoice.id)
            .execute(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut created_items = Vec::new();
        for item in items {
            let item_id = Uuid::new_v4();
            let total_price = item.quantity * item.unit_price;
            let item_rec = sqlx::query_as::<_, SalesInvoiceItem>(
                r#"
                INSERT INTO sales_invoice_items (
                    id, invoice_id, description, quantity, unit_price, total_price, account_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, invoice_id, description, quantity, unit_price, total_price, account_id
                "#,
            )
            .bind(item_id)
            .bind(invoice.id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(total_price)
            .bind(item.account_id)
            .fetch_one(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
            created_items.push(item_rec);
        }

        Ok((updated_invoice, created_items))
    }

    pub async fn get_sales_invoice_items(
        &self,
        invoice_id: Uuid,
    ) -> DomainResult<Vec<SalesInvoiceItem>> {
        let items = sqlx::query_as::<_, SalesInvoiceItem>(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price, account_id
            FROM sales_invoice_items
            WHERE invoice_id = $1
            ORDER BY id
            "#,
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(items)
    }

    pub async fn list_sales_invoices(&self) -> DomainResult<Vec<SalesInvoice>> {
        let invoices = sqlx::query_as::<_, SalesInvoice>(
            r#"
            SELECT id, invoice_number, client_id, date, due_date, subject, 
                   subtotal, tax, total_amount, amount_paid, 
                   status, journal_entry_id, created_at, attachment_url
            FROM sales_invoices
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(invoices)
    }

    pub async fn get_sales_invoice_by_id(&self, id: Uuid) -> DomainResult<Option<SalesInvoice>> {
        let invoice = sqlx::query_as::<_, SalesInvoice>(
            r#"
            SELECT id, invoice_number, client_id, date, due_date, subject, 
                   subtotal, tax, total_amount, amount_paid, 
                   status, journal_entry_id, created_at, attachment_url
            FROM sales_invoices
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(invoice)
    }

    pub async fn update_sales_invoice(&self, invoice: &SalesInvoice) -> DomainResult<SalesInvoice> {
        let updated = sqlx::query_as::<_, SalesInvoice>(
            r#"
            UPDATE sales_invoices 
            SET invoice_number = $1, client_id = $2, date = $3, due_date = $4, subject = $5, 
                subtotal = $6, tax = $7, total_amount = $8, attachment_url = $9
            WHERE id = $10
            RETURNING id, invoice_number, client_id, date, due_date, subject, 
                      subtotal, tax, total_amount, amount_paid, 
                      status, journal_entry_id, created_at, attachment_url
            "#,
        )
        .bind(&invoice.invoice_number)
        .bind(invoice.client_id)
        .bind(invoice.date)
        .bind(invoice.due_date)
        .bind(&invoice.subject)
        .bind(invoice.subtotal)
        .bind(invoice.tax)
        .bind(invoice.total_amount)
        .bind(&invoice.attachment_url)
        .bind(invoice.id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(updated)
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM sales_invoice_items WHERE invoice_id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        sqlx::query("DELETE FROM sales_invoices WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(())
    }

    // --- Chart of Accounts & General Ledger & Reports ---

    pub async fn list_accounts(&self) -> DomainResult<Vec<ChartOfAccount>> {
        let accounts = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency
            FROM chart_of_accounts
            ORDER BY code ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(accounts)
    }

    pub async fn get_account_by_id(&self, id: Uuid) -> DomainResult<Option<ChartOfAccount>> {
        let account = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency
            FROM chart_of_accounts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(account)
    }

    pub async fn get_account_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        let account = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency
            FROM chart_of_accounts
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(account)
    }

    pub async fn create_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let created = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, is_active, description, currency)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, code, name, account_type, normal_balance, parent_id, is_active, description, currency
            "#,
        )
        .bind(account.id)
        .bind(&account.code)
        .bind(&account.name)
        .bind(&account.account_type)
        .bind(&account.normal_balance)
        .bind(account.parent_id)
        .bind(account.is_active)
        .bind(&account.description)
        .bind(&account.currency)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    pub async fn update_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let updated = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            UPDATE chart_of_accounts
            SET name = $1, parent_id = $2, is_active = $3, description = $4
            WHERE id = $5
            RETURNING id, code, name, account_type, normal_balance, parent_id, is_active, description, currency
            "#,
        )
        .bind(&account.name)
        .bind(account.parent_id)
        .bind(account.is_active)
        .bind(&account.description)
        .bind(account.id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(updated)
    }

    pub async fn get_general_ledger(
        &self,
        account_id: Uuid,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<GeneralLedgerEntry>> {
        let entries = sqlx::query_as::<_, GeneralLedgerEntry>(
            r#"
            SELECT 
                jh.date,
                jh.entry_number as transaction_number,
                jh.description as header_description,
                jl.description as line_description,
                jl.debit,
                jl.credit,
                SUM(jl.debit - jl.credit) OVER (ORDER BY jh.date, jh.id, jl.id) as balance
            FROM journal_lines jl
            JOIN journal_headers jh ON jh.id = jl.header_id
            WHERE jl.account_id = $1
              AND ($2::date IS NULL OR jh.date >= $2)
              AND ($3::date IS NULL OR jh.date <= $3)
            ORDER BY jh.date ASC, jh.entry_number ASC
            "#,
        )
        .bind(account_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(entries)
    }

    pub async fn get_trial_balance(&self) -> DomainResult<Vec<TrialBalanceEntry>> {
        let entries = sqlx::query_as::<_, TrialBalanceEntry>(
            r#"
            SELECT 
                coa.id as account_id,
                coa.code as account_code,
                coa.name as account_name,
                coa.account_type,
                COALESCE(SUM(jl.debit), 0) as debit,
                COALESCE(SUM(jl.credit), 0) as credit
            FROM chart_of_accounts coa
            LEFT JOIN journal_lines jl ON jl.account_id = coa.id
            GROUP BY coa.id, coa.code, coa.name, coa.account_type
            ORDER BY coa.code ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(entries)
    }

    // --- Purchase Bills & Expenses & Cash/Bank ---

    pub async fn create_purchase_bill(&self, bill: &PurchaseBill) -> DomainResult<PurchaseBill> {
        let created = sqlx::query_as::<_, PurchaseBill>(
            r#"
            INSERT INTO purchase_bills (
                id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, journal_entry_id, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, journal_entry_id, created_at, attachment_url
            "#,
        )
        .bind(bill.id)
        .bind(&bill.bill_number)
        .bind(bill.vendor_id)
        .bind(bill.date)
        .bind(bill.due_date)
        .bind(bill.total_amount)
        .bind(bill.amount_paid)
        .bind(&bill.status)
        .bind(&bill.budget_type)
        .bind(bill.journal_entry_id)
        .bind(&bill.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    pub async fn list_purchase_bills(&self) -> DomainResult<Vec<PurchaseBill>> {
        let bills = sqlx::query_as::<_, PurchaseBill>(
            r#"
            SELECT id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, journal_entry_id, created_at, attachment_url
            FROM purchase_bills
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(bills)
    }

    pub async fn create_expense(&self, expense: &Expense) -> DomainResult<Expense> {
        let created = sqlx::query_as::<_, Expense>(
            r#"
            INSERT INTO expenses (
                id, expense_number, date, pay_from_account_id, recipient, total_amount, status, expense_type, journal_entry_id, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, expense_number, date, pay_from_account_id, recipient, total_amount, status, expense_type, journal_entry_id, created_at, attachment_url
            "#,
        )
        .bind(expense.id)
        .bind(&expense.expense_number)
        .bind(expense.date)
        .bind(expense.pay_from_account_id)
        .bind(&expense.recipient)
        .bind(expense.total_amount)
        .bind(&expense.status)
        .bind(&expense.expense_type)
        .bind(expense.journal_entry_id)
        .bind(&expense.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<Expense>> {
        let expenses = sqlx::query_as::<_, Expense>(
            r#"
            SELECT id, expense_number, date, pay_from_account_id, recipient, total_amount, status, expense_type, journal_entry_id, created_at, attachment_url
            FROM expenses
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(expenses)
    }

    pub async fn create_cash_bank_transaction(
        &self,
        tx: &CashBankTransaction,
    ) -> DomainResult<CashBankTransaction> {
        let created = sqlx::query_as::<_, CashBankTransaction>(
            r#"
            INSERT INTO cash_bank_transactions (
                id, transaction_number, transaction_type, date, amount, from_account_id, to_account_id, account_id, contact_name, description, journal_entry_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, transaction_number, transaction_type, date, amount, from_account_id, to_account_id, account_id, contact_name, description, journal_entry_id, created_at
            "#,
        )
        .bind(tx.id)
        .bind(&tx.transaction_number)
        .bind(&tx.transaction_type)
        .bind(tx.date)
        .bind(tx.amount)
        .bind(tx.from_account_id)
        .bind(tx.to_account_id)
        .bind(tx.account_id)
        .bind(&tx.contact_name)
        .bind(&tx.description)
        .bind(tx.journal_entry_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(created)
    }

    pub async fn list_cash_bank_transactions(&self) -> DomainResult<Vec<CashBankTransaction>> {
        let txs = sqlx::query_as::<_, CashBankTransaction>(
            r#"
            SELECT id, transaction_number, transaction_type, date, amount, from_account_id, to_account_id, account_id, contact_name, description, journal_entry_id, created_at
            FROM cash_bank_transactions
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(txs)
    }

    pub async fn get_expense_analysis_by_month(&self) -> DomainResult<Vec<ExpenseAnalysis>> {
        let records = sqlx::query_as::<_, ExpenseAnalysis>(
            r#"
            SELECT 
                DATE_TRUNC('month', date)::date as month,
                COALESCE(expense_type, 'General') as expense_type,
                SUM(total_amount) as total_amount
            FROM expenses
            GROUP BY DATE_TRUNC('month', date)::date, COALESCE(expense_type, 'General')
            ORDER BY month DESC, expense_type ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(records)
    }

    // --- Sales Quotes, Orders & Shipments ---

    pub async fn list_sales_quotes(&self) -> DomainResult<Vec<SalesQuote>> {
        let records = sqlx::query_as::<_, SalesQuote>(
            r#"SELECT id, quote_number, client_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at FROM sales_quotes ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_sales_quote(&self, quote: &SalesQuote) -> DomainResult<SalesQuote> {
        let created = sqlx::query_as::<_, SalesQuote>(
            r#"
            INSERT INTO sales_quotes (id, quote_number, client_id, date, expiry_date, subject, subtotal, tax, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, quote_number, client_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at
            "#,
        )
        .bind(quote.id)
        .bind(&quote.quote_number)
        .bind(quote.client_id)
        .bind(quote.date)
        .bind(quote.expiry_date)
        .bind(&quote.subject)
        .bind(quote.subtotal)
        .bind(quote.tax)
        .bind(quote.total_amount)
        .bind(&quote.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }

    pub async fn list_sales_orders(&self) -> DomainResult<Vec<SalesOrder>> {
        let records = sqlx::query_as::<_, SalesOrder>(
            r#"SELECT id, order_number, quote_id, client_id, date, delivery_date, subject, subtotal, tax, total_amount, status, created_at FROM sales_orders ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_sales_order(&self, order: &SalesOrder) -> DomainResult<SalesOrder> {
        let created = sqlx::query_as::<_, SalesOrder>(
            r#"
            INSERT INTO sales_orders (id, order_number, quote_id, client_id, date, delivery_date, subject, subtotal, tax, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_number, quote_id, client_id, date, delivery_date, subject, subtotal, tax, total_amount, status, created_at
            "#,
        )
        .bind(order.id)
        .bind(&order.order_number)
        .bind(order.quote_id)
        .bind(order.client_id)
        .bind(order.date)
        .bind(order.delivery_date)
        .bind(&order.subject)
        .bind(order.subtotal)
        .bind(order.tax)
        .bind(order.total_amount)
        .bind(&order.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }

    pub async fn list_sales_shipments(&self) -> DomainResult<Vec<SalesShipment>> {
        let records = sqlx::query_as::<_, SalesShipment>(
            r#"SELECT id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at FROM sales_shipments ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_sales_shipment(
        &self,
        shipment: &SalesShipment,
    ) -> DomainResult<SalesShipment> {
        let created = sqlx::query_as::<_, SalesShipment>(
            r#"
            INSERT INTO sales_shipments (id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at
            "#,
        )
        .bind(shipment.id)
        .bind(&shipment.shipment_number)
        .bind(shipment.sales_order_id)
        .bind(shipment.client_id)
        .bind(shipment.date)
        .bind(&shipment.courier_name)
        .bind(&shipment.tracking_number)
        .bind(&shipment.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }

    // --- Purchase Quotes, Orders & Shipments ---

    pub async fn list_purchase_quotes(&self) -> DomainResult<Vec<PurchaseQuote>> {
        let records = sqlx::query_as::<_, PurchaseQuote>(
            r#"SELECT id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at FROM purchase_quotes ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_purchase_quote(
        &self,
        quote: &PurchaseQuote,
    ) -> DomainResult<PurchaseQuote> {
        let created = sqlx::query_as::<_, PurchaseQuote>(
            r#"
            INSERT INTO purchase_quotes (id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at
            "#,
        )
        .bind(quote.id)
        .bind(&quote.quote_number)
        .bind(quote.vendor_id)
        .bind(quote.date)
        .bind(quote.expiry_date)
        .bind(&quote.subject)
        .bind(quote.subtotal)
        .bind(quote.tax)
        .bind(quote.total_amount)
        .bind(&quote.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }

    pub async fn list_purchase_orders(&self) -> DomainResult<Vec<PurchaseOrder>> {
        let records = sqlx::query_as::<_, PurchaseOrder>(
            r#"SELECT id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, budget_type, created_at FROM purchase_orders ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_purchase_order(
        &self,
        order: &PurchaseOrder,
    ) -> DomainResult<PurchaseOrder> {
        let created = sqlx::query_as::<_, PurchaseOrder>(
            r#"
            INSERT INTO purchase_orders (id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, budget_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, budget_type, created_at
            "#,
        )
        .bind(order.id)
        .bind(&order.order_number)
        .bind(order.purchase_quote_id)
        .bind(order.vendor_id)
        .bind(order.date)
        .bind(order.delivery_date)
        .bind(&order.subject)
        .bind(order.subtotal)
        .bind(order.tax)
        .bind(order.total_amount)
        .bind(&order.status)
        .bind(&order.budget_type)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }

    pub async fn list_purchase_shipments(&self) -> DomainResult<Vec<PurchaseShipment>> {
        let records = sqlx::query_as::<_, PurchaseShipment>(
            r#"SELECT id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at FROM purchase_shipments ORDER BY created_at DESC"#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(records)
    }

    pub async fn create_purchase_shipment(
        &self,
        shipment: &PurchaseShipment,
    ) -> DomainResult<PurchaseShipment> {
        let created = sqlx::query_as::<_, PurchaseShipment>(
            r#"
            INSERT INTO purchase_shipments (id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at
            "#,
        )
        .bind(shipment.id)
        .bind(&shipment.shipment_number)
        .bind(shipment.purchase_order_id)
        .bind(shipment.vendor_id)
        .bind(shipment.date)
        .bind(&shipment.courier_name)
        .bind(&shipment.tracking_number)
        .bind(&shipment.status)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(created)
    }
}
