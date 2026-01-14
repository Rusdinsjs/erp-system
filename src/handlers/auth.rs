use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;

use crate::config::AppConfig;
use crate::models::{LoginRequest, LoginResponse, UserInfo};
use crate::utils::jwt::{create_refresh_token, create_token};

// User struct for internal fetch
#[derive(sqlx::FromRow)]
struct UserRow {
    id: uuid::Uuid,
    email: String,
    password_hash: String,
    name: String,
    role: String,
}

/// Login handler
pub async fn login(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    let config = AppConfig::from_env();

    // Find user by email
    let user = sqlx::query_as::<_, UserRow>(
        r#"
        SELECT id, email, password_hash, name, role
        FROM users 
        WHERE email = $1 AND is_active = true
        "#,
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            "Invalid email or password".to_string(),
        )
    })?;

    // Verify password
    let parsed_hash = PasswordHash::new(&user.password_hash).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Password hash error".to_string(),
        )
    })?;

    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid email or password".to_string(),
            )
        })?;

    // Generate tokens
    let access_token = create_token(
        user.id,
        &user.email,
        &user.role,
        &config.jwt_secret,
        config.jwt_expiration_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = create_refresh_token(user.id, &user.email, &user.role, &config.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: config.jwt_expiration_hours * 3600,
        user: UserInfo {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
    }))
}

/// Hash a password for storage
#[allow(dead_code)]
pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(password_hash.to_string())
}
