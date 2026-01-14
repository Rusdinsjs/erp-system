//! JWT Utilities

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{de::DeserializeOwned, Serialize};

#[derive(Debug, Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub expiry_hours: i64,
}

impl JwtConfig {
    pub fn new(secret: String, expiry_hours: i64) -> Self {
        Self {
            secret,
            expiry_hours,
        }
    }

    pub fn from_env() -> Self {
        Self {
            secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| "super-secret-key".to_string()),
            expiry_hours: std::env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
        }
    }
}

/// Create JWT token
pub fn create_token<T: Serialize>(claims: &T, config: &JwtConfig) -> Result<String, String> {
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(config.secret.as_bytes()),
    )
    .map_err(|e| e.to_string())
}

/// Decode JWT token
pub fn decode_token<T: DeserializeOwned>(token: &str, config: &JwtConfig) -> Result<T, String> {
    let token_data = decode::<T>(
        token,
        &DecodingKey::from_secret(config.secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| e.to_string())?;

    Ok(token_data.claims)
}

/// Validate token and extract claims
pub fn validate_token<T: DeserializeOwned>(token: &str, config: &JwtConfig) -> Option<T> {
    decode_token(token, config).ok()
}
