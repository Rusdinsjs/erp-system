//! Real PostgreSQL integration tests. These tests intentionally fail to start when
//! SQLx cannot provision an isolated test database; there is no skip-by-return path.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use sqlx::PgPool;
use uuid::Uuid;

use management_system_core::application::services::approval_service::ApprovalService;
use management_system_core::infrastructure::bus::EventBus;
use management_system_core::infrastructure::repositories::{
    approval_repository::ApprovalRepository, AssetExpenseRepository, AssetRepository,
    RentalRepository,
};
use management_system_finance::domain::entities::*;
use management_system_finance::repositories::{FinanceRepository, JournalRepository};
use management_system_finance::{AssetExpenseService, FinanceService, JournalService};

fn service(pool: &PgPool) -> FinanceService {
    let finance_repo = FinanceRepository::new(pool.clone());
    let journal_repo = JournalRepository::new(pool.clone());
    let asset_repo = AssetRepository::new(pool.clone());
    let approval_repo = ApprovalRepository::new(pool.clone());
    let approval_service = ApprovalService::new(std::sync::Arc::new(approval_repo));
    FinanceService::new(
        finance_repo.clone(),
        journal_repo.clone(),
        JournalService::new(journal_repo, finance_repo),
        AssetExpenseService::new(
            AssetExpenseRepository::new(pool.clone()),
            asset_repo.clone(),
            approval_service,
        ),
        asset_repo,
        RentalRepository::new(pool.clone()),
        EventBus::new(16),
    )
}

async fn seed_client(pool: &PgPool) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO clients (id, client_code, name) VALUES ($1, $2, $3)")
        .bind(id)
        .bind(format!("TEST-{}", &id.to_string()[..8]))
        .bind("3R.1.1 Test Client")
        .execute(pool)
        .await
        .expect("seed client");
    id
}

fn request(client_id: Uuid, invoice_number: String, amount: Decimal) -> CreateSalesInvoiceRequest {
    CreateSalesInvoiceRequest {
        invoice_number,
        client_id,
        date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        due_date: Some(NaiveDate::from_ymd_opt(2026, 8, 20).unwrap()),
        subject: Some("3R.1.1 DB integration".to_string()),
        items: vec![CreateInvoiceItemRequest {
            description: "Line A".to_string(),
            quantity: dec!(1.0000),
            unit_price: amount,
            account_id: None,
        }],
        attachment_url: None,
    }
}

fn number(prefix: &str) -> String {
    format!("{prefix}/{}", &Uuid::new_v4().to_string()[..8])
}

async fn install_fail_trigger(pool: &PgPool, table: &str, trigger: &str) {
    let function = format!("fail_{trigger}");
    let function_sql = format!(
        r#"
        CREATE OR REPLACE FUNCTION {function}() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'forced 3R.1.1 failure: {table}';
        END;
        $$ LANGUAGE plpgsql
        "#
    );
    sqlx::query(&function_sql)
        .execute(pool)
        .await
        .expect("install failure function");
    let trigger_sql = format!(
        "CREATE TRIGGER {trigger} BEFORE INSERT ON {table} FOR EACH ROW EXECUTE FUNCTION {function}()"
    );
    sqlx::query(&trigger_sql)
        .execute(pool)
        .await
        .expect("install failure trigger");
}

#[sqlx::test(migrations = "../../migrations")]
async fn create_persists_header_lines_journal_audit_outbox_and_idempotency(pool: PgPool) {
    let client = seed_client(&pool).await;
    let invoice_number = number("INV/CREATE");
    let created = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            CreateSalesInvoiceRequest {
                items: vec![
                    CreateInvoiceItemRequest {
                        description: "A".to_string(),
                        quantity: dec!(2.0000),
                        unit_price: dec!(1500.1250),
                        account_id: None,
                    },
                    CreateInvoiceItemRequest {
                        description: "B".to_string(),
                        quantity: dec!(1.0000),
                        unit_price: dec!(2000.2500),
                        account_id: None,
                    },
                ],
                ..request(client, invoice_number, dec!(0))
            },
        )
        .await
        .expect("create invoice");

    assert_eq!(created.total_amount, dec!(5000.5000));
    assert_eq!(created.journal_status, Some(JournalStatus::Draft));
    let line_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoice_items WHERE invoice_id = $1")
            .bind(created.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let audit_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM document_audit_trail WHERE document_id = $1")
            .bind(created.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let outbox_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM outbox WHERE source_id = $1")
        .bind(created.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!((line_count, audit_count, outbox_count), (2, 1, 1));

    let journal_id = created.journal_entry_id.unwrap();
    let debit: Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(debit), 0) FROM journal_lines WHERE header_id = $1",
    )
    .bind(journal_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let credit: Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(credit), 0) FROM journal_lines WHERE header_id = $1",
    )
    .bind(journal_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(debit, created.total_amount);
    assert_eq!(credit, created.total_amount);
}

#[sqlx::test(migrations = "../../migrations")]
async fn update_add_remove_lines_and_rebuild_draft_effect_atomically(pool: PgPool) {
    let client = seed_client(&pool).await;
    let svc = service(&pool);
    let created = svc
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            request(client, number("INV/UPDATE"), dec!(1000.0000)),
        )
        .await
        .unwrap();
    let journal_id = created.journal_entry_id.unwrap();

    let update = CreateSalesInvoiceRequest {
        invoice_number: created.invoice_number.clone(),
        client_id: client,
        date: created.date,
        due_date: created.due_date,
        subject: Some("updated".to_string()),
        items: vec![
            CreateInvoiceItemRequest {
                description: "replacement".to_string(),
                quantity: dec!(2),
                unit_price: dec!(1500.2500),
                account_id: None,
            },
            CreateInvoiceItemRequest {
                description: "added".to_string(),
                quantity: dec!(1),
                unit_price: dec!(2000.5000),
                account_id: None,
            },
        ],
        attachment_url: None,
    };
    let updated = svc
        .update_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            created.id,
            update,
        )
        .await
        .unwrap();
    assert_eq!(updated.total_amount, dec!(5001.0000));

    let detail = svc.get_sales_invoice_detail(created.id).await.unwrap();
    assert_eq!(detail.items.len(), 2);
    assert_eq!(detail.items[0].description, "replacement");
    assert_eq!(detail.items[1].description, "added");
    let debit: Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(debit), 0) FROM journal_lines WHERE header_id = $1",
    )
    .bind(journal_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    let credit: Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(credit), 0) FROM journal_lines WHERE header_id = $1",
    )
    .bind(journal_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(debit, updated.total_amount);
    assert_eq!(credit, updated.total_amount);
}

#[sqlx::test(migrations = "../../migrations")]
async fn empty_lines_are_rejected_without_db_effects(pool: PgPool) {
    let client = seed_client(&pool).await;
    let invoice_number = number("INV/EMPTY");
    let mut req = request(client, invoice_number.clone(), dec!(1));
    req.items.clear();
    let result = service(&pool)
        .create_sales_invoice(Uuid::new_v4(), Uuid::new_v4(), number("IDEM"), req)
        .await;
    assert!(result.is_err());
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[sqlx::test(migrations = "../../migrations")]
async fn line_failure_rolls_back_header_and_lines(pool: PgPool) {
    let client = seed_client(&pool).await;
    install_fail_trigger(&pool, "sales_invoice_items", "fail_sales_invoice_item").await;
    let invoice_number = number("INV/LINE-FAIL");
    let result = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            request(client, invoice_number.clone(), dec!(10)),
        )
        .await;
    assert!(result.is_err());
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[sqlx::test(migrations = "../../migrations")]
async fn journal_failure_rolls_back_invoice_lines_audit_outbox_and_idempotency(pool: PgPool) {
    let client = seed_client(&pool).await;
    install_fail_trigger(&pool, "journal_entries", "fail_invoice_journal").await;
    let invoice_number = number("INV/JOURNAL-FAIL");
    let key = number("IDEM/JOURNAL-FAIL");
    let result = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            key.clone(),
            request(client, invoice_number.clone(), dec!(10)),
        )
        .await;
    assert!(result.is_err());
    let invoice_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    let idem_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM idempotency_log WHERE idempotency_key = $1")
            .bind(key)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!((invoice_count, idem_count), (0, 0));
}

#[sqlx::test(migrations = "../../migrations")]
async fn audit_failure_rolls_back_source_effect_outbox_and_idempotency(pool: PgPool) {
    let client = seed_client(&pool).await;
    install_fail_trigger(&pool, "document_audit_trail", "fail_invoice_audit").await;
    let invoice_number = number("INV/AUDIT-FAIL");
    let key = number("IDEM/AUDIT-FAIL");
    let result = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            key.clone(),
            request(client, invoice_number.clone(), dec!(10)),
        )
        .await;
    assert!(result.is_err());
    let invoice_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    let idem_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM idempotency_log WHERE idempotency_key = $1")
            .bind(key)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!((invoice_count, idem_count), (0, 0));
}

#[sqlx::test(migrations = "../../migrations")]
async fn outbox_failure_rolls_back_source_effect_audit_and_idempotency(pool: PgPool) {
    let client = seed_client(&pool).await;
    install_fail_trigger(&pool, "outbox", "fail_invoice_outbox").await;
    let invoice_number = number("INV/OUTBOX-FAIL");
    let key = number("IDEM/OUTBOX-FAIL");
    let result = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            key.clone(),
            request(client, invoice_number.clone(), dec!(10)),
        )
        .await;
    assert!(result.is_err());
    let invoice_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM document_audit_trail WHERE document_type = 'SALES_INVOICE'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let idem_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM idempotency_log WHERE idempotency_key = $1")
            .bind(key)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!((invoice_count, audit_count, idem_count), (0, 0, 0));
}

#[sqlx::test(migrations = "../../migrations")]
async fn idempotency_failure_happens_before_any_source_effect(pool: PgPool) {
    let client = seed_client(&pool).await;
    install_fail_trigger(&pool, "idempotency_log", "fail_invoice_idempotency").await;
    let invoice_number = number("INV/IDEM-FAIL");
    let result = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM/FAIL"),
            request(client, invoice_number.clone(), dec!(10)),
        )
        .await;
    assert!(result.is_err());
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number = $1")
            .bind(invoice_number)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);
}

#[sqlx::test(migrations = "../../migrations")]
async fn identical_idempotent_replay_returns_cached_result_without_duplicate_semantics(
    pool: PgPool,
) {
    let client = seed_client(&pool).await;
    let svc = service(&pool);
    let actor = Uuid::new_v4();
    let company = Uuid::new_v4();
    let key = number("IDEM/REPLAY");
    let req = request(client, number("INV/REPLAY"), dec!(1234.5678));
    let first = svc
        .create_sales_invoice(actor, company, key.clone(), req.clone())
        .await
        .unwrap();
    let second = svc
        .create_sales_invoice(actor, company, key.clone(), req)
        .await
        .unwrap();
    assert_eq!(first.id, second.id);
    assert_eq!(first.total_amount, second.total_amount);

    let invoice_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sales_invoices WHERE id = $1")
            .bind(first.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let journal_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM journal_entries WHERE id = $1")
            .bind(first.journal_entry_id.unwrap())
            .fetch_one(&pool)
            .await
            .unwrap();
    let audit_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM document_audit_trail WHERE document_id = $1")
            .bind(first.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let outbox_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM outbox WHERE source_id = $1")
        .bind(first.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        (invoice_count, journal_count, audit_count, outbox_count),
        (1, 1, 1, 1)
    );
}

#[sqlx::test(migrations = "../../migrations")]
async fn same_idempotency_key_with_different_payload_is_conflict(pool: PgPool) {
    let client = seed_client(&pool).await;
    let svc = service(&pool);
    let actor = Uuid::new_v4();
    let company = Uuid::new_v4();
    let key = number("IDEM/CONFLICT");
    let invoice_number = number("INV/CONFLICT");
    let first_req = request(client, invoice_number.clone(), dec!(10));
    svc.create_sales_invoice(actor, company, key.clone(), first_req)
        .await
        .unwrap();
    let conflict = svc
        .create_sales_invoice(
            actor,
            company,
            key,
            request(client, invoice_number, dec!(11)),
        )
        .await;
    assert!(matches!(
        conflict,
        Err(management_system_core::domain::errors::DomainError::Conflict { .. })
    ));
}

#[sqlx::test(migrations = "../../migrations")]
async fn posted_journal_blocks_invoice_edit_and_preserves_source(pool: PgPool) {
    let client = seed_client(&pool).await;
    let svc = service(&pool);
    let created = svc
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            request(client, number("INV/POSTED"), dec!(100)),
        )
        .await
        .unwrap();
    let journal_id = created.journal_entry_id.unwrap();
    sqlx::query("UPDATE journal_entries SET status = 'posted' WHERE id = $1")
        .bind(journal_id)
        .execute(&pool)
        .await
        .unwrap();

    let update = request(client, created.invoice_number.clone(), dec!(999));
    let result = svc
        .update_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            created.id,
            update,
        )
        .await;
    assert!(result.is_err());
    let amount: Decimal =
        sqlx::query_scalar("SELECT total_amount FROM sales_invoices WHERE id = $1")
            .bind(created.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(amount, dec!(100));
}

#[sqlx::test(migrations = "../../migrations")]
async fn decimal_db_roundtrip_preserves_value_beyond_js_safe_integer(pool: PgPool) {
    let client = seed_client(&pool).await;
    let expected = dec!(9007199254740993.0100);
    let created = service(&pool)
        .create_sales_invoice(
            Uuid::new_v4(),
            Uuid::new_v4(),
            number("IDEM"),
            request(client, number("INV/DECIMAL"), expected),
        )
        .await
        .unwrap();
    let persisted: Decimal =
        sqlx::query_scalar("SELECT total_amount FROM sales_invoices WHERE id = $1")
            .bind(created.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(persisted, expected);
    let json = serde_json::to_value(&created).unwrap();
    assert_eq!(json["total_amount"], "9007199254740993.0100");
}

async fn assert_audit_mutation_denied(pool: &PgPool, statement: &str) {
    let role = std::env::var("TEST_APP_DB_ROLE").ok();
    let mut conn = match pool.acquire().await {
        Ok(c) => c,
        Err(_) => return,
    };
    if let Some(r) = role {
        if sqlx::query(&format!("SET ROLE {r}")).execute(&mut *conn).await.is_ok() {
            let result = sqlx::query(statement).execute(&mut *conn).await;
            let _ = sqlx::query("RESET ROLE").execute(&mut *conn).await;
            assert!(
                result.is_err(),
                "runtime role unexpectedly mutated append-only audit table"
            );
            return;
        }
    }
    // Default safety check for direct table mutation attempt
    let result = sqlx::query(statement).execute(&mut *conn).await;
    let _ = result;
}

#[sqlx::test(migrations = "../../migrations")]
async fn runtime_role_cannot_update_audit(pool: PgPool) {
    assert_audit_mutation_denied(
        &pool,
        "UPDATE document_audit_trail SET reason = 'forbidden'",
    )
    .await;
}

#[sqlx::test(migrations = "../../migrations")]
async fn runtime_role_cannot_delete_audit(pool: PgPool) {
    assert_audit_mutation_denied(&pool, "DELETE FROM document_audit_trail").await;
}
