//! Integration Tests for Asset Management Workflow

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

    let jwt_config = asset_management::shared::utils::jwt::JwtConfig {
        secret: jwt_secret,
        expiry_hours: 24,
    };

    let state = asset_management::api::server::AppState::new(pool, jwt_config);
    asset_management::api::server::create_app(state)
}

/// Helper to login and get token
async fn get_auth_token(app: Router) -> (String, Router) {
    // We clone the router logic by creating a fresh one because oneshot consumes it
    // But since we can't easily clone Router, we just reuse the setup function strategy
    // In a real optimized test we might restructure, but for integration this is fine.

    // First request to get token
    let response = app
        .clone()
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

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    let token = json["token"].as_str().expect("Token not found").to_string();

    (token, app)
}

#[tokio::test]
async fn test_work_order_lifecycle() {
    let app = setup_test_app().await;
    let (token, app) = get_auth_token(app).await;
    let auth_header = format!("Bearer {}", token);

    // 0. Create Category
    let category_name = format!("Test Category {}", uuid::Uuid::new_v4());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/categories")
                .header(header::AUTHORIZATION, &auth_header)
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "name": category_name,
                        "code": format!("CAT-{}", uuid::Uuid::new_v4().to_string().get(0..4).unwrap()),
                        "description": "Integration Test Category"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    println!("Create Category Status: {:?}", status);
    println!("Create Category Body: {:?}", body);

    let cat_json: Value = if body.is_empty() {
        json!({"success": false, "error": "Empty body"})
    } else {
        serde_json::from_slice(&body).unwrap_or(json!({"success": false, "error": "Invalid JSON"}))
    };
    // Assuming category response has ID
    // If fail, print body
    if !cat_json["success"].as_bool().unwrap_or(true) {
        println!("Category creation failed: {:?}", cat_json);
    }
    let category_id = if cat_json.get("data").is_some() {
        cat_json["data"]["id"].as_str().unwrap()
    } else {
        cat_json["id"].as_str().unwrap()
    };

    // 1. Create Asset
    let asset_code = format!("TEST-ASSET-{}", uuid::Uuid::new_v4());
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/assets")
                .header(header::AUTHORIZATION, &auth_header)
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "name": "Integration Test Generator",
                        "asset_code": asset_code,
                        "category_id": category_id,
                        "status": "deployed", // Start as deployed
                        "location_id": null
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    // If category doesn't exist might fail, but let's assume seed data exists or use a robust way.
    // Ideally we fetch a category first. But let's check status.
    if response.status() != StatusCode::CREATED && response.status() != StatusCode::OK {
        // Fallback: If status is 400/500, maybe category ID is wrong.
        // For this run, let's assume 201.
        // println!("Asset create failed: {:?}", response.status());
    }

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let asset_json: Value = serde_json::from_slice(&body).unwrap();
    // Support both enveloped and direct response
    let asset_id = if asset_json.get("data").is_some() {
        asset_json["data"]["id"].as_str().unwrap()
    } else {
        asset_json["id"].as_str().unwrap()
    };

    // 2. Create Work Order (Maintenance)
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/work-orders")
                .header(header::AUTHORIZATION, &auth_header)
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "asset_id": asset_id,
                        "wo_type": "Maintenance",
                        "priority": "High",
                        "problem_description": "Integration Test Maintenance"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let wo_json: Value = serde_json::from_slice(&body).unwrap();
    let wo_id = wo_json["data"]["id"].as_str().unwrap();

    // 3. Approve Work Order
    // Reuse admin token for approval

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(&format!("/api/approvals/{}/approve", wo_id))
                .header(header::AUTHORIZATION, &auth_header)
                .header("Content-Type", "application/json")
                .body(Body::from(json!({}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // 4. Start Work
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(&format!("/api/work-orders/{}/start", wo_id))
                .header(header::AUTHORIZATION, &auth_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    if response.status() != StatusCode::OK {
        let status = response.status();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        println!("Start Work Failed: {:?} - {:?}", status, body);
        panic!("Start Work Failed");
    }
    assert_eq!(response.status(), StatusCode::OK);

    // 5. Verify Asset Status became 'under_maintenance'
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(&format!("/api/assets/{}", asset_id))
                .header(header::AUTHORIZATION, &auth_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let check_asset: Value = serde_json::from_slice(&body).unwrap();
    let current_status = if check_asset.get("data").is_some() {
        check_asset["data"]["status"].as_str().unwrap()
    } else {
        check_asset["status"].as_str().unwrap()
    };

    assert_eq!(
        current_status, "under_maintenance",
        "Asset status should be under_maintenance after starting WO"
    );

    // 6. Complete Work
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(&format!("/api/work-orders/{}/complete", wo_id))
                .header(header::AUTHORIZATION, &auth_header)
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "work_performed": "Fixed by integration test",
                         "actual_cost": 100
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // 7. Verify Asset Status became 'deployed' again
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(&format!("/api/assets/{}", asset_id))
                .header(header::AUTHORIZATION, &auth_header)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let final_asset: Value = serde_json::from_slice(&body).unwrap();
    let final_status = if final_asset.get("data").is_some() {
        final_asset["data"]["status"].as_str().unwrap()
    } else {
        final_asset["status"].as_str().unwrap()
    };

    assert_eq!(
        final_status, "deployed",
        "Asset status should be deployed after completing WO"
    );
}
