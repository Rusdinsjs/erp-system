use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::entities::{
    AccountType, ChartOfAccount, GeneralLedgerEntry, NormalBalance, TrialBalanceEntry,
};
use management_system_core::domain::errors::{DomainError, DomainResult};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExpenseAnalysis {
    pub month: chrono::NaiveDate,
    pub expense_type: String,
    pub total_amount: f64,
}

#[derive(Clone)]
pub struct FinanceRepository {
    pool: PgPool,
}

impl FinanceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let rec = sqlx::query_as!(
            ChartOfAccount,
            r#"
            INSERT INTO chart_of_accounts (
                id, code, name, account_type, normal_balance, parent_id, 
                is_active, description, currency, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, code, name, account_type as "account_type: AccountType", 
                      normal_balance as "normal_balance: NormalBalance", parent_id, 
                      is_active, description, currency, created_at, updated_at
            "#,
            account.id,
            account.code,
            account.name,
            account.account_type as AccountType,
            account.normal_balance as NormalBalance,
            account.parent_id,
            account.is_active,
            account.description,
            account.currency,
            account.created_at,
            account.updated_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn list_all(&self) -> DomainResult<Vec<ChartOfAccount>> {
        let recs = sqlx::query_as!(
            ChartOfAccount,
            r#"
            SELECT 
                id, code, name, account_type as "account_type: AccountType", 
                normal_balance as "normal_balance: NormalBalance", parent_id, 
                is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            ORDER BY code ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ChartOfAccount>> {
        let rec = sqlx::query_as!(
            ChartOfAccount,
            r#"
            SELECT 
                id, code, name, account_type as "account_type: AccountType", 
                normal_balance as "normal_balance: NormalBalance", parent_id, 
                is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        let rec = sqlx::query_as!(
            ChartOfAccount,
            r#"
            SELECT 
                id, code, name, account_type as "account_type: AccountType", 
                normal_balance as "normal_balance: NormalBalance", parent_id, 
                is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE code = $1
            "#,
            code
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn update_account(
        &self,
        id: Uuid,
        name: Option<String>,
        parent_id: Option<Uuid>,
        is_active: Option<bool>,
        description: Option<String>,
    ) -> DomainResult<Option<ChartOfAccount>> {
        // Dynamic update using COALESCE isn't ideal for sqlx type checking sometimes,
        // but for specific fields it's okay.
        // Or we can fetch, update struct, and save.
        // Let's us specific update query.

        let rec = sqlx::query_as!(
            ChartOfAccount,
            r#"
            UPDATE chart_of_accounts
            SET 
                name = COALESCE($2, name),
                parent_id = COALESCE($3, parent_id),
                is_active = COALESCE($4, is_active),
                description = COALESCE($5, description),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, code, name, account_type as "account_type: AccountType", 
                      normal_balance as "normal_balance: NormalBalance", parent_id, 
                      is_active, description, currency, created_at, updated_at
            "#,
            id,
            name,
            parent_id,
            is_active,
            description
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn get_general_ledger(
        &self,
        account_id: Uuid,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<GeneralLedgerEntry>> {
        let recs = sqlx::query!(
            r#"
            SELECT 
                e.date as "date!",
                e.transaction_number as "transaction_number!",
                e.description as header_description,
                l.description as line_description,
                l.debit::FLOAT8 as "debit!",
                l.credit::FLOAT8 as "credit!"
            FROM journal_lines l
            JOIN journal_entries e ON l.journal_entry_id = e.id
            WHERE l.account_id = $1
            AND ($2::DATE IS NULL OR e.date >= $2)
            AND ($3::DATE IS NULL OR e.date <= $3)
            ORDER BY e.date ASC, e.created_at ASC
            "#,
            account_id,
            start_date as Option<chrono::NaiveDate>,
            end_date as Option<chrono::NaiveDate>
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut balance = 0.0;
        let entries = recs
            .into_iter()
            .map(|r| {
                let debit = r.debit;
                let credit = r.credit;
                balance += debit - credit;
                GeneralLedgerEntry {
                    date: r.date,
                    transaction_number: r.transaction_number,
                    header_description: r.header_description,
                    line_description: r.line_description,
                    debit,
                    credit,
                    balance,
                }
            })
            .collect();

        Ok(entries)
    }

    pub async fn get_trial_balance(&self) -> DomainResult<Vec<TrialBalanceEntry>> {
        let recs = sqlx::query!(
            r#"
            SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                a.account_type as "account_type: AccountType",
                COALESCE(SUM(l.debit), 0)::FLOAT8 as "total_debit!",
                COALESCE(SUM(l.credit), 0)::FLOAT8 as "total_credit!"
            FROM chart_of_accounts a
            LEFT JOIN journal_lines l ON a.id = l.account_id
            GROUP BY a.id, a.code, a.name, a.account_type
            ORDER BY a.code ASC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let entries = recs
            .into_iter()
            .map(|r| TrialBalanceEntry {
                account_id: r.account_id,
                account_code: r.account_code,
                account_name: r.account_name,
                account_type: r.account_type,
                debit: r.total_debit,
                credit: r.total_credit,
            })
            .collect();

        Ok(entries)
    }

    // --- Operational Finance CRUD ---

    pub async fn list_sales_invoices(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesInvoice>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::SalesInvoice,
            r#"
            SELECT id, invoice_number, client_id, date, due_date, subject, 
                   subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                   total_amount::FLOAT8 as "total_amount!", amount_paid::FLOAT8 as "amount_paid!", 
                   status, journal_entry_id, created_at, attachment_url
            FROM sales_invoices
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn list_purchase_bills(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseBill>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseBill,
            r#"
            SELECT id, bill_number, vendor_id, date, due_date, 
                   total_amount::FLOAT8 as "total_amount!", amount_paid::FLOAT8 as "amount_paid!", 
                   status, budget_type as "budget_type!", journal_entry_id, created_at, attachment_url
            FROM purchase_bills
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<management_system_core::domain::entities::Expense>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::Expense,
            r#"
            SELECT id, expense_number, date, pay_from_account_id, recipient, 
                   total_amount::FLOAT8 as "total_amount!", status, expense_type, 
                   journal_entry_id, created_at, attachment_url
            FROM expenses
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn list_cash_bank_transactions(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::CashBankTransaction>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::CashBankTransaction,
            r#"
            SELECT id, transaction_number, transaction_type, date, 
                   amount::FLOAT8 as "amount!", from_account_id, to_account_id, 
                   account_id, contact_name, description, journal_entry_id, created_at
            FROM cash_bank_transactions
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!("DELETE FROM sales_invoices WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_purchase_bill(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!("DELETE FROM purchase_bills WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_expense(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!("DELETE FROM expenses WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_cash_bank_transaction(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query!("DELETE FROM cash_bank_transactions WHERE id = $1", id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn create_cash_bank_transaction(
        &self,
        tx: &management_system_core::domain::entities::CashBankTransaction,
    ) -> DomainResult<management_system_core::domain::entities::CashBankTransaction> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::CashBankTransaction,
            r#"
            INSERT INTO cash_bank_transactions (
                id, transaction_number, transaction_type, date, amount, 
                from_account_id, to_account_id, account_id, contact_name, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, transaction_number, transaction_type, date, 
                      amount::FLOAT8 as "amount!", from_account_id, to_account_id, 
                      account_id, contact_name, description, journal_entry_id, created_at
            "#,
            tx.id,
            tx.transaction_number,
            tx.transaction_type,
            tx.date,
            tx.amount as f64,
            tx.from_account_id,
            tx.to_account_id,
            tx.account_id,
            tx.contact_name,
            tx.description
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn create_expense(
        &self,
        expense: &management_system_core::domain::entities::Expense,
    ) -> DomainResult<management_system_core::domain::entities::Expense> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::Expense,
            r#"
            INSERT INTO expenses (
                id, expense_number, date, pay_from_account_id, recipient, total_amount, 
                status, expense_type, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, expense_number, date, pay_from_account_id, recipient, 
                      total_amount::FLOAT8 as "total_amount!", status, expense_type, 
                      journal_entry_id, created_at, attachment_url
            "#,
            expense.id,
            expense.expense_number,
            expense.date,
            expense.pay_from_account_id,
            expense.recipient,
            expense.total_amount as f64,
            expense.status,
            expense.expense_type,
            expense.attachment_url
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn create_sales_invoice(
        &self,
        invoice: &management_system_core::domain::entities::SalesInvoice,
    ) -> DomainResult<management_system_core::domain::entities::SalesInvoice> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::SalesInvoice,
            r#"
            INSERT INTO sales_invoices (
                id, invoice_number, client_id, date, due_date, subject, 
                subtotal, tax, total_amount, amount_paid, status, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, invoice_number, client_id, date, due_date, subject, 
                      subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                      total_amount::FLOAT8 as "total_amount!", amount_paid::FLOAT8 as "amount_paid!", 
                      status, journal_entry_id, created_at, attachment_url
            "#,
            invoice.id,
            invoice.invoice_number,
            invoice.client_id,
            invoice.date,
            invoice.due_date,
            invoice.subject,
            invoice.subtotal as f64,
            invoice.tax as f64,
            invoice.total_amount as f64,
            invoice.amount_paid as f64,
            invoice.status,
            invoice.attachment_url
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn create_purchase_bill(
        &self,
        bill: &management_system_core::domain::entities::PurchaseBill,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseBill> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseBill,
            r#"
            INSERT INTO purchase_bills (
                id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, bill_number, vendor_id, date, due_date, 
                      total_amount::FLOAT8 as "total_amount!", amount_paid::FLOAT8 as "amount_paid!", 
                      status, budget_type as "budget_type!", journal_entry_id, created_at, attachment_url
            "#,
            bill.id,
            bill.bill_number,
            bill.vendor_id,
            bill.date,
            bill.due_date,
            bill.total_amount as f64,
            bill.amount_paid as f64,
            bill.status,
            bill.budget_type,
            bill.attachment_url
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    // --- New Sales Modules ---

    pub async fn list_sales_quotes(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesQuote>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::SalesQuote,
            r#"
            SELECT id, quote_number, client_id, date, expiry_date, subject, 
                   subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                   total_amount::FLOAT8 as "total_amount!", status, created_at
            FROM sales_quotes
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_sales_quote(
        &self,
        quote: &management_system_core::domain::entities::SalesQuote,
    ) -> DomainResult<management_system_core::domain::entities::SalesQuote> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::SalesQuote,
            r#"
            INSERT INTO sales_quotes (
                id, quote_number, client_id, date, expiry_date, subject, 
                subtotal, tax, total_amount, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, quote_number, client_id, date, expiry_date, subject, 
                      subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                      total_amount::FLOAT8 as "total_amount!", status, created_at
            "#,
            quote.id,
            quote.quote_number,
            quote.client_id,
            quote.date,
            quote.expiry_date,
            quote.subject,
            quote.subtotal as f64,
            quote.tax as f64,
            quote.total_amount as f64,
            quote.status
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn list_sales_orders(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesOrder>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::SalesOrder,
            r#"
            SELECT id, order_number, quote_id, client_id, date, delivery_date, subject, 
                   subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                   total_amount::FLOAT8 as "total_amount!", status, created_at
            FROM sales_orders
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_sales_order(
        &self,
        order: &management_system_core::domain::entities::SalesOrder,
    ) -> DomainResult<management_system_core::domain::entities::SalesOrder> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::SalesOrder,
            r#"
            INSERT INTO sales_orders (
                id, order_number, quote_id, client_id, date, delivery_date, subject, 
                subtotal, tax, total_amount, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_number, quote_id, client_id, date, delivery_date, subject, 
                      subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                      total_amount::FLOAT8 as "total_amount!", status, created_at
            "#,
            order.id,
            order.order_number,
            order.quote_id,
            order.client_id,
            order.date,
            order.delivery_date,
            order.subject,
            order.subtotal as f64,
            order.tax as f64,
            order.total_amount as f64,
            order.status
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn list_sales_shipments(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::SalesShipment>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::SalesShipment,
            r#"
            SELECT id, shipment_number, sales_order_id, client_id, date, courier_name, 
                   tracking_number, status, created_at
            FROM sales_shipments
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_sales_shipment(
        &self,
        tx: &management_system_core::domain::entities::SalesShipment,
    ) -> DomainResult<management_system_core::domain::entities::SalesShipment> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::SalesShipment,
            r#"
            INSERT INTO sales_shipments (id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at
            "#,
            tx.id,
            tx.shipment_number,
            tx.sales_order_id,
            tx.client_id,
            tx.date,
            tx.courier_name,
            tx.tracking_number,
            tx.status,
            tx.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    // --- Purchase Module Methods ---

    pub async fn list_purchase_quotes(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseQuote>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseQuote,
            r#"
            SELECT id, quote_number, vendor_id, date, expiry_date, subject, 
                   subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                   total_amount::FLOAT8 as "total_amount!", status, created_at as "created_at!"
            FROM purchase_quotes
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_purchase_quote(
        &self,
        quote: &management_system_core::domain::entities::PurchaseQuote,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseQuote> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseQuote,
            r#"
            INSERT INTO purchase_quotes (
                id, quote_number, vendor_id, date, expiry_date, subject, 
                subtotal, tax, total_amount, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, quote_number, vendor_id, date, expiry_date, subject, 
                      subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                      total_amount::FLOAT8 as "total_amount!", status, created_at as "created_at!"
            "#,
            quote.id,
            quote.quote_number,
            quote.vendor_id,
            quote.date,
            quote.expiry_date,
            quote.subject,
            quote.subtotal as f64,
            quote.tax as f64,
            quote.total_amount as f64,
            quote.status,
            quote.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn list_purchase_orders(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseOrder>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseOrder,
            r#"
            SELECT id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                   subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                   total_amount::FLOAT8 as "total_amount!", status, budget_type, created_at as "created_at!"
            FROM purchase_orders
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_purchase_order(
        &self,
        order: &management_system_core::domain::entities::PurchaseOrder,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseOrder> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseOrder,
            r#"
            INSERT INTO purchase_orders (
                id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                subtotal, tax, total_amount, status, budget_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                      subtotal::FLOAT8 as "subtotal!", tax::FLOAT8 as "tax!", 
                      total_amount::FLOAT8 as "total_amount!", status, budget_type, created_at as "created_at!"
            "#,
            order.id,
            order.order_number,
            order.purchase_quote_id,
            order.vendor_id,
            order.date,
            order.delivery_date,
            order.subject,
            order.subtotal as f64,
            order.tax as f64,
            order.total_amount as f64,
            order.status,
            order.budget_type,
            order.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn list_purchase_shipments(
        &self,
    ) -> DomainResult<Vec<management_system_core::domain::entities::PurchaseShipment>> {
        let recs = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseShipment,
            r#"
            SELECT id, shipment_number, purchase_order_id, vendor_id, date, courier_name, 
                   tracking_number, status, created_at as "created_at!"
            FROM purchase_shipments
            ORDER BY date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }

    pub async fn create_purchase_shipment(
        &self,
        tx: &management_system_core::domain::entities::PurchaseShipment,
    ) -> DomainResult<management_system_core::domain::entities::PurchaseShipment> {
        let rec = sqlx::query_as!(
            management_system_core::domain::entities::PurchaseShipment,
            r#"
            INSERT INTO purchase_shipments (id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at as "created_at!"
            "#,
            tx.id,
            tx.shipment_number,
            tx.purchase_order_id,
            tx.vendor_id,
            tx.date,
            tx.courier_name,
            tx.tracking_number,
            tx.status,
            tx.created_at
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(rec)
    }

    pub async fn get_expense_analysis(
        &self,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<ExpenseAnalysis>> {
        let recs = sqlx::query_as!(
            ExpenseAnalysis,
            r#"
            SELECT 
                DATE_TRUNC('month', date)::DATE as "month!",
                type as "expense_type!",
                SUM(total_amount)::FLOAT8 as "total_amount!"
            FROM (
                SELECT date, expense_type as type, total_amount FROM expenses
                UNION ALL
                SELECT date, budget_type as type, total_amount FROM purchase_bills
            ) combined
            WHERE ($1::DATE IS NULL OR date >= $1)
            AND ($2::DATE IS NULL OR date <= $2)
            GROUP BY 1, 2
            ORDER BY 1 ASC
            "#,
            start_date,
            end_date
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(recs)
    }
}
