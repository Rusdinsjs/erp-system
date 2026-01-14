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
