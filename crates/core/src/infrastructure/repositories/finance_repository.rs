use sqlx::PgPool;
use uuid::Uuid;
use rust_decimal::Decimal;

use crate::domain::entities::{
    AccountType, ChartOfAccount, GeneralLedgerEntry, NormalBalance, TrialBalanceEntry,
};
use crate::domain::errors::{DomainError, DomainResult};
use serde::{Deserialize, Serialize};

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

    pub async fn create_sales_invoice_with_uow(
        &self,
        uow: &mut crate::infrastructure::database::UnitOfWork,
        invoice: &crate::domain::entities::SalesInvoice,
        items: &[crate::domain::entities::CreateInvoiceItemRequest],
    ) -> DomainResult<(
        crate::domain::entities::SalesInvoice,
        Vec<crate::domain::entities::SalesInvoiceItem>,
    )> {
        let created_invoice = sqlx::query_as::<_, crate::domain::entities::SalesInvoice>(
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
            let item_rec = sqlx::query_as::<_, crate::domain::entities::SalesInvoiceItem>(
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

    pub async fn get_sales_invoice_items(
        &self,
        invoice_id: Uuid,
    ) -> DomainResult<Vec<crate::domain::entities::SalesInvoiceItem>> {
        let items = sqlx::query_as::<_, crate::domain::entities::SalesInvoiceItem>(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price, account_id
            FROM sales_invoice_items
            WHERE invoice_id = $1
            ORDER BY id ASC
            "#,
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(items)
    }

    pub async fn create_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let rec = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            INSERT INTO chart_of_accounts (
                id, code, name, account_type, normal_balance, parent_id, 
                is_active, description, currency, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, code, name, account_type, 
                      normal_balance, 
                      parent_id, is_active, description, currency, created_at, updated_at
            "#,
        )
        .bind(account.id)
        .bind(&account.code)
        .bind(&account.name)
        .bind(account.account_type)
        .bind(account.normal_balance)
        .bind(account.parent_id)
        .bind(account.is_active)
        .bind(&account.description)
        .bind(&account.currency)
        .bind(account.created_at)
        .bind(account.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        let rec = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, 
                   normal_balance, 
                   parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<ChartOfAccount>> {
        let rec = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, 
                   normal_balance, 
                   parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn list_all(&self) -> DomainResult<Vec<ChartOfAccount>> {
        let recs = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, 
                   normal_balance, 
                   parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            ORDER BY code ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn update(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let rec = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            UPDATE chart_of_accounts
            SET name = $1, account_type = $2, normal_balance = $3, parent_id = $4,
                is_active = $5, description = $6, currency = $7, updated_at = $8
            WHERE id = $9
            RETURNING id, code, name, account_type, 
                      normal_balance, 
                      parent_id, is_active, description, currency, created_at, updated_at
            "#,
        )
        .bind(&account.name)
        .bind(account.account_type)
        .bind(account.normal_balance)
        .bind(account.parent_id)
        .bind(account.is_active)
        .bind(&account.description)
        .bind(&account.currency)
        .bind(account.updated_at)
        .bind(account.id)
        .fetch_one(&self.pool)
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
        let existing = match self.find_by_id(id).await? {
            Some(a) => a,
            None => return Ok(None),
        };
        let updated = ChartOfAccount {
            name: name.unwrap_or(existing.name),
            parent_id: parent_id.or(existing.parent_id),
            is_active: is_active.unwrap_or(existing.is_active),
            description: description.or(existing.description),
            updated_at: chrono::Utc::now(),
            ..existing
        };
        let res = self.update(&updated).await?;
        Ok(Some(res))
    }

    pub async fn find_account_by_name_or_code(
        &self,
        name: &str,
        code: Option<&str>,
    ) -> DomainResult<Option<ChartOfAccount>> {
        let rec = sqlx::query_as::<_, ChartOfAccount>(
            r#"
            SELECT id, code, name, account_type, 
                   normal_balance, 
                   parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE name = $1 OR ($2 IS NOT NULL AND code = $2)
            "#,
        )
        .bind(name)
        .bind(code)
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
        #[derive(sqlx::FromRow)]
        struct GlRow {
            date: chrono::NaiveDate,
            transaction_number: String,
            header_description: Option<String>,
            line_description: Option<String>,
            debit: Decimal,
            credit: Decimal,
        }

        let recs = sqlx::query_as::<_, GlRow>(
            r#"
            SELECT 
                e.date as date,
                e.transaction_number as transaction_number,
                e.description as header_description,
                l.description as line_description,
                l.debit as debit,
                l.credit as credit
            FROM journal_lines l
            JOIN journal_entries e ON l.journal_entry_id = e.id
            WHERE l.account_id = $1
            AND ($2::DATE IS NULL OR e.date >= $2)
            AND ($3::DATE IS NULL OR e.date <= $3)
            ORDER BY e.date ASC, e.created_at ASC
            "#,
        )
        .bind(account_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut balance = rust_decimal::Decimal::ZERO;
        let entries = recs
            .into_iter()
            .map(|r| {
                let debit = r.debit;
                let credit = r.credit;
                balance += debit - credit;
                GeneralLedgerEntry {
                    date: r.date,
                    transaction_number: r.transaction_number,
                    header_description: r.header_description.unwrap_or_default(),
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
        #[derive(sqlx::FromRow)]
        struct TbRow {
            account_id: Uuid,
            account_code: String,
            account_name: String,
            account_type: AccountType,
            total_debit: Decimal,
            total_credit: Decimal,
        }

        let recs = sqlx::query_as::<_, TbRow>(
            r#"
            SELECT 
                a.id as account_id,
                a.code as account_code,
                a.name as account_name,
                a.account_type as account_type,
                COALESCE(SUM(l.debit), 0) as total_debit,
                COALESCE(SUM(l.credit), 0) as total_credit
            FROM chart_of_accounts a
            LEFT JOIN journal_lines l ON a.id = l.account_id
            GROUP BY a.id, a.code, a.name, a.account_type
            ORDER BY a.code ASC
            "#,
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
    ) -> DomainResult<Vec<crate::domain::entities::SalesInvoice>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::SalesInvoice>(
            r#"
            SELECT id, invoice_number, client_id, date, due_date, subject, 
                   subtotal, tax, total_amount, amount_paid, 
                   status, journal_entry_id, created_at, attachment_url
            FROM sales_invoices
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn list_purchase_bills(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::PurchaseBill>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::PurchaseBill>(
            r#"
            SELECT id, bill_number, vendor_id, date, due_date, 
                   total_amount, amount_paid, 
                   status, budget_type, journal_entry_id, created_at, attachment_url
            FROM purchase_bills
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<crate::domain::entities::Expense>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::Expense>(
            r#"
            SELECT id, expense_number, date, pay_from_account_id, recipient, 
                   total_amount, status, expense_type, 
                   journal_entry_id, created_at, attachment_url
            FROM expenses
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn list_cash_bank_transactions(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::CashBankTransaction>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::CashBankTransaction>(
            r#"
            SELECT id, transaction_number, transaction_type, date, 
                   amount, from_account_id, to_account_id, 
                   account_id, contact_name, description, journal_entry_id, created_at
            FROM cash_bank_transactions
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn get_sales_invoice_by_id(
        &self,
        id: Uuid,
    ) -> DomainResult<Option<crate::domain::entities::SalesInvoice>> {
        let rec = sqlx::query_as::<_, crate::domain::entities::SalesInvoice>(
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
        Ok(rec)
    }

    pub async fn update_sales_invoice(
        &self,
        invoice: &crate::domain::entities::SalesInvoice,
    ) -> DomainResult<crate::domain::entities::SalesInvoice> {
        sqlx::query(
            r#"
            UPDATE sales_invoices
            SET invoice_number = $1, client_id = $2, date = $3, due_date = $4, subject = $5,
                subtotal = $6, tax = $7, total_amount = $8, amount_paid = $9, status = $10,
                attachment_url = $11
            WHERE id = $12
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
        .bind(invoice.amount_paid)
        .bind(&invoice.status)
        .bind(&invoice.attachment_url)
        .bind(invoice.id)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(invoice.clone())
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM sales_invoices WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_purchase_bill(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM purchase_bills WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_expense(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM expenses WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn delete_cash_bank_transaction(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM cash_bank_transactions WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    pub async fn create_cash_bank_transaction(
        &self,
        tx: &crate::domain::entities::CashBankTransaction,
    ) -> DomainResult<crate::domain::entities::CashBankTransaction> {
        let rec = sqlx::query_as::<_, crate::domain::entities::CashBankTransaction>(
            r#"
            INSERT INTO cash_bank_transactions (
                id, transaction_number, transaction_type, date, amount, 
                from_account_id, to_account_id, account_id, contact_name, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, transaction_number, transaction_type, date, 
                      amount, from_account_id, to_account_id, 
                      account_id, contact_name, description, journal_entry_id, created_at
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
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn create_expense(
        &self,
        expense: &crate::domain::entities::Expense,
    ) -> DomainResult<crate::domain::entities::Expense> {
        let rec = sqlx::query_as::<_, crate::domain::entities::Expense>(
            r#"
            INSERT INTO expenses (
                id, expense_number, date, pay_from_account_id, recipient, total_amount, 
                status, expense_type, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, expense_number, date, pay_from_account_id, recipient, 
                      total_amount, status, expense_type, 
                      journal_entry_id, created_at, attachment_url
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
        .bind(&expense.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn create_sales_invoice(
        &self,
        invoice: &crate::domain::entities::SalesInvoice,
    ) -> DomainResult<crate::domain::entities::SalesInvoice> {
        let rec = sqlx::query_as::<_, crate::domain::entities::SalesInvoice>(
            r#"
            INSERT INTO sales_invoices (
                id, invoice_number, client_id, date, due_date, subject, 
                subtotal, tax, total_amount, amount_paid, status, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        .bind(&invoice.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn create_purchase_bill(
        &self,
        bill: &crate::domain::entities::PurchaseBill,
    ) -> DomainResult<crate::domain::entities::PurchaseBill> {
        let rec = sqlx::query_as::<_, crate::domain::entities::PurchaseBill>(
            r#"
            INSERT INTO purchase_bills (
                id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, attachment_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, bill_number, vendor_id, date, due_date, 
                      total_amount, amount_paid, 
                      status, budget_type, journal_entry_id, created_at, attachment_url
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
        .bind(&bill.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    // --- New Sales Modules ---

    pub async fn list_sales_quotes(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::SalesQuote>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::SalesQuote>(
            r#"
            SELECT id, quote_number, client_id, date, expiry_date, subject, 
                   subtotal, tax, total_amount, status, created_at
            FROM sales_quotes
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_sales_quote(
        &self,
        quote: &crate::domain::entities::SalesQuote,
    ) -> DomainResult<crate::domain::entities::SalesQuote> {
        let rec = sqlx::query_as::<_, crate::domain::entities::SalesQuote>(
            r#"
            INSERT INTO sales_quotes (
                id, quote_number, client_id, date, expiry_date, subject, 
                subtotal, tax, total_amount, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, quote_number, client_id, date, expiry_date, subject, 
                      subtotal, tax, total_amount, status, created_at
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

        Ok(rec)
    }

    pub async fn list_sales_orders(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::SalesOrder>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::SalesOrder>(
            r#"
            SELECT id, order_number, quote_id, client_id, date, delivery_date, subject, 
                   subtotal, tax, total_amount, status, created_at
            FROM sales_orders
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_sales_order(
        &self,
        order: &crate::domain::entities::SalesOrder,
    ) -> DomainResult<crate::domain::entities::SalesOrder> {
        let rec = sqlx::query_as::<_, crate::domain::entities::SalesOrder>(
            r#"
            INSERT INTO sales_orders (
                id, order_number, quote_id, client_id, date, delivery_date, subject, 
                subtotal, tax, total_amount, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, order_number, quote_id, client_id, date, delivery_date, subject, 
                      subtotal, tax, total_amount, status, created_at
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

        Ok(rec)
    }

    pub async fn list_sales_shipments(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::SalesShipment>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::SalesShipment>(
            r#"
            SELECT id, shipment_number, sales_order_id, client_id, date, courier_name, 
                   tracking_number, status, created_at
            FROM sales_shipments
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_sales_shipment(
        &self,
        tx: &crate::domain::entities::SalesShipment,
    ) -> DomainResult<crate::domain::entities::SalesShipment> {
        let rec = sqlx::query_as::<_, crate::domain::entities::SalesShipment>(
            r#"
            INSERT INTO sales_shipments (id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at
            "#,
        )
        .bind(tx.id)
        .bind(&tx.shipment_number)
        .bind(tx.sales_order_id)
        .bind(tx.client_id)
        .bind(tx.date)
        .bind(&tx.courier_name)
        .bind(&tx.tracking_number)
        .bind(&tx.status)
        .bind(tx.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    // --- Purchase Module Methods ---

    pub async fn list_purchase_quotes(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::PurchaseQuote>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::PurchaseQuote>(
            r#"
            SELECT id, quote_number, vendor_id, date, expiry_date, subject, 
                   subtotal, tax, total_amount, status, created_at
            FROM purchase_quotes
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_purchase_quote(
        &self,
        quote: &crate::domain::entities::PurchaseQuote,
    ) -> DomainResult<crate::domain::entities::PurchaseQuote> {
        let rec = sqlx::query_as::<_, crate::domain::entities::PurchaseQuote>(
            r#"
            INSERT INTO purchase_quotes (
                id, quote_number, vendor_id, date, expiry_date, subject, 
                subtotal, tax, total_amount, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, quote_number, vendor_id, date, expiry_date, subject, 
                      subtotal, tax, total_amount, status, created_at
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
        .bind(quote.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn list_purchase_orders(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::PurchaseOrder>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::PurchaseOrder>(
            r#"
            SELECT id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                   subtotal, tax, total_amount, status, budget_type, created_at
            FROM purchase_orders
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_purchase_order(
        &self,
        order: &crate::domain::entities::PurchaseOrder,
    ) -> DomainResult<crate::domain::entities::PurchaseOrder> {
        let rec = sqlx::query_as::<_, crate::domain::entities::PurchaseOrder>(
            r#"
            INSERT INTO purchase_orders (
                id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                subtotal, tax, total_amount, status, budget_type, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, 
                      subtotal, tax, total_amount, status, budget_type, created_at
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
        .bind(order.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rec)
    }

    pub async fn list_purchase_shipments(
        &self,
    ) -> DomainResult<Vec<crate::domain::entities::PurchaseShipment>> {
        let recs = sqlx::query_as::<_, crate::domain::entities::PurchaseShipment>(
            r#"
            SELECT id, shipment_number, purchase_order_id, vendor_id, date, courier_name, 
                   tracking_number, status, created_at
            FROM purchase_shipments
            ORDER BY date DESC, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }

    pub async fn create_purchase_shipment(
        &self,
        tx: &crate::domain::entities::PurchaseShipment,
    ) -> DomainResult<crate::domain::entities::PurchaseShipment> {
        let rec = sqlx::query_as::<_, crate::domain::entities::PurchaseShipment>(
            r#"
            INSERT INTO purchase_shipments (id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at
            "#,
        )
        .bind(tx.id)
        .bind(&tx.shipment_number)
        .bind(tx.purchase_order_id)
        .bind(tx.vendor_id)
        .bind(tx.date)
        .bind(&tx.courier_name)
        .bind(&tx.tracking_number)
        .bind(&tx.status)
        .bind(tx.created_at)
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
        let recs = sqlx::query_as::<_, ExpenseAnalysis>(
            r#"
            SELECT 
                DATE_TRUNC('month', date)::DATE as month,
                type as expense_type,
                SUM(total_amount) as total_amount
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
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(recs)
    }
}
