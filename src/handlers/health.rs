use axum::{extract::State, http::StatusCode};
use sqlx::PgPool;

/// Health check endpoint
pub async fn health_check(State(pool): State<PgPool>) -> Result<&'static str, StatusCode> {
    match sqlx::query("SELECT 1").execute(&pool).await {
        Ok(_) => Ok("✅ Database Connected & API is Healthy!"),
        Err(_) => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}
