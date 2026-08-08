//! Application Configuration (QSEC-010 Secret Hygiene)

use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: Option<String>,
    pub server_host: String,
    pub server_port: u16,
    pub jwt_secret: String,
    pub jwt_expiry_hours: i64,
    pub environment: String,
    pub smtp_host: String,
    pub smtp_user: Option<String>,
    pub smtp_pass: Option<String>,
    pub smtp_from: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let config = Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL").ok(),
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8181".to_string()))
                .parse()
                .expect("SERVER_PORT must be a number"),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "super-secret-key-change-in-production".to_string()),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
            environment: env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string()),
            smtp_host: env::var("SMTP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            smtp_user: env::var("SMTP_USER").ok(),
            smtp_pass: env::var("SMTP_PASS").ok(),
            smtp_from: env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@example.com".to_string()),
        };

        config.validate_production_secrets();
        config
    }

    pub fn is_production(&self) -> bool {
        self.environment.eq_ignore_ascii_case("production")
            || self.environment.eq_ignore_ascii_case("prod")
    }

    /// Return sanitized database URL with password masked out (QSEC-010)
    pub fn sanitized_db_url(&self) -> String {
        sanitize_connection_string(&self.database_url)
    }

    /// Validate production secrets to prevent starting production with default/weak credentials (QSEC-010)
    pub fn validate_production_secrets(&self) {
        if self.is_production() {
            const INSECURE_JWT_KEYS: &[&str] = &[
                "super-secret-key-change-in-production",
                "your-super-secret-key-change-in-production-please",
                "super-secret-key",
                "change-me-in-production",
                "secret",
            ];

            if INSECURE_JWT_KEYS.contains(&self.jwt_secret.as_str()) || self.jwt_secret.len() < 16 {
                panic!(
                    "FATAL SECURITY ERROR (QSEC-010): Weak or default JWT_SECRET used in PRODUCTION environment! You must supply a strong JWT_SECRET environment variable (minimum 16 characters)."
                );
            }

            if self.database_url.contains("postgres:postgres@") {
                tracing::warn!(
                    "SECURITY WARNING (QSEC-010): Default postgres:postgres credentials detected in production database URL!"
                );
            }
        }
    }
}

/// Helper to mask passwords in connection strings (postgres://user:password@host/db -> postgres://user:***@host/db)
pub fn sanitize_connection_string(url_str: &str) -> String {
    if let Some(scheme_end) = url_str.find("://") {
        let prefix = &url_str[..scheme_end + 3];
        let rest = &url_str[scheme_end + 3..];
        if let Some(at_idx) = rest.find('@') {
            let user_pass = &rest[..at_idx];
            let host_and_path = &rest[at_idx..];
            if let Some(colon_idx) = user_pass.find(':') {
                let user = &user_pass[..colon_idx];
                return format!("{}{}:***{}", prefix, user, host_and_path);
            }
        }
    }
    url_str.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_connection_string_masks_password() {
        let raw = "postgres://postgres:secret123@mgmt-db:5432/management_system";
        let sanitized = sanitize_connection_string(raw);
        assert!(!sanitized.contains("secret123"));
        assert!(sanitized.contains("***"));
    }

    #[test]
    #[should_panic(expected = "FATAL SECURITY ERROR")]
    fn test_production_fails_with_default_jwt_secret() {
        let config = AppConfig {
            database_url: "postgres://user:pass@localhost:5432/db".to_string(),
            redis_url: None,
            server_host: "0.0.0.0".to_string(),
            server_port: 8080,
            jwt_secret: "super-secret-key".to_string(),
            jwt_expiry_hours: 24,
            environment: "production".to_string(),
            smtp_host: "127.0.0.1".to_string(),
            smtp_user: None,
            smtp_pass: None,
            smtp_from: "noreply@example.com".to_string(),
        };

        config.validate_production_secrets();
    }
}
