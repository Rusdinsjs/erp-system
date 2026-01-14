//! Integration Tests for Asset Management API

use axum::{
    body::Body,
    http::{header, Request, StatusCode},
    Router,
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::util::ServiceExt;

/// Test helper to create app with test database
async fn setup_test_app() -> Router {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to create pool");

    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "test-secret".to_string());
    let jwt_expiry = std::env::var("JWT_EXPIRATION_HOURS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(24);

    let jwt_config = asset_management::shared::utils::jwt::JwtConfig {
        secret: jwt_secret,
        expiry_hours: jwt_expiry,
    };

    let state = asset_management::api::server::AppState::new(pool, jwt_config);
    asset_management::api::server::create_app(state)
}

/// Helper to login and get token
async fn get_auth_token(app: Router) -> (String, Router) {
    let (_parts, body) = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "admin@example.com",
                        "password": "admin123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap()
        .into_parts();

    let body_bytes = body.collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body_bytes).unwrap();
    let token = json["token"].as_str().unwrap().to_string();

    // Need to recreate app since oneshot consumes it
    let app = setup_test_app().await;
    (token, app)
}

#[tokio::test]
async fn test_health_check() {
    let app = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn test_login_success() {
    let app = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "admin@example.com",
                        "password": "admin123"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["success"], true);
    assert!(json["token"].is_string());
}

#[tokio::test]
async fn test_login_invalid_credentials() {
    let app = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "email": "admin@example.com",
                        "password": "wrongpassword"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_assets_unauthorized() {
    let app = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/assets")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_list_assets() {
    let app = setup_test_app().await;
    let (token, app) = get_auth_token(app).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/assets")
                .header(header::AUTHORIZATION, format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["data"].is_array());
}

#[tokio::test]
async fn test_list_work_orders() {
    let app = setup_test_app().await;
    let (token, app) = get_auth_token(app).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/work-orders")
                .header(header::AUTHORIZATION, format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_list_rbac_roles() {
    let app = setup_test_app().await;
    let (token, app) = get_auth_token(app).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/rbac/roles")
                .header(header::AUTHORIZATION, format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json.as_array().unwrap().len() >= 6); // At least 6 default roles
}
