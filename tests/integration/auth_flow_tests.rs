use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::Value;
use tower::ServiceExt; // for oneshot
use uuid::Uuid;

mod test_utils;

#[tokio::test]
async fn test_auth_register_and_login() {
    let app = test_utils::setup_app().await;

    // Unique user for this test run
    let unique = Uuid::new_v4();
    let email = format!("auth_test_{}@example.com", unique);
    let password = "Password123!";

    // Helper to add ConnectInfo
    let add_connect_info = |req: &mut Request<Body>| {
        use axum::extract::connect_info::ConnectInfo;
        use std::net::SocketAddr;
        req.extensions_mut()
            .insert(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 8080))));
    };

    // 1. Register User
    let register_payload = serde_json::json!({
        "email": email,
        "password": password,
        "name": "Auth Test User",
        "role_code": "user"
    });

    let mut req = Request::builder()
        .uri("/api/auth/register")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(register_payload.to_string()))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    if response.status() != StatusCode::CREATED {
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        panic!("Register failed: {} - {:?}", status, body);
    }

    // 2. Login (Success)
    let login_payload = serde_json::json!({
        "email": email,
        "password": password
    });

    let mut req = Request::builder()
        .uri("/api/auth/login")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(login_payload.to_string()))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK, "Login failed");

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_json: Value = serde_json::from_slice(&body_bytes).unwrap();

    assert!(
        body_json.get("token").is_some(),
        "Token missing in login response"
    );

    // 3. Login (Invalid Password)
    let bad_login = serde_json::json!({
        "email": email,
        "password": "WrongPassword!"
    });

    let mut req = Request::builder()
        .uri("/api/auth/login")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(bad_login.to_string()))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "Allowed login with wrong password"
    );
}
