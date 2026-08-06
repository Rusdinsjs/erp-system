//! Finance Entities
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
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
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    pub normal_balance: NormalBalance,
    pub parent_id: Option<Uuid>,
    pub is_active: bool,
    pub currency: String,
    pub children: Vec<AccountTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GeneralLedgerEntry {
    pub date: chrono::NaiveDate,
    pub transaction_number: String,
    pub header_description: String,
    pub line_description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
    pub balance: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TrialBalanceEntry {
    pub account_id: Uuid,
    pub account_code: String,
    pub account_name: String,
    pub account_type: AccountType,
    pub debit: Decimal,
    pub credit: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FinancialReportEntry {
    pub account_code: String,
    pub account_name: String,
    pub balance: Decimal,
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
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub amount_paid: Decimal,
    pub status: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesInvoiceItem {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub total_price: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesInvoiceDetailResponse {
    #[serde(flatten)]
    pub invoice: SalesInvoice,
    pub items: Vec<SalesInvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseBill {
    pub id: Uuid,
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub total_amount: Decimal,
    pub amount_paid: Decimal,
    pub status: String,
    pub budget_type: String,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Expense {
    pub id: Uuid,
    pub expense_number: String,
    pub date: chrono::NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: Option<String>,
    pub total_amount: Decimal,
    pub status: String,
    pub expense_type: String, // OPEX or CAPEX
    pub journal_entry_id: Option<Uuid>,
    pub attachment_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashBankTransaction {
    pub id: Uuid,
    pub transaction_number: String,
    pub transaction_type: String, // transfer, receive, send
    pub date: chrono::NaiveDate,
    pub amount: Decimal,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
    pub journal_entry_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesQuote {
    pub id: Uuid,
    pub quote_number: String,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesOrder {
    pub id: Uuid,
    pub order_number: String,
    pub quote_id: Option<Uuid>,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub delivery_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesShipment {
    pub id: Uuid,
    pub shipment_number: String,
    pub sales_order_id: Option<Uuid>,
    pub client_id: Option<Uuid>,
    pub date: chrono::NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// --- Purchase Module ---

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseQuote {
    pub id: Uuid,
    pub quote_number: String,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
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
    pub date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>, // Reusing for simplicity
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_number: String,
    pub purchase_quote_id: Option<Uuid>,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub delivery_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub total_amount: Decimal,
    pub status: String,
    pub budget_type: String, // OPEX or CAPEX
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub order_number: String,
    pub purchase_quote_id: Option<Uuid>,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub delivery_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub budget_type: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseShipment {
    pub id: Uuid,
    pub shipment_number: String,
    pub purchase_order_id: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub date: chrono::NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseShipmentRequest {
    pub shipment_number: String,
    pub purchase_order_id: Option<Uuid>,
    pub date: chrono::NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub items: Vec<CreateShipmentItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesInvoiceRequest {
    pub invoice_number: String,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseBillRequest {
    pub bill_number: String,
    pub vendor_id: Uuid,
    pub date: chrono::NaiveDate,
    pub due_date: Option<chrono::NaiveDate>,
    pub budget_type: Option<String>,
    pub account_payable_id: Option<Uuid>,
    pub items: Vec<CreateBillItemRequest>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBillItemRequest {
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub expense_number: String,
    pub date: chrono::NaiveDate,
    pub pay_from_account_id: Uuid,
    pub recipient: Option<String>,
    pub status: Option<String>,
    pub expense_type: Option<String>,
    pub items: Vec<CreateExpenseItemRequest>,
    pub attachment_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseItemRequest {
    pub account_id: Uuid,
    pub description: Option<String>,
    pub amount: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct CreateCashBankTransactionRequest {
    pub transaction_number: Option<String>,
    pub transaction_type: String,
    pub date: chrono::NaiveDate,
    pub amount: Decimal,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub account_id: Option<Uuid>,
    pub contact_name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesQuoteRequest {
    pub quote_number: String,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>, // Reusing Item Request
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesOrderRequest {
    pub order_number: String,
    pub quote_id: Option<Uuid>,
    pub client_id: Uuid,
    pub date: chrono::NaiveDate,
    pub delivery_date: Option<chrono::NaiveDate>,
    pub subject: Option<String>,
    pub items: Vec<CreateInvoiceItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesShipmentRequest {
    pub shipment_number: String,
    pub sales_order_id: Option<Uuid>,
    pub date: chrono::NaiveDate,
    pub courier_name: Option<String>,
    pub tracking_number: Option<String>,
    pub recipient_name: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CreateShipmentItemRequest>,
}

#[derive(Debug, Deserialize)]
pub struct CreateShipmentItemRequest {
    pub order_item_id: Option<Uuid>,
    pub description: String,
    pub quantity_shipped: Decimal,
}
