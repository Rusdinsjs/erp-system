//! Route Definitions

use axum::{
    extract::Path,
    handler::Handler,
    middleware as axum_middleware,
    routing::{delete, get, post, put},
    Extension, Router,
};

use crate::api::handlers::*;
use crate::api::middleware::{
    auth_middleware,
    rbac::{admin_only_middleware, require_permission},
};
use crate::api::server::AppState;
use crate::domain::entities::UserClaims;

pub fn create_router(state: AppState) -> Router {
    // Public routes
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/auth/login", post(login))
        .route(
            "/api/upload",
            post(upload_handler::upload_file).layer(tower_http::limit::RequestBodyLimitLayer::new(
                10 * 1024 * 1024,
            )),
        )
        .route("/ws", get(notification_ws::ws_handler));

    // Lookup routes
    let lookup_routes = Router::new()
        .route("/api/lookups/currencies", get(list_currencies))
        .route("/api/lookups/units", get(list_units))
        .route("/api/lookups/conditions", get(list_conditions))
        .route(
            "/api/lookups/maintenance-types",
            get(list_maintenance_types),
        );

    // Protected routes
    let protected_routes = Router::new()
        // Assets
        .route(
            "/api/assets",
            get(list_assets.layer(axum_middleware::from_fn(require_permission("asset.read"))))
                .post(
                    create_asset
                        .layer(axum_middleware::from_fn(require_permission("asset.create"))),
                ),
        )
        .route(
            "/api/assets/bulk",
            post(
                bulk_create_assets
                    .layer(axum_middleware::from_fn(require_permission("asset.create"))),
            ),
        )
        .route(
            "/api/assets/search",
            get(search_assets.layer(axum_middleware::from_fn(require_permission("asset.read")))),
        )
        .route(
            "/api/assets/:id",
            get(get_asset.layer(axum_middleware::from_fn(require_permission("asset.read"))))
                .put(
                    update_asset
                        .layer(axum_middleware::from_fn(require_permission("asset.update"))),
                )
                .delete(
                    delete_asset
                        .layer(axum_middleware::from_fn(require_permission("asset.delete"))),
                ),
        )
        // Maintenance - Merged below
        // Work Orders
        // Work Orders
        .route(
            "/api/work-orders",
            get(list_work_orders).post(create_work_order),
        )
        .route("/api/work-orders/pending", get(list_pending_work_orders))
        .route("/api/work-orders/overdue", get(list_overdue_work_orders))
        .route("/api/work-orders/:id", get(get_work_order))
        .route("/api/work-orders/:id/approve", post(approve_work_order))
        .route(
            "/api/work-orders/:id/assign/:technician_id",
            post(assign_work_order),
        )
        .route("/api/work-orders/:id/start", post(start_work_order))
        .route("/api/work-orders/:id/complete", post(complete_work_order))
        .route("/api/work-orders/:id/cancel", post(cancel_work_order))
        // Tasks
        .route(
            "/api/work-orders/:id/tasks",
            get(get_work_order_tasks).post(add_work_order_task),
        )
        .route(
            "/api/work-orders/:id/tasks/:task_id",
            delete(remove_work_order_task),
        )
        // Parts
        .route(
            "/api/work-orders/:id/parts",
            get(get_work_order_parts).post(add_work_order_part),
        )
        .route(
            "/api/work-orders/:id/parts/:part_id",
            delete(remove_work_order_part),
        )
        // Loans
        .route("/api/loans", get(list_loans).post(create_loan))
        .route(
            "/api/loans/my",
            get(
                |state, Extension(claims): Extension<UserClaims>| async move {
                    list_my_loans(state, Path(claims.user_id())).await
                },
            ),
        )
        .route("/api/loans/overdue", get(list_overdue_loans))
        .route("/api/loans/:id", get(get_loan))
        .route("/api/loans/:id/approve", post(approve_loan))
        .route("/api/loans/:id/checkout", post(checkout_loan))
        .route("/api/loans/:id/return", post(checkin_loan))
        .route("/api/loans/:id/reject", post(reject_loan))
        .route("/api/users/:user_id/loans", get(list_my_loans))
        // Notifications
        .route("/api/users/:user_id/notifications", get(list_notifications))
        .route(
            "/api/users/:user_id/notifications/unread",
            get(list_unread_notifications),
        )
        .route(
            "/api/users/:user_id/notifications/unread/count",
            get(count_unread_notifications),
        )
        .route(
            "/api/users/:user_id/notifications/read-all",
            post(mark_all_notifications_as_read),
        )
        .route(
            "/api/notifications/:id/read",
            post(mark_notification_as_read),
        )
        // Users (Admin Only)
        .route(
            "/api/users",
            get(list_users.layer(axum_middleware::from_fn(admin_only_middleware)))
                .post(create_user.layer(axum_middleware::from_fn(admin_only_middleware))),
        )
        // Profile Routes (Checked for protected_routes and auth_middleware coverage)
        .route(
            "/api/me",
            get(profile_handler::get_profile).put(profile_handler::update_profile),
        )
        .route("/api/me/password", put(profile_handler::change_password))
        .route("/api/me/avatar", post(profile_handler::upload_avatar))
        .route(
            "/api/users/:id",
            put(update_user.layer(axum_middleware::from_fn(admin_only_middleware)))
                .delete(delete_user.layer(axum_middleware::from_fn(admin_only_middleware))),
        )
        // Employees
        .route("/api/employees", get(list_employees).post(create_employee))
        .route(
            "/api/employees/:id",
            get(get_employee)
                .put(update_employee)
                .delete(delete_employee),
        )
        .route("/api/employees/:id/user", post(create_employee_user))
        // Departments
        .route("/api/departments/tree", get(list_departments_tree))
        .route(
            "/api/departments",
            get(list_departments).post(create_department),
        )
        .route(
            "/api/departments/:id",
            get(get_department)
                .put(update_department)
                .delete(delete_department),
        )
        // I'll rewrite this block more cleanly
        // RBAC
        .route("/api/rbac/roles", get(list_roles))
        .route("/api/rbac/permissions", get(list_permissions))
        .route(
            "/api/rbac/roles/:role_id/permissions",
            get(get_role_permissions),
        )
        .route("/api/users/:user_id/roles", get(get_user_roles))
        .route("/api/users/:user_id/permissions", get(get_user_permissions))
        .route(
            "/api/users/:user_id/roles/:role_code",
            post(assign_role).delete(remove_role),
        )
        // Sensors
        .route(
            "/api/assets/:asset_id/sensors/readings",
            post(record_reading).get(get_latest_readings),
        )
        .route(
            "/api/assets/:asset_id/sensors/readings/range",
            get(get_readings_in_range),
        )
        .route(
            "/api/assets/:asset_id/sensors/thresholds",
            post(set_threshold),
        )
        .route("/api/sensors/alerts", get(list_active_alerts))
        .route(
            "/api/sensors/alerts/:id/acknowledge",
            post(acknowledge_alert),
        )
        .route("/api/reports/assets", get(report_handler::export_assets))
        .route(
            "/api/reports/maintenance",
            get(report_handler::export_maintenance),
        )
        .route("/api/dashboard", get(get_dashboard_stats))
        .route("/api/dashboard/activity", get(get_recent_activities))
        .route("/api/dashboard/depreciation", get(get_depreciation_summary))
        .route(
            "/api/audit/sessions",
            post(audit_handler::start_audit_session),
        )
        .route(
            "/api/audit/sessions/active",
            get(audit_handler::get_active_session),
        )
        .route(
            "/api/audit/sessions/:id/records",
            post(audit_handler::submit_audit_record),
        )
        .route(
            "/api/audit/sessions/:id/close",
            post(audit_handler::close_session),
        )
        .route(
            "/api/audit/sessions/:id/progress",
            get(audit_handler::get_audit_progress),
        )
        // Lifecycle routes
        .route(
            "/api/assets/:id/lifecycle/transition",
            post(lifecycle_handler::transition_asset),
        )
        .route(
            "/api/assets/:id/lifecycle/request-transition",
            post(lifecycle_handler::request_transition),
        )
        .route(
            "/api/assets/:id/lifecycle/history",
            get(lifecycle_handler::get_lifecycle_history),
        )
        .route(
            "/api/assets/:id/lifecycle/valid-transitions",
            get(lifecycle_handler::get_valid_transitions),
        )
        .route(
            "/api/assets/:id/lifecycle/valid-transitions-with-approval",
            get(lifecycle_handler::get_valid_transitions_with_approval),
        )
        .route(
            "/api/assets/:id/lifecycle/status",
            get(lifecycle_handler::get_current_status),
        )
        .route(
            "/api/lifecycle/states",
            get(lifecycle_handler::get_all_states),
        )
        .nest(
            "/api/categories",
            crate::api::routes::category_routes::category_routes(),
        )
        .merge(crate::api::routes::conversion_routes::conversion_routes(
            state.clone(),
        ))
        .merge(crate::api::routes::location_routes::location_routes())
        .merge(crate::api::routes::approval_routes::approval_routes(
            state.clone(),
        ))
        .nest(
            "/api/mobile",
            crate::api::routes::mobile_routes::mobile_routes(state.clone()),
        )
        .merge(crate::api::routes::rental_routes::rental_routes())
        .merge(crate::api::routes::client_routes::client_routes())
        .merge(crate::api::routes::timesheet_routes::timesheet_routes())
        .merge(crate::api::routes::billing_routes::billing_routes())
        .merge(crate::api::routes::analytics_routes::routes())
        .layer(axum_middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(lookup_routes)
        .merge(protected_routes)
        .with_state(state)
}
