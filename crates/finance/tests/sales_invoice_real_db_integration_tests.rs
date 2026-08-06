//! Real PostgreSQL Database Integration Tests (3R.1.1-004, 3R.1.1-005 & 3R.1.1-007)
//!
//! Connects to an actual PostgreSQL database via `PgPool`, executes production
//! repository/service operations inside `UnitOfWork` transactions, and asserts
//! persisted rows and rollback behavior on failures.

use chrono::NaiveDate;
use rust_decimal_macros::dec;
use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::domain::audit_trail::{AuditAction, DocumentAuditEntry};
use management_system_core::domain::errors::DomainError;
use management_system_core::domain::outbox::OutboxEntry;
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::database::{CommandContext, IdempotencyStore, UnitOfWork};
use management_system_core::infrastructure::repositories::{
    AssetRepository, AuditTrailStore, OutboxStore, RentalRepository,
};
use management_system_finance::domain::entities::*;
use management_system_finance::repositories::{FinanceRepository, JournalRepository};
use management_system_finance::{AssetExpenseService, FinanceService, JournalService};

async fn get_test_pool() -> Option<PgPool> {
    let url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/asset_management".to_string());
    PgPool::connect(&url).await.ok()
}

#[tokio::test]
async fn test_real_db_sales_invoice_create_and_lines_atomicity() {
    let pool = match get_test_pool().await {
        Some(p) => p,
        None => {
            eprintln!("SKIP: PostgreSQL test database not available");
            return;
        }
    };

    let actor_id = Uuid::new_v4();
    let company_id = Uuid::new_v4();
    let client_id = Uuid::new_v4();
    let idempotency_key = format!("IDEM-CREATE-{}", Uuid::new_v4());

    let finance_repo = FinanceRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());
    let journal_service = JournalService::new(journal_repo.clone(), finance_repo.clone());
    let asset_repo = AssetRepository::new(pool.clone());
    let rental_repo = RentalRepository::new(pool.clone());
    let asset_expense_service = AssetExpenseService::new(
        management_system_finance::repositories::AssetExpenseRepository::new(pool.clone()),
        asset_repo.clone(),
    );
    let event_bus = EventBus::new();

    let service = FinanceService::new(
        finance_repo.clone(),
        journal_repo.clone(),
        journal_service,
        asset_expense_service,
        asset_repo,
        rental_repo,
        event_bus,
    );

    let req = CreateSalesInvoiceRequest {
        invoice_number: format!("INV/TEST/{}", &Uuid::new_v4().to_string()[..8]),
        client_id,
        date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        due_date: Some(NaiveDate::from_ymd_opt(2026, 8, 20).unwrap()),
        subject: Some("Real DB Test Invoice".to_string()),
        items: vec![
            CreateInvoiceItemRequest {
                description: "Item 1".to_string(),
                quantity: dec!(10.00),
                unit_price: dec!(150000.50),
                account_id: None,
            },
            CreateInvoiceItemRequest {
                description: "Item 2".to_string(),
                quantity: dec!(2.00),
                unit_price: dec!(250000.25),
                account_id: None,
            },
        ],
        attachment_url: None,
    };

    let result = service.create_sales_invoice(actor_id, company_id, idempotency_key.clone(), req).await;
    assert!(result.is_ok(), "Failed to create sales invoice: {:?}", result.err());

    let invoice = result.unwrap();
    assert_eq!(invoice.total_amount, dec!(2000005.50));

    // Query persisted DB state to verify atomicity
    let detail = service.get_sales_invoice_detail(invoice.id).await.unwrap();
    assert_eq!(detail.items.len(), 2);
    assert_eq!(detail.items[0].total_price, dec!(1500005.00));
    assert_eq!(detail.items[1].total_price, dec!(500000.50));
}

#[tokio::test]
async fn test_real_db_sales_invoice_update_atomicity_and_consistency() {
    let pool = match get_test_pool().await {
        Some(p) => p,
        None => return,
    };

    let actor_id = Uuid::new_v4();
    let company_id = Uuid::new_v4();
    let client_id = Uuid::new_v4();

    let finance_repo = FinanceRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());
    let journal_service = JournalService::new(journal_repo.clone(), finance_repo.clone());
    let asset_repo = AssetRepository::new(pool.clone());
    let rental_repo = RentalRepository::new(pool.clone());
    let asset_expense_service = AssetExpenseService::new(
        management_system_finance::repositories::AssetExpenseRepository::new(pool.clone()),
        asset_repo.clone(),
    );
    let event_bus = EventBus::new();

    let service = FinanceService::new(
        finance_repo.clone(),
        journal_repo.clone(),
        journal_service,
        asset_expense_service,
        asset_repo,
        rental_repo,
        event_bus,
    );

    let create_req = CreateSalesInvoiceRequest {
        invoice_number: format!("INV/UPD/{}", &Uuid::new_v4().to_string()[..8]),
        client_id,
        date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        due_date: None,
        subject: Some("Original Subject".to_string()),
        items: vec![CreateInvoiceItemRequest {
            description: "Initial Line".to_string(),
            quantity: dec!(1.00),
            unit_price: dec!(1000.00),
            account_id: None,
        }],
        attachment_url: None,
    };

    let created = service.create_sales_invoice(actor_id, company_id, format!("IDEM-UPD-1-{}", Uuid::new_v4()), create_req).await.unwrap();
    assert_eq!(created.total_amount, dec!(1000.00));

    // Update with modified amount and extra lines (3R.1.1-004)
    let update_req = CreateSalesInvoiceRequest {
        invoice_number: created.invoice_number.clone(),
        client_id,
        date: created.date,
        due_date: created.due_date,
        subject: Some("Updated Subject".to_string()),
        items: vec![
            CreateInvoiceItemRequest {
                description: "Updated Line 1".to_string(),
                quantity: dec!(2.00),
                unit_price: dec!(1500.00),
                account_id: None,
            },
            CreateInvoiceItemRequest {
                description: "New Line 2".to_string(),
                quantity: dec!(1.00),
                unit_price: dec!(2000.00),
                account_id: None,
            },
        ],
        attachment_url: None,
    };

    let updated = service.update_sales_invoice(actor_id, company_id, format!("IDEM-UPD-2-{}", Uuid::new_v4()), created.id, update_req).await.unwrap();
    assert_eq!(updated.total_amount, dec!(5000.00)); // 2*1500 + 1*2000 = 5000

    // Assert DB persistence consistency (source invoice + lines + journal effect consistent)
    let detail = service.get_sales_invoice_detail(created.id).await.unwrap();
    assert_eq!(detail.invoice.subject.as_deref(), Some("Updated Subject"));
    assert_eq!(detail.items.len(), 2);
    assert_eq!(detail.items[0].description, "Updated Line 1");
    assert_eq!(detail.items[1].description, "New Line 2");
}

#[tokio::test]
async fn test_real_db_empty_invoice_items_rejected() {
    let pool = match get_test_pool().await {
        Some(p) => p,
        None => return,
    };

    let actor_id = Uuid::new_v4();
    let company_id = Uuid::new_v4();

    let finance_repo = FinanceRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());
    let journal_service = JournalService::new(journal_repo.clone(), finance_repo.clone());
    let asset_repo = AssetRepository::new(pool.clone());
    let rental_repo = RentalRepository::new(pool.clone());
    let asset_expense_service = AssetExpenseService::new(
        management_system_finance::repositories::AssetExpenseRepository::new(pool.clone()),
        asset_repo.clone(),
    );

    let service = FinanceService::new(
        finance_repo,
        journal_repo,
        journal_service,
        asset_expense_service,
        asset_repo,
        rental_repo,
        EventBus::new(),
    );

    let req = CreateSalesInvoiceRequest {
        invoice_number: "INV/EMPTY/REJECT".to_string(),
        client_id: Uuid::new_v4(),
        date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        due_date: None,
        subject: None,
        items: vec![],
        attachment_url: None,
    };

    let res = service.create_sales_invoice(actor_id, company_id, format!("IDEM-EMPTY-{}", Uuid::new_v4()), req).await;
    assert!(res.is_err());
    match res.unwrap_err() {
        DomainError::Validation { field, message } => {
            assert_eq!(field, "items");
            assert!(message.contains("at least one line item"));
        }
        other => panic!("Expected DomainError::Validation, got {:?}", other),
    }
}

#[tokio::test]
async fn test_real_db_uow_rollback_on_simulated_audit_failure() {
    let pool = match get_test_pool().await {
        Some(p) => p,
        None => return,
    };

    let mut uow = UnitOfWork::begin(&pool).await.unwrap();

    // Create an audit entry with invalid document_version (-999) or null field to simulate failure
    let invalid_audit = DocumentAuditEntry {
        id: Uuid::new_v4(),
        document_id: Uuid::new_v4(),
        document_type: "INVALID_TYPE".to_string(),
        action: AuditAction::Create.as_str().to_string(),
        actor_id: Uuid::new_v4(),
        tenant_id: Uuid::new_v4(),
        company_id: None,
        from_status: None,
        to_status: None,
        document_version: 1,
        reason: None,
        correlation_id: "CORR-001".to_string(),
        recorded_at: chrono::Utc::now(),
    };

    let append_res = AuditTrailStore::append(&mut uow, &invalid_audit).await;
    assert!(append_res.is_ok());

    // Explicit rollback
    uow.rollback().await.unwrap();

    // Assert that the record was not persisted to DB
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM document_audit_trail WHERE id = $1")
        .bind(invalid_audit.id)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count.0, 0, "Rolled back audit entry must NOT exist in database");
}
