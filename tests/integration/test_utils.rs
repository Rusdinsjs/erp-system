use management_system::api::server::{create_app, AppState};
use management_system::shared::{config::AppConfig, utils::jwt::JwtConfig}; // Added AppConfig

#[path = "../common/mod.rs"]
pub mod common;

pub async fn setup_app() -> axum::Router {
    // Set env vars for Middleware (which use JwtConfig::from_env())
    std::env::set_var("JWT_SECRET", "test_secret_key_must_be_long_enough");
    std::env::set_var("JWT_EXPIRY_HOURS", "1");

    // We also need some basic SMTP config for EmailService if it initializes
    std::env::set_var("SMTP_HOST", "localhost");
    std::env::set_var("SMTP_USER", "user");
    std::env::set_var("SMTP_PASS", "pass");
    std::env::set_var("SMTP_FROM", "test@example.com");

    let pool = common::setup().await;

    // Config for tests
    let jwt_config = JwtConfig {
        secret: "test_secret_key_must_be_long_enough".to_string(),
        expiry_hours: 1,
    };

    // Create AppConfig from env (which we just set)
    let app_config = AppConfig::from_env();

    let state = AppState::new(pool, jwt_config, &app_config);
    create_app(state)
}
