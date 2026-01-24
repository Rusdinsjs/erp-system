use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

mod test_utils;

// Helper to add ConnectInfo (needed for oneshot with middlewares)
fn add_connect_info(req: &mut Request<Body>) {
    use axum::extract::connect_info::ConnectInfo;
    use std::net::SocketAddr;
    req.extensions_mut()
        .insert(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 8080))));
}

async fn get_auth_token(app: &axum::Router, pool: &sqlx::PgPool) -> String {
    let unique = Uuid::new_v4();
    let email = format!("admin_crud_{}@example.com", unique);
    let password = "Password123!";

    // Register (Creates default 'user' role)
    let mut req = Request::builder()
        .uri("/api/auth/register")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(
            serde_json::json!({
                "email": email,
                "password": password,
                "name": "Admin User",
                "role_code": "admin" // Ignored by service
            })
            .to_string(),
        ))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    if response.status() != StatusCode::CREATED {
        panic!("Register failed");
    }

    // MANUALLY PROMOTE TO ADMIN via ROLE ID (to get role_level=1)
    let admin_role_record = sqlx::query!("SELECT id FROM roles WHERE code = 'admin'")
        .fetch_optional(pool)
        .await
        .unwrap();

    // If admin role exists (seeded), assign it. Else fallback to string update (which fails level check).
    // Dev DB usually has 'admin' role seeded.
    if let Some(role) = admin_role_record {
        // Assign Role
        sqlx::query!(
            "UPDATE users SET role_id = $1 WHERE email = $2",
            role.id,
            email
        )
        .execute(pool)
        .await
        .unwrap();

        // Ensure Admin Role is actually Level 1 (Super Admin) to bypass approval
        sqlx::query!("UPDATE roles SET role_level = 1 WHERE id = $1", role.id)
            .execute(pool)
            .await
            .unwrap();

        // Seed Permissions (in case DB is empty) within Transaction
        let mut tx = pool.begin().await.unwrap();

        let perm_id_val = Uuid::new_v4(); // Generate a new UUID for the permission
        let perm_id = sqlx::query!(
            "INSERT INTO permissions (id, code, name, resource, action, description) VALUES ($1, 'asset.*', 'Asset All', 'asset', 'all', 'Full Asset Access') ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code RETURNING id",
            perm_id_val
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap()
        .id;

        sqlx::query!(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            role.id,
            perm_id
        )
        .execute(&mut *tx)
        .await
        .unwrap();

        tx.commit().await.unwrap();
    } else {
        // If no roles table, we can't easily force level 1 without modifying code or manually inserting role.
        // Assuming seeded DB.
        panic!("Admin role not found in DB - cannot promote test user");
    }

    // Login (Now as Admin)
    let mut req = Request::builder()
        .uri("/api/auth/login")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(
            serde_json::json!({
                "email": email,
                "password": password
            })
            .to_string(),
        ))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: Value = serde_json::from_slice(&body).unwrap();

    json["token"].as_str().expect("Token missing").to_string()
}

#[tokio::test]
async fn test_asset_crud_flow() {
    let app = test_utils::setup_app().await;
    // We need pool for get_auth_token backdoor. setup_app hides it.
    // Re-getting pool via common::setup (it creates new connection pool but to same DB).
    let pool = test_utils::common::setup().await;

    let token = get_auth_token(&app, &pool).await;

    let unique = Uuid::new_v4();

    // DB Setup for Category
    let pool = test_utils::common::setup().await;
    let category_id = Uuid::new_v4();
    // Use upsert or ignore conflict for category
    sqlx::query!("INSERT INTO categories (id, name, code) VALUES ($1, 'Test Cat', $2) ON CONFLICT DO NOTHING", category_id, format!("CAT-{}", unique))
        .execute(&pool).await.unwrap();

    // Use Timestamp + UUID to guarantee uniqueness
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let asset_code = format!("TEST-ASSET-{}", nanos);
    println!("Generated Asset Code: {}", asset_code);

    // Ensure cleanup of any previous collision (safe guard)
    sqlx::query!("DELETE FROM assets WHERE asset_code = $1", asset_code)
        .execute(&pool)
        .await
        .unwrap();

    let create_payload = serde_json::json!({
        "asset_code": asset_code,
        "name": "Integration Test Asset",
        "category_id": category_id,
        "status": "InInventory"
    });

    // 1. Create Asset
    let mut req = Request::builder()
        .uri("/api/assets")
        .method("POST")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::from(create_payload.to_string()))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    if response.status() != StatusCode::OK && response.status() != StatusCode::CREATED {
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        panic!("Create asset failed: {} - {:?}", status, body);
    }

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result_json: Value = serde_json::from_slice(&body).unwrap();

    // API returns wrapped response { "data": { "id": ... } }
    let asset_id = if let Some(data) = result_json.get("data") {
        data["id"].as_str().expect("Id missing in data").to_string()
    } else {
        result_json["id"]
            .as_str()
            .expect("Id missing in root")
            .to_string()
    };

    // 2. Get Asset (GET /api/assets/:id)
    let mut req = Request::builder()
        .uri(&format!("/api/assets/{}", asset_id))
        .method("GET")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK, "Get asset failed");

    // 3. Update Asset (PUT /api/assets/:id)
    let update_payload = serde_json::json!({
        "name": "Updated Integration Asset",
        "status": "Deployed"
    });

    let mut req = Request::builder()
        .uri(&format!("/api/assets/{}", asset_id))
        .method("PUT")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::from(update_payload.to_string()))
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    if response.status() != StatusCode::OK {
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        panic!("Update asset failed: {} - {:?}", status, body);
    }

    // 4. Delete Asset (DELETE /api/assets/:id)
    let mut req = Request::builder()
        .uri(&format!("/api/assets/{}", asset_id))
        .method("DELETE")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK, "Delete asset failed");

    // 5. Verify Deletion (GET -> 200 with status 'archived')
    let mut req = Request::builder()
        .uri(&format!("/api/assets/{}", asset_id))
        .method("GET")
        .header("Authorization", format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap();
    add_connect_info(&mut req);

    let response = app.clone().oneshot(req).await.unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Get deleted asset should be 200 (Archived)"
    );

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let result_json: Value = serde_json::from_slice(&body).unwrap();

    let current_status = if let Some(data) = result_json.get("data") {
        data["status"].as_str().expect("Status missing").to_string()
    } else {
        result_json["status"]
            .as_str()
            .expect("Status missing")
            .to_string()
    };

    // Status can be "archived" or "Archived" depending on impl
    assert_eq!(
        current_status.to_lowercase(),
        "archived",
        "Asset status should be archived"
    );
}
