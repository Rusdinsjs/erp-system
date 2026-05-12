use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::domain::entities::{CreateAccountRequest, UpdateAccountRequest};
use crate::shared::errors::AppError;

/// Create a new account
pub async fn create_account(
    State(state): State<AppState>,
    Json(payload): Json<CreateAccountRequest>,
) -> Result<Json<Value>, AppError> {
    let account = state.finance_service.create_account(payload).await?;

    Ok(Json(json!({
        "success": true,
        "data": account
    })))
}

/// List all accounts
pub async fn list_accounts(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let accounts = state.finance_service.list_all().await?;

    Ok(Json(json!({
        "success": true,
        "data": accounts
    })))
}

/// List accounts tree
pub async fn list_accounts_tree(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let tree = state.finance_service.list_tree().await?;

    Ok(Json(json!({
        "success": true,
        "data": tree
    })))
}

/// Update account
pub async fn update_account(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateAccountRequest>,
) -> Result<Json<Value>, AppError> {
    let account = state.finance_service.update_account(id, payload).await?;

    Ok(Json(json!({
        "success": true,
        "data": account
    })))
}

// --- Operational Finance Handlers ---

pub async fn list_sales_invoices(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let invoices = state.finance_service.list_sales_invoices().await?;
    Ok(Json(json!({ "success": true, "data": invoices })))
}

pub async fn list_purchase_bills(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let bills = state.finance_service.list_purchase_bills().await?;
    Ok(Json(json!({ "success": true, "data": bills })))
}

pub async fn list_expenses(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let expenses = state.finance_service.list_expenses().await?;
    Ok(Json(json!({ "success": true, "data": expenses })))
}

pub async fn list_cash_bank_transactions(
    State(state): State<AppState>,
) -> Result<Json<Value>, AppError> {
    let transactions = state.finance_service.list_cash_bank_transactions().await?;
    Ok(Json(json!({ "success": true, "data": transactions })))
}

pub async fn create_sales_invoice(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateSalesInvoiceRequest>,
) -> Result<Json<Value>, AppError> {
    let invoice = state.finance_service.create_sales_invoice(payload).await?;
    Ok(Json(json!({ "success": true, "data": invoice })))
}

pub async fn create_purchase_bill(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreatePurchaseBillRequest>,
) -> Result<Json<Value>, AppError> {
    let bill = state.finance_service.create_purchase_bill(payload).await?;
    Ok(Json(json!({ "success": true, "data": bill })))
}

pub async fn create_expense(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateExpenseRequest>,
) -> Result<Json<Value>, AppError> {
    let expense = state.finance_service.create_expense(payload).await?;
    Ok(Json(json!({ "success": true, "data": expense })))
}

pub async fn create_cash_bank_transaction(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateCashBankTransactionRequest>,
) -> Result<Json<Value>, AppError> {
    let tx = state
        .finance_service
        .create_cash_bank_transaction(payload)
        .await?;
    Ok(Json(json!({ "success": true, "data": tx })))
}

pub async fn list_sales_quotes(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let quotes = state.finance_service.list_sales_quotes().await?;
    Ok(Json(json!({ "success": true, "data": quotes })))
}

pub async fn create_sales_quote(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateSalesQuoteRequest>,
) -> Result<Json<Value>, AppError> {
    let quote = state.finance_service.create_sales_quote(payload).await?;
    Ok(Json(json!({ "success": true, "data": quote })))
}

pub async fn list_sales_orders(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let orders = state.finance_service.list_sales_orders().await?;
    Ok(Json(json!({ "success": true, "data": orders })))
}

pub async fn create_sales_order(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateSalesOrderRequest>,
) -> Result<Json<Value>, AppError> {
    let order = state.finance_service.create_sales_order(payload).await?;
    Ok(Json(json!({ "success": true, "data": order })))
}

pub async fn list_sales_shipments(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let shipments = state.finance_service.list_sales_shipments().await?;
    Ok(Json(json!({ "success": true, "data": shipments })))
}

pub async fn create_sales_shipment(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreateSalesShipmentRequest>,
) -> Result<Json<Value>, AppError> {
    let shipment = state.finance_service.create_sales_shipment(payload).await?;
    Ok(Json(json!({ "success": true, "data": shipment })))
}

// --- Purchase Handlers ---

pub async fn list_purchase_quotes(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let quotes = state.finance_service.list_purchase_quotes().await?;
    Ok(Json(json!({ "success": true, "data": quotes })))
}

pub async fn create_purchase_quote(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreatePurchaseQuoteRequest>,
) -> Result<Json<Value>, AppError> {
    let quote = state.finance_service.create_purchase_quote(payload).await?;
    Ok(Json(json!({ "success": true, "data": quote })))
}

pub async fn list_purchase_orders(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let orders = state.finance_service.list_purchase_orders().await?;
    Ok(Json(json!({ "success": true, "data": orders })))
}

pub async fn create_purchase_order(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreatePurchaseOrderRequest>,
) -> Result<Json<Value>, AppError> {
    let order = state.finance_service.create_purchase_order(payload).await?;
    Ok(Json(json!({ "success": true, "data": order })))
}

pub async fn list_purchase_shipments(
    State(state): State<AppState>,
) -> Result<Json<Value>, AppError> {
    let shipments = state.finance_service.list_purchase_shipments().await?;
    Ok(Json(json!({ "success": true, "data": shipments })))
}

pub async fn create_purchase_shipment(
    State(state): State<AppState>,
    Json(payload): Json<crate::domain::entities::CreatePurchaseShipmentRequest>,
) -> Result<Json<Value>, AppError> {
    let shipment = state
        .finance_service
        .create_purchase_shipment(payload)
        .await?;
    Ok(Json(json!({ "success": true, "data": shipment })))
}
