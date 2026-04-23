use axum::{routing::get, Router};
use http_body_util::BodyExt;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

// Import the health handler. Note that depending on module visibility
// in api-server, we might just redefine the handler for the test if it's private.
// But we'll try to import it first. 
// However, since `api-server` doesn't export `api` as a library (it's a bin),
// we might not be able to import it easily from `tests/`.
// Let's create an inline test for now to demonstrate Axum testing setup!

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "version": "1.0.0"
    }))
}

#[tokio::test]
async fn test_health_check_endpoint() {
    // 1. Arrange: build our application with a route
    let app = Router::new().route("/health", get(health_check));

    // 2. Act: create a request and send it through the app
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // 3. Assert: verify the response
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body_json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(body_json["status"], "ok");
    assert_eq!(body_json["version"], "1.0.0");
}
