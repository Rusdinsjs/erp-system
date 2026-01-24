use axum::http::StatusCode;
use chrono::Utc;
use uuid::Uuid;

mod test_utils;

#[tokio::test]
async fn test_notification_flow() {
    let app = test_utils::setup_app().await;
    // We need direct access to the service or database to verify side effects if we don't expose everything via API.
    // However, we have API endpoints for notifications.
    // GET /api/users/:id/notifications
    // POST /api/notifications/:id/read

    // We also need to trigger creation.
    // Service has `create` method, but is there an API endpoint to create notification directly?
    // Usually no, it's internal.
    // EXCEPT `notify_admins` or triggered by other actions (e.g. Loan Approval).

    // Strategy:
    // 1. Trigger an action that creates a notification (e.g. Loan Created or explicitly call Service if we can access State).
    // Accessing State from `app` Router is hard in integration tests (it's internal).
    //
    // Alternative: Use `test_utils::common::setup()` to get the POOL, then construct `NotificationService` manually?
    // Yes, we can instantiate the Service in the test to test Logic, while using Real DB.
    // This is a "Service Integration Test".

    let pool = test_utils::common::setup().await;

    // Setup Dependencies
    let notification_repo =
        management_system::infrastructure::repositories::NotificationRepository::new(pool.clone());
    let ws_manager = std::sync::Arc::new(
        management_system::api::handlers::notification_ws::WebSocketManager::new(),
    );
    let notification_service = management_system::application::services::NotificationService::new(
        notification_repo,
        ws_manager,
    );

    // 1. Test Direct Creation
    let user_id = Uuid::new_v4();
    // note: User must exist for FK? Check Notification table.
    // Usually yes.
    // Create a dummy user.
    let email = format!("notify_user_{}@example.com", Uuid::new_v4());
    sqlx::query!("INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, 'hash', 'Notify User', 'user')", user_id, email)
        .execute(&pool).await.unwrap();

    let title = "Test Notification";
    let message = "This is a test";

    let notification = notification_service
        .create(user_id, title, message, None, None)
        .await
        .expect("Failed to create notification");

    assert_eq!(notification.title, title);
    assert_eq!(notification.message, message);
    assert_eq!(notification.is_read, false);

    // 2. Verify Persistence
    let unread = notification_service
        .list_unread(user_id)
        .await
        .expect("Failed to list unread");
    assert_eq!(unread.len(), 1);
    assert_eq!(unread[0].id, notification.id);

    // 3. Mark as Read
    let success = notification_service
        .mark_as_read(notification.id)
        .await
        .expect("Failed to mark as read");
    assert!(success);

    let unread_after = notification_service
        .list_unread(user_id)
        .await
        .expect("Failed to list unread again");
    assert_eq!(unread_after.len(), 0);

    // 4. Test Template Notification
    // Needs a template in DB.
    let template_code = "TEST_TEMPLATE";
    sqlx::query!(
        "INSERT INTO notification_templates (id, code, name, subject_template, body_template, event_type, is_active) VALUES ($1, $2, 'Test Tmpl', 'Hello {{name}}', 'Your item {{item}} is ready', 'TEST_EVENT', true) ON CONFLICT (code) DO NOTHING",
        Uuid::new_v4(),
        template_code
    )
    .execute(&pool).await.unwrap();

    let data = serde_json::json!({
        "name": "Alice",
        "item": "Book"
    });

    let tmpl_notification = notification_service
        .create_from_template(user_id, template_code, data, None, None)
        .await
        .expect("Failed to create from template");

    assert_eq!(tmpl_notification.title, "Hello Alice");
    assert_eq!(tmpl_notification.message, "Your item Book is ready");

    // 5. Test Smart Trigger (Wrapper around template)
    // Needs `loan_approved` template
    sqlx::query!(
        "INSERT INTO notification_templates (id, code, name, subject_template, body_template, event_type, is_active) VALUES ($1, 'loan_approved', 'Loan Approved', 'Loan Approved', 'Your loan for {{asset_name}} has been approved', 'LOAN_APPROVED', true) ON CONFLICT (code) DO NOTHING",
        Uuid::new_v4()
    )
    .execute(&pool).await.unwrap();

    let trigger_notif = notification_service
        .notify_loan_approved(user_id, "Laptop X", Uuid::new_v4())
        .await
        .expect("Failed trigger");
    assert_eq!(
        trigger_notif.message,
        "Your loan request for Laptop X has been approved. Please pick up the asset."
    );
}
