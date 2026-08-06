use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::*;
use management_system_core::domain::errors::{DomainError, DomainResult};
use management_system_core::infrastructure::database::UnitOfWork;

#[derive(Debug, sqlx::FromRow)]
struct ExpenseAnalysisRow {
    pub month: chrono::NaiveDate,
    pub expense_type: String,
    pub total_amount: Decimal,
}

impl From<ExpenseAnalysisRow> for ExpenseAnalysis {
    fn from(row: ExpenseAnalysisRow) -> Self {
        Self {
            month: row.month,
            expense_type: row.expense_type,
            total_amount: row.total_amount,
        }
    }
}

// --- Internal SQL persistence mapping rows (3R.1.1-002: Pure domain models carry 0 sqlx attributes) ---

#[derive(Debug, sqlx::FromRow)]
struct ChartOfAccountRow {
    id: Uuid,
    code: String,
    name: String,
    account_type: String,
    normal_balance: String,
    parent_id: Option<Uuid>,
    is_active: bool,
    description: Option<String>,
    currency: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<ChartOfAccountRow> for ChartOfAccount {
    fn from(r: ChartOfAccountRow) -> Self {
        let account_type = match r.account_type.to_lowercase().as_str() {
            "asset" => AccountType::Asset,
            "liability" => AccountType::Liability,
            "equity" => AccountType::Equity,
            "revenue" => AccountType::Revenue,
            _ => AccountType::Expense,
        };
        let normal_balance = match r.normal_balance.to_lowercase().as_str() {
            "debit" => NormalBalance::Debit,
            _ => NormalBalance::Credit,
        };
        Self {
            id: r.id,
            code: r.code,
            name: r.name,
            account_type,
            normal_balance,
            parent_id: r.parent_id,
            is_active: r.is_active,
            description: r.description,
            currency: r.currency,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct SalesInvoiceRow {
    id: Uuid,
    invoice_number: String,
    client_id: Uuid,
    date: chrono::NaiveDate,
    due_date: Option<chrono::NaiveDate>,
    subject: Option<String>,
    subtotal: Decimal,
    tax: Decimal,
    total_amount: Decimal,
    amount_paid: Decimal,
    status: String,
    journal_entry_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    attachment_url: Option<String>,
}

impl From<SalesInvoiceRow> for SalesInvoice {
    fn from(r: SalesInvoiceRow) -> Self {
        Self {
            id: r.id,
            invoice_number: r.invoice_number,
            client_id: r.client_id,
            date: r.date,
            due_date: r.due_date,
            subject: r.subject,
            subtotal: r.subtotal,
            tax: r.tax,
            total_amount: r.total_amount,
            amount_paid: r.amount_paid,
            status: r.status,
            journal_entry_id: r.journal_entry_id,
            journal_status: None,
            created_at: r.created_at,
            attachment_url: r.attachment_url,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct SalesInvoiceItemRow {
    id: Uuid,
    invoice_id: Uuid,
    description: String,
    quantity: Decimal,
    unit_price: Decimal,
    total_price: Decimal,
    account_id: Option<Uuid>,
}

impl From<SalesInvoiceItemRow> for SalesInvoiceItem {
    fn from(r: SalesInvoiceItemRow) -> Self {
        Self {
            id: r.id,
            invoice_id: r.invoice_id,
            description: r.description,
            quantity: r.quantity,
            unit_price: r.unit_price,
            total_price: r.total_price,
            account_id: r.account_id,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct PurchaseBillRow {
    id: Uuid,
    bill_number: String,
    vendor_id: Uuid,
    date: chrono::NaiveDate,
    due_date: Option<chrono::NaiveDate>,
    total_amount: Decimal,
    amount_paid: Decimal,
    status: String,
    budget_type: String,
    journal_entry_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    attachment_url: Option<String>,
}

impl From<PurchaseBillRow> for PurchaseBill {
    fn from(r: PurchaseBillRow) -> Self {
        Self {
            id: r.id,
            bill_number: r.bill_number,
            vendor_id: r.vendor_id,
            date: r.date,
            due_date: r.due_date,
            total_amount: r.total_amount,
            amount_paid: r.amount_paid,
            status: r.status,
            budget_type: r.budget_type,
            journal_entry_id: r.journal_entry_id,
            created_at: r.created_at,
            attachment_url: r.attachment_url,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct ExpenseRow {
    id: Uuid,
    expense_number: String,
    date: chrono::NaiveDate,
    pay_from_account_id: Uuid,
    recipient: String,
    total_amount: Decimal,
    status: String,
    expense_type: Option<String>,
    journal_entry_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    attachment_url: Option<String>,
}

impl From<ExpenseRow> for Expense {
    fn from(r: ExpenseRow) -> Self {
        Self {
            id: r.id,
            expense_number: r.expense_number,
            date: r.date,
            pay_from_account_id: r.pay_from_account_id,
            recipient: r.recipient,
            total_amount: r.total_amount,
            status: r.status,
            expense_type: r.expense_type,
            journal_entry_id: r.journal_entry_id,
            created_at: r.created_at,
            attachment_url: r.attachment_url,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct CashBankTransactionRow {
    id: Uuid,
    transaction_number: String,
    transaction_type: String,
    date: chrono::NaiveDate,
    amount: Decimal,
    from_account_id: Option<Uuid>,
    to_account_id: Option<Uuid>,
    account_id: Option<Uuid>,
    contact_name: Option<String>,
    description: Option<String>,
    journal_entry_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<CashBankTransactionRow> for CashBankTransaction {
    fn from(r: CashBankTransactionRow) -> Self {
        Self {
            id: r.id,
            transaction_number: r.transaction_number,
            transaction_type: r.transaction_type,
            date: r.date,
            amount: r.amount,
            from_account_id: r.from_account_id,
            to_account_id: r.to_account_id,
            account_id: r.account_id,
            contact_name: r.contact_name,
            description: r.description,
            journal_entry_id: r.journal_entry_id,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct SalesQuoteRow {
    id: Uuid,
    quote_number: String,
    client_id: Uuid,
    date: chrono::NaiveDate,
    expiry_date: Option<chrono::NaiveDate>,
    subject: Option<String>,
    subtotal: Decimal,
    tax: Decimal,
    total_amount: Decimal,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<SalesQuoteRow> for SalesQuote {
    fn from(r: SalesQuoteRow) -> Self {
        Self {
            id: r.id,
            quote_number: r.quote_number,
            client_id: r.client_id,
            date: r.date,
            expiry_date: r.expiry_date,
            subject: r.subject,
            subtotal: r.subtotal,
            tax: r.tax,
            total_amount: r.total_amount,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct SalesOrderRow {
    id: Uuid,
    order_number: String,
    quote_id: Option<Uuid>,
    client_id: Uuid,
    date: chrono::NaiveDate,
    delivery_date: Option<chrono::NaiveDate>,
    subject: Option<String>,
    subtotal: Decimal,
    tax: Decimal,
    total_amount: Decimal,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<SalesOrderRow> for SalesOrder {
    fn from(r: SalesOrderRow) -> Self {
        Self {
            id: r.id,
            order_number: r.order_number,
            quote_id: r.quote_id,
            client_id: r.client_id,
            date: r.date,
            delivery_date: r.delivery_date,
            subject: r.subject,
            subtotal: r.subtotal,
            tax: r.tax,
            total_amount: r.total_amount,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct SalesShipmentRow {
    id: Uuid,
    shipment_number: String,
    sales_order_id: Uuid,
    client_id: Option<Uuid>,
    date: chrono::NaiveDate,
    courier_name: Option<String>,
    tracking_number: Option<String>,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<SalesShipmentRow> for SalesShipment {
    fn from(r: SalesShipmentRow) -> Self {
        Self {
            id: r.id,
            shipment_number: r.shipment_number,
            sales_order_id: r.sales_order_id,
            client_id: r.client_id,
            date: r.date,
            courier_name: r.courier_name,
            tracking_number: r.tracking_number,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct PurchaseQuoteRow {
    id: Uuid,
    quote_number: String,
    vendor_id: Uuid,
    date: chrono::NaiveDate,
    expiry_date: Option<chrono::NaiveDate>,
    subject: Option<String>,
    subtotal: Decimal,
    tax: Decimal,
    total_amount: Decimal,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<PurchaseQuoteRow> for PurchaseQuote {
    fn from(r: PurchaseQuoteRow) -> Self {
        Self {
            id: r.id,
            quote_number: r.quote_number,
            vendor_id: r.vendor_id,
            date: r.date,
            expiry_date: r.expiry_date,
            subject: r.subject,
            subtotal: r.subtotal,
            tax: r.tax,
            total_amount: r.total_amount,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct PurchaseOrderRow {
    id: Uuid,
    order_number: String,
    purchase_quote_id: Option<Uuid>,
    vendor_id: Uuid,
    date: chrono::NaiveDate,
    delivery_date: Option<chrono::NaiveDate>,
    subject: Option<String>,
    subtotal: Decimal,
    tax: Decimal,
    total_amount: Decimal,
    status: String,
    budget_type: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<PurchaseOrderRow> for PurchaseOrder {
    fn from(r: PurchaseOrderRow) -> Self {
        Self {
            id: r.id,
            order_number: r.order_number,
            purchase_quote_id: r.purchase_quote_id,
            vendor_id: r.vendor_id,
            date: r.date,
            delivery_date: r.delivery_date,
            subject: r.subject,
            subtotal: r.subtotal,
            tax: r.tax,
            total_amount: r.total_amount,
            status: r.status,
            budget_type: r.budget_type,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct PurchaseShipmentRow {
    id: Uuid,
    shipment_number: String,
    purchase_order_id: Uuid,
    vendor_id: Option<Uuid>,
    date: chrono::NaiveDate,
    courier_name: Option<String>,
    tracking_number: Option<String>,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<PurchaseShipmentRow> for PurchaseShipment {
    fn from(r: PurchaseShipmentRow) -> Self {
        Self {
            id: r.id,
            shipment_number: r.shipment_number,
            purchase_order_id: r.purchase_order_id,
            vendor_id: r.vendor_id,
            date: r.date,
            courier_name: r.courier_name,
            tracking_number: r.tracking_number,
            status: r.status,
            created_at: r.created_at,
        }
    }
}

// --- Repository Implementation ---

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

    pub async fn get_capex_opex_analysis(
        &self,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<ExpenseAnalysis>> {
        let rows = sqlx::query_as::<_, ExpenseAnalysisRow>(
            r#"
            SELECT
                DATE_TRUNC('month', date)::date AS month,
                COALESCE(expense_type, 'General') AS expense_type,
                SUM(total_amount) AS total_amount
            FROM expenses
            WHERE ($1::date IS NULL OR date >= $1)
              AND ($2::date IS NULL OR date <= $2)
            GROUP BY DATE_TRUNC('month', date)::date, COALESCE(expense_type, 'General')
            ORDER BY month DESC, expense_type ASC
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
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

        let created_row = sqlx::query_as::<_, SalesInvoiceRow>(
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

        let created_invoice: SalesInvoice = created_row.into();

        let mut created_items = Vec::new();
        for item in items {
            let item_id = Uuid::new_v4();
            let total_price = item.quantity * item.unit_price;
            let item_row = sqlx::query_as::<_, SalesInvoiceItemRow>(
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

            created_items.push(item_row.into());
        }

        Ok((created_invoice, created_items))
    }

    pub async fn update_sales_invoice_with_uow(
        &self,
        uow: &mut UnitOfWork,
        invoice: &SalesInvoice,
        items: &[CreateInvoiceItemRequest],
    ) -> DomainResult<(SalesInvoice, Vec<SalesInvoiceItem>)> {
        let updated_row = sqlx::query_as::<_, SalesInvoiceRow>(
            r#"
            UPDATE sales_invoices
            SET invoice_number = $1, client_id = $2, date = $3, due_date = $4, subject = $5,
                subtotal = $6, tax = $7, total_amount = $8, amount_paid = $9, status = $10,
                attachment_url = $11
            WHERE id = $12
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
        .bind(invoice.amount_paid)
        .bind(&invoice.status)
        .bind(&invoice.attachment_url)
        .bind(invoice.id)
        .fetch_one(uow.conn())
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let updated_invoice: SalesInvoice = updated_row.into();

        sqlx::query("DELETE FROM sales_invoice_items WHERE invoice_id = $1")
            .bind(updated_invoice.id)
            .execute(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut updated_items = Vec::new();
        for item in items {
            let item_id = Uuid::new_v4();
            let total_price = item.quantity * item.unit_price;
            let item_row = sqlx::query_as::<_, SalesInvoiceItemRow>(
                r#"
                INSERT INTO sales_invoice_items (
                    id, invoice_id, description, quantity, unit_price, total_price, account_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, invoice_id, description, quantity, unit_price, total_price, account_id
                "#,
            )
            .bind(item_id)
            .bind(updated_invoice.id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(total_price)
            .bind(item.account_id)
            .fetch_one(uow.conn())
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;

            updated_items.push(item_row.into());
        }

        Ok((updated_invoice, updated_items))
    }

    pub async fn get_sales_invoice_by_id(&self, id: Uuid) -> DomainResult<Option<SalesInvoice>> {
        let row = sqlx::query_as::<_, SalesInvoiceRow>(
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

        Ok(row.map(Into::into))
    }

    pub async fn get_sales_invoice_items(
        &self,
        invoice_id: Uuid,
    ) -> DomainResult<Vec<SalesInvoiceItem>> {
        let rows = sqlx::query_as::<_, SalesInvoiceItemRow>(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price, account_id
            FROM sales_invoice_items
            WHERE invoice_id = $1
            "#,
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn list_sales_invoices(&self) -> DomainResult<Vec<SalesInvoice>> {
        let rows = sqlx::query_as::<_, SalesInvoiceRow>(
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

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn delete_sales_invoice(&self, id: Uuid) -> DomainResult<()> {
        sqlx::query("DELETE FROM sales_invoices WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::Database(e.to_string()))?;
        Ok(())
    }

    // --- Chart of Accounts queries ---

    pub async fn list_accounts(&self) -> DomainResult<Vec<ChartOfAccount>> {
        let rows = sqlx::query_as::<_, ChartOfAccountRow>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            ORDER BY code ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn get_account_by_id(&self, id: Uuid) -> DomainResult<Option<ChartOfAccount>> {
        let row = sqlx::query_as::<_, ChartOfAccountRow>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.map(Into::into))
    }

    pub async fn get_account_by_code(&self, code: &str) -> DomainResult<Option<ChartOfAccount>> {
        let row = sqlx::query_as::<_, ChartOfAccountRow>(
            r#"
            SELECT id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at
            FROM chart_of_accounts
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.map(Into::into))
    }

    pub async fn create_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let acc_type_str = match account.account_type {
            AccountType::Asset => "asset",
            AccountType::Liability => "liability",
            AccountType::Equity => "equity",
            AccountType::Revenue => "revenue",
            AccountType::Expense => "expense",
        };
        let norm_bal_str = match account.normal_balance {
            NormalBalance::Debit => "debit",
            NormalBalance::Credit => "credit",
        };

        let row = sqlx::query_as::<_, ChartOfAccountRow>(
            r#"
            INSERT INTO chart_of_accounts (id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at
            "#,
        )
        .bind(account.id)
        .bind(&account.code)
        .bind(&account.name)
        .bind(acc_type_str)
        .bind(norm_bal_str)
        .bind(account.parent_id)
        .bind(account.is_active)
        .bind(&account.description)
        .bind(&account.currency)
        .bind(account.created_at)
        .bind(account.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn update_account(&self, account: &ChartOfAccount) -> DomainResult<ChartOfAccount> {
        let row = sqlx::query_as::<_, ChartOfAccountRow>(
            r#"
            UPDATE chart_of_accounts
            SET name = $1, parent_id = $2, is_active = $3, description = $4, updated_at = NOW()
            WHERE id = $5
            RETURNING id, code, name, account_type, normal_balance, parent_id, is_active, description, currency, created_at, updated_at
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

        Ok(row.into())
    }

    pub async fn get_general_ledger(
        &self,
        account_id: Uuid,
        start_date: Option<chrono::NaiveDate>,
        end_date: Option<chrono::NaiveDate>,
    ) -> DomainResult<Vec<GeneralLedgerEntry>> {
        #[derive(sqlx::FromRow)]
        struct GLRow {
            date: chrono::NaiveDate,
            transaction_number: String,
            header_description: String,
            line_description: Option<String>,
            debit: Decimal,
            credit: Decimal,
        }

        let rows = sqlx::query_as::<_, GLRow>(
            r#"
            SELECT
                gl.posting_date AS date,
                gl.voucher_no AS transaction_number,
                gl.voucher_type AS header_description,
                NULL::text AS line_description,
                gl.debit,
                gl.credit
            FROM gl_entries gl
            WHERE gl.account_id = $1
              AND ($2::date IS NULL OR gl.posting_date >= $2)
              AND ($3::date IS NULL OR gl.posting_date <= $3)
            ORDER BY gl.posting_date ASC, gl.created_at ASC
            "#,
        )
        .bind(account_id)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let mut running_balance = Decimal::ZERO;
        let mut entries = Vec::new();

        for r in rows {
            running_balance += r.debit - r.credit;
            entries.push(GeneralLedgerEntry {
                date: r.date,
                transaction_number: r.transaction_number,
                header_description: r.header_description,
                line_description: r.line_description,
                debit: r.debit,
                credit: r.credit,
                balance: running_balance,
            });
        }

        Ok(entries)
    }

    pub async fn get_trial_balance(&self) -> DomainResult<Vec<TrialBalanceEntry>> {
        #[derive(sqlx::FromRow)]
        struct TBRow {
            account_id: Uuid,
            account_code: String,
            account_name: String,
            account_type: String,
            debit: Decimal,
            credit: Decimal,
        }

        let rows = sqlx::query_as::<_, TBRow>(
            r#"
            SELECT
                coa.id AS account_id,
                coa.code AS account_code,
                coa.name AS account_name,
                coa.account_type::text AS account_type,
                COALESCE(SUM(gl.debit), 0.0000) AS debit,
                COALESCE(SUM(gl.credit), 0.0000) AS credit
            FROM chart_of_accounts coa
            LEFT JOIN gl_entries gl ON coa.id = gl.account_id
            WHERE COALESCE(coa.is_group, FALSE) = FALSE AND coa.is_active = TRUE
            GROUP BY coa.id, coa.code, coa.name, coa.account_type
            ORDER BY coa.code ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        let entries = rows
            .into_iter()
            .map(|r| {
                let acc_type = match r.account_type.to_lowercase().as_str() {
                    "asset" => AccountType::Asset,
                    "liability" => AccountType::Liability,
                    "equity" => AccountType::Equity,
                    "revenue" => AccountType::Revenue,
                    "expense" => AccountType::Expense,
                    _ => AccountType::Asset,
                };
                TrialBalanceEntry {
                    account_id: r.account_id,
                    account_code: r.account_code,
                    account_name: r.account_name,
                    account_type: acc_type,
                    debit: r.debit,
                    credit: r.credit,
                }
            })
            .collect();

        Ok(entries)
    }

    // --- Other operational entity queries ---

    pub async fn create_purchase_bill(&self, bill: &PurchaseBill) -> DomainResult<PurchaseBill> {
        let row = sqlx::query_as::<_, PurchaseBillRow>(
            r#"
            INSERT INTO purchase_bills (id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, journal_entry_id, created_at, attachment_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        .bind(bill.created_at)
        .bind(&bill.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_purchase_bills(&self) -> DomainResult<Vec<PurchaseBill>> {
        let rows = sqlx::query_as::<_, PurchaseBillRow>(
            r#"
            SELECT id, bill_number, vendor_id, date, due_date, total_amount, amount_paid, status, budget_type, journal_entry_id, created_at, attachment_url
            FROM purchase_bills
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_expense(&self, expense: &Expense) -> DomainResult<Expense> {
        let row = sqlx::query_as::<_, ExpenseRow>(
            r#"
            INSERT INTO expenses (id, expense_number, date, pay_from_account_id, recipient, total_amount, status, expense_type, journal_entry_id, created_at, attachment_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        .bind(expense.created_at)
        .bind(&expense.attachment_url)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_expenses(&self) -> DomainResult<Vec<Expense>> {
        let rows = sqlx::query_as::<_, ExpenseRow>(
            r#"
            SELECT id, expense_number, date, pay_from_account_id, recipient, total_amount, status, expense_type, journal_entry_id, created_at, attachment_url
            FROM expenses
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_cash_bank_transaction(
        &self,
        tx: &CashBankTransaction,
    ) -> DomainResult<CashBankTransaction> {
        let row = sqlx::query_as::<_, CashBankTransactionRow>(
            r#"
            INSERT INTO cash_bank_transactions (id, transaction_number, transaction_type, date, amount, from_account_id, to_account_id, account_id, contact_name, description, journal_entry_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        .bind(tx.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_sales_quotes(&self) -> DomainResult<Vec<SalesQuote>> {
        let rows = sqlx::query_as::<_, SalesQuoteRow>(
            r#"
            SELECT id, quote_number, client_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at
            FROM sales_quotes
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_sales_quote(&self, quote: &SalesQuote) -> DomainResult<SalesQuote> {
        let row = sqlx::query_as::<_, SalesQuoteRow>(
            r#"
            INSERT INTO sales_quotes (id, quote_number, client_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        .bind(quote.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_sales_orders(&self) -> DomainResult<Vec<SalesOrder>> {
        let rows = sqlx::query_as::<_, SalesOrderRow>(
            r#"
            SELECT id, order_number, quote_id, client_id, date, delivery_date, subject, subtotal, tax, total_amount, status, created_at
            FROM sales_orders
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_sales_order(&self, order: &SalesOrder) -> DomainResult<SalesOrder> {
        let row = sqlx::query_as::<_, SalesOrderRow>(
            r#"
            INSERT INTO sales_orders (id, order_number, quote_id, client_id, date, delivery_date, subject, subtotal, tax, total_amount, status, created_at)
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
        .bind(order.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_sales_shipments(&self) -> DomainResult<Vec<SalesShipment>> {
        let rows = sqlx::query_as::<_, SalesShipmentRow>(
            r#"
            SELECT id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at
            FROM sales_shipments
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_sales_shipment(
        &self,
        shipment: &SalesShipment,
    ) -> DomainResult<SalesShipment> {
        let row = sqlx::query_as::<_, SalesShipmentRow>(
            r#"
            INSERT INTO sales_shipments (id, shipment_number, sales_order_id, client_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        .bind(shipment.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_purchase_quotes(&self) -> DomainResult<Vec<PurchaseQuote>> {
        let rows = sqlx::query_as::<_, PurchaseQuoteRow>(
            r#"
            SELECT id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at
            FROM purchase_quotes
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_purchase_quote(
        &self,
        quote: &PurchaseQuote,
    ) -> DomainResult<PurchaseQuote> {
        let row = sqlx::query_as::<_, PurchaseQuoteRow>(
            r#"
            INSERT INTO purchase_quotes (id, quote_number, vendor_id, date, expiry_date, subject, subtotal, tax, total_amount, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        .bind(quote.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_purchase_orders(&self) -> DomainResult<Vec<PurchaseOrder>> {
        let rows = sqlx::query_as::<_, PurchaseOrderRow>(
            r#"
            SELECT id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, budget_type, created_at
            FROM purchase_orders
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_purchase_order(
        &self,
        order: &PurchaseOrder,
    ) -> DomainResult<PurchaseOrder> {
        let row = sqlx::query_as::<_, PurchaseOrderRow>(
            r#"
            INSERT INTO purchase_orders (id, order_number, purchase_quote_id, vendor_id, date, delivery_date, subject, subtotal, tax, total_amount, status, budget_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        .bind(order.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }

    pub async fn list_purchase_shipments(&self) -> DomainResult<Vec<PurchaseShipment>> {
        let rows = sqlx::query_as::<_, PurchaseShipmentRow>(
            r#"
            SELECT id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at
            FROM purchase_shipments
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn create_purchase_shipment(
        &self,
        shipment: &PurchaseShipment,
    ) -> DomainResult<PurchaseShipment> {
        let row = sqlx::query_as::<_, PurchaseShipmentRow>(
            r#"
            INSERT INTO purchase_shipments (id, shipment_number, purchase_order_id, vendor_id, date, courier_name, tracking_number, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        .bind(shipment.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(row.into())
    }
}
