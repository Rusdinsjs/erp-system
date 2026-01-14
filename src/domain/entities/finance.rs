//! Finance Entities
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "account_type", rename_all = "lowercase")]
pub enum AccountType {
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "normal_balance", rename_all = "lowercase")]
pub enum NormalBalance {
    Debit,
    Credit,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChartOfAccount {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub account_type: AccountType,
    pub normal_balance: NormalBalance,
    pub parent_id: Option<Uuid>,
    pub is_active: bool,
    pub description: Option<String>,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub code: String,
    pub name: String,
    pub account_type: AccountType,
    pub normal_balance: NormalBalance,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AccountTreeNode {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub account_type: AccountType,
    pub normal_balance: NormalBalance,
    pub is_active: bool,
    pub currency: String,
    pub children: Vec<AccountTreeNode>,
}
#[derive(Debug, Serialize)]
pub struct GeneralLedgerEntry {
    pub date: chrono::NaiveDate,
    pub transaction_number: String,
    pub header_description: String,
    pub line_description: Option<String>,
    pub debit: f64,
    pub credit: f64,
    pub balance: f64,
}

#[derive(Debug, Serialize)]
pub struct TrialBalanceEntry {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    pub debit: f64,
    pub credit: f64,
}

#[derive(Debug, Serialize)]
pub struct FinancialReportEntry {
    pub account_code: String,
    pub account_name: String,
    pub balance: f64,
}

// --- Operational Finance Entities ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesInvoice {
    pub id: Uuid,
    pub invoice_number: String,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub total_amount: f64,
    pub amount_paid: f64,
    pub status: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesInvoiceItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseBill {
    pub id: Uuid,
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub total_amount: f64,
    pub amount_paid: f64,
    pub status: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub date: chrono::NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: Option<String>,
    pub total_amount: f64,
    pub status: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashBankTransaction {
    pub id: Uuid,
    pub transaction_number: String,
    pub transaction_type: String, // transfer, receive, send
    pub date: chrono::NaiveDate,
    pub amount: f64,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesInvoiceRequest {
    pub invoice_number: String,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseBillRequest {
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub items: Vec<CreateBillItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBillItemRequest {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub expense_number: String,
    pub date: chrono::NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: Option<String>,
    pub items: Vec<CreateExpenseItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseItemRequest {
    pub account_id: Uuid,
    pub description: Option<String>,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateCashBankTransactionRequest {
    pub transaction_number: Option<String>,
    pub transaction_type: String,
    pub date: chrono::NaiveDate,
    pub amount: f64,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
}
