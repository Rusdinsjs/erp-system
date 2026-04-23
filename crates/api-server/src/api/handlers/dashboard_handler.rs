//! Dashboard Handler - Analytics & Statistics

use axum::{extract::State, Json};
use rust_decimal::Decimal;
use serde::Serialize;

use uuid::Uuid;

use crate::api::server::AppState;
use management_system_core::shared::errors::AppError;

use management_system_core::application::dto::{
    AlertStats, AssetStats, CategoryDistribution, DashboardStats, LoanStats, MaintenanceStats,
    StatusCount,
};

use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct RecentActivity {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub action: String,
    pub description: String,
    pub user_name: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    get,
    path = "/api/dashboard/stats",
    responses(
        (status = 200, description = "Get dashboard statistics", body = DashboardStats),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("token" = [])
    ),
    tag = "dashboard"
)]
pub async fn get_dashboard_stats(
    State(state): State<AppState>,
) -> Result<Json<DashboardStats>, AppError> {
    let stats = get_dashboard_stats_internal(&state).await?;
    Ok(Json(stats))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/recent-activities",
    responses(
        (status = 200, description = "Get recent activities", body = Vec<RecentActivity>),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("token" = [])
    ),
    tag = "dashboard"
)]
pub async fn get_recent_activities(
    State(state): State<AppState>,
) -> Result<Json<Vec<RecentActivity>>, AppError> {
    let pool = state.pool.clone();
    let activities: Vec<RecentActivity> =
        sqlx::query_as::<_, (String, Uuid, String, chrono::DateTime<chrono::Utc>)>(
            r#"
        SELECT 
            table_name, 
            record_id, 
            action,
            al.created_at
        FROM audit_logs al
        ORDER BY al.created_at DESC
        LIMIT 20
        "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(db_error)?
        .into_iter()
        .map(
            |(entity_type, entity_id, action, created_at)| RecentActivity {
                entity_type: entity_type.clone(),
                entity_id,
                action: action.clone(),
                description: format!("{} on {}", action, entity_type),
                user_name: None,
                created_at,
            },
        )
        .collect();

    Ok(Json(activities))
}

#[derive(Serialize, ToSchema)]
pub struct DepreciationSummary {
    pub total_original_cost: Decimal,
    pub total_accumulated_depreciation: Decimal,
    pub total_book_value: Decimal,
}

pub async fn export_dashboard_pdf(
    State(state): State<AppState>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    tracing::info!("Received request to export dashboard PDF");

    // 1. Get current stats
    let stats = get_dashboard_stats_internal(&state).await.map_err(|e| {
        tracing::error!("Failed to fetch dashboard stats for export: {:?}", e);
        e
    })?;

    tracing::info!("Dashboard stats fetched successfully, generating PDF...");

    // 2. Generate PDF using pdf_service
    let pdf_bytes = state
        .pdf_service
        .generate_dashboard_summary(stats)
        .await
        .map_err(|e| {
            tracing::error!("PDF generation failed: {}", e);
            AppError::Internal(e)
        })?;

    tracing::info!(
        "PDF generated successfully, size: {} bytes",
        pdf_bytes.len()
    );

    // 3. Return as attachment
    Ok((
        axum::http::header::HeaderMap::from_iter(vec![
            (
                axum::http::header::CONTENT_TYPE,
                axum::http::HeaderValue::from_static("application/pdf"),
            ),
            (
                axum::http::header::CONTENT_DISPOSITION,
                axum::http::HeaderValue::from_static("attachment; filename=\"dashboard_summary.pdf\""),
            ),
        ]),
        pdf_bytes,
    ))
}

async fn get_dashboard_stats_internal(state: &AppState) -> Result<DashboardStats, AppError> {
    let pool = state.pool.clone();

    // Asset stats
    let asset_total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM assets")
        .fetch_one(&pool)
        .await
        .map_err(db_error)?;

    let asset_by_status: Vec<StatusCount> = sqlx::query_as::<_, (String, i64)>(
        "SELECT status, COUNT(*) FROM assets GROUP BY status ORDER BY COUNT(*) DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(db_error)?
    .into_iter()
    .map(|(status, count)| StatusCount { status, count })
    .collect();

    let total_value: (Decimal,) =
        sqlx::query_as("SELECT COALESCE(SUM(purchase_price), 0) FROM assets")
            .fetch_one(&pool)
            .await
            .map_err(db_error)?;

    // Maintenance stats
    let maintenance_pending: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM maintenance_work_orders WHERE status = 'pending'")
            .fetch_one(&pool)
            .await
            .map_err(db_error)?;

    let maintenance_overdue: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM maintenance_work_orders WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')"
    ).fetch_one(&pool).await.map_err(db_error)?;

    // Loan stats
    let loans_active: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM asset_loans WHERE status IN ('checked_out', 'in_use')",
    )
    .fetch_one(&pool)
    .await
    .map_err(db_error)?;

    let loans_overdue: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM asset_loans WHERE expected_return_date < CURRENT_DATE AND actual_return_date IS NULL AND status NOT IN ('returned', 'lost')"
    ).fetch_one(&pool).await.map_err(db_error)?;

    let loans_pending: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM asset_loans WHERE status = 'requested'")
            .fetch_one(&pool)
            .await
            .map_err(db_error)?;

    // Alert stats
    let alerts_active: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM sensor_alerts WHERE status = 'active'")
            .fetch_one(&pool)
            .await
            .map_err(db_error)?;

    let alerts_critical: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sensor_alerts WHERE status = 'active' AND severity = 'critical'",
    )
    .fetch_one(&pool)
    .await
    .map_err(db_error)?;

    // Category Distribution
    let category_distribution: Vec<CategoryDistribution> =
        sqlx::query_as::<_, (String, i64, Decimal)>(
            r#"
        SELECT 
            c.name as category, 
            COUNT(a.id) as count, 
            COALESCE(SUM(a.purchase_price), 0) as value
        FROM assets a
        JOIN categories c ON a.category_id = c.id
        GROUP BY c.name
        ORDER BY value DESC
        LIMIT 5
        "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(db_error)?
        .into_iter()
        .map(|(category, count, value)| CategoryDistribution {
            category,
            count,
            value,
        })
        .collect();

    Ok(DashboardStats {
        assets: AssetStats {
            total: asset_total.0,
            by_status: asset_by_status,
            total_value: total_value.0,
        },
        maintenance: MaintenanceStats {
            pending: maintenance_pending.0,
            overdue: maintenance_overdue.0,
        },
        loans: LoanStats {
            active: loans_active.0,
            overdue: loans_overdue.0,
            pending_approval: loans_pending.0,
        },
        alerts: AlertStats {
            active: alerts_active.0,
            critical: alerts_critical.0,
        },
        category_distribution,
    })
}

#[utoipa::path(
    get,
    path = "/api/dashboard/depreciation",
    responses(
        (status = 200, description = "Get depreciation summary", body = DepreciationSummary),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("token" = [])
    ),
    tag = "dashboard"
)]
pub async fn get_depreciation_summary(
    State(state): State<AppState>,
) -> Result<Json<DepreciationSummary>, AppError> {
    let pool = state.pool.clone();
    let totals: (Decimal,) = sqlx::query_as(
        "SELECT COALESCE(SUM(purchase_price), 0) FROM assets WHERE purchase_price IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .map_err(db_error)?;

    // Simplified depreciation calculation
    let depreciation = totals.0 * Decimal::new(20, 2); // 20% depreciation estimate

    Ok(Json(DepreciationSummary {
        total_original_cost: totals.0,
        total_accumulated_depreciation: depreciation,
        total_book_value: totals.0 - depreciation,
    }))
}

fn db_error(e: sqlx::Error) -> AppError {
    AppError::Database(e.to_string())
}
