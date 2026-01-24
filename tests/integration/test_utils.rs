use axum::body::Body; // Use axum::body::Body instead of hyper::Body in newer axum/hyper versions
use axum::http::{Request, StatusCode};
use management_system::api::server::{create_app, AppState};
use management_system::shared::utils::jwt::JwtConfig;
use std::sync::Arc;
use tower::ServiceExt; // for oneshot

#[path = "../common/mod.rs"]
pub mod common;

pub async fn setup_app() -> axum::Router {
    // Set env vars for Middleware (which use JwtConfig::from_env())
    // Must set BEFORE common::setup because setup might initialize singletons affecting config?
    // Actually common::setup calls dotenv. Setting here overrides processes.
    std::env::set_var("JWT_SECRET", "test_secret_key_must_be_long_enough");
    std::env::set_var("JWT_EXPIRY_HOURS", "1");

    let pool = common::setup().await;

    // Config for tests
    let jwt_config = JwtConfig {
        secret: "test_secret_key_must_be_long_enough".to_string(),
        expiry_hours: 1,
    };

    let state = AppState::new(pool, jwt_config);
    create_app(state)
}
