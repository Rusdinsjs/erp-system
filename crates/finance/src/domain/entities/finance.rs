//! Pure Finance Domain Entities (3R.1.1-002)
//!
//! Owned strictly by `crates/finance`. Contains NO sqlx persistence attributes.

use super::journal::JournalStatus;
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Asset,
    Liability,
    Equity,
    Revenue,
    Expense,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NormalBalance {
    Debit,
    Credit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

pub type Account = ChartOfAccount;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountTreeNode {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub account_type: AccountType,
    pub normal_balance: NormalBalance,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
    pub currency: String,
    pub children: Vec<AccountTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralLedgerEntry {
    pub date: NaiveDate,
    pub transaction_number: String,
    pub header_description: String,
    pub line_description: Option<String>,
    #[serde(with = "rust_decimal::serde::str")]
    pub debit: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub credit: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialBalanceEntry {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    #[serde(with = "rust_decimal::serde::str")]
    pub debit: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub credit: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialReportEntry {
    pub account_code: String,
    pub account_name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub balance: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseAnalysis {
    pub month: NaiveDate,
    pub expense_type: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
}

// --- Operational Finance Entities ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesInvoice {
    pub id: Uuid,
    pub invoice_number: String,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub subject: Option<String>,
    #[serde(with = "rust_decimal::serde::str")]
    pub subtotal: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub tax: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_paid: Decimal,
    pub status: String,
    pub journal_entry_id: Option<Uuid>,
    pub journal_status: Option<JournalStatus>,
    pub created_at: DateTime<Utc>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesInvoiceItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub unit_price: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_price: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub unit_price: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalesInvoiceRequest {
    pub invoice_number: String,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesInvoiceDetailResponse {
    #[serde(flatten)]
    pub invoice: SalesInvoice,
    pub items: Vec<SalesInvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseBill {
    pub id: Uuid,
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount_paid: Decimal,
    pub status: String,
    pub budget_type: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseBillRequest {
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub total_amount: Decimal,
    pub budget_type: Option<String>,
    pub items: Vec<CreateBillItemRequest>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBillItemRequest {
    pub description: String,
    pub amount: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub date: NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total_amount: Decimal,
    pub status: String,
    pub expense_type: Option<String>,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub expense_number: Option<String>,
    pub date: NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: String,
    pub amount: Decimal,
    pub expense_type: Option<String>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashBankTransaction {
    pub id: Uuid,
    pub transaction_number: String,
    pub transaction_type: String,
    pub date: NaiveDate,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCashBankTransactionRequest {
    pub transaction_number: Option<String>,
    pub transaction_type: String,
    pub date: NaiveDate,
    #[serde(with = "rust_decimal::serde::str")]
    pub amount: Decimal,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
}

// --- Sales Quotes, Orders & Shipments ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesQuote {
    pub id: Uuid,
    pub quote_number: String,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub expiry_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesQuoteRequest {
    pub quote_number: String,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub expiry_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrder {
    pub id: Uuid,
    pub order_number: String,
    pub quote_id: Option<Uuid>,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub delivery_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesOrderRequest {
    pub order_number: String,
    pub quote_id: Option<Uuid>,
    pub client_id: Uuid,
    pub date: NaiveDate,
    pub delivery_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesShipment {
    pub id: Uuid,
    pub shipment_number: String,
    pub sales_order_id: Uuid,
    pub client_id: Option<Uuid>,
    pub date: NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesShipmentRequest {
    pub shipment_number: String,
    pub sales_order_id: Uuid,
    pub date: NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
}

// --- Purchase Quotes, Orders & Shipments ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseQuote {
    pub id: Uuid,
    pub quote_number: String,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub expiry_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseQuoteRequest {
    pub quote_number: String,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub expiry_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateBillItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_number: String,
    pub purchase_quote_id: Option<Uuid>,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub delivery_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub budget_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub order_number: String,
    pub purchase_quote_id: Option<Uuid>,
    pub vendor_id: Uuid,
    pub date: NaiveDate,
    pub delivery_date: Option<NaiveDate>,
    pub subject: Option<String>,
    pub budget_type: Option<String>,
    pub items: Vec<CreateBillItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseShipment {
    pub id: Uuid,
    pub shipment_number: String,
    pub purchase_order_id: Uuid,
    pub vendor_id: Option<Uuid>,
    pub date: NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseShipmentRequest {
    pub shipment_number: String,
    pub purchase_order_id: Uuid,
    pub date: NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
}
