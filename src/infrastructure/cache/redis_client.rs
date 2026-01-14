//! Redis Client
//!
//! Redis cache client for session management, caching, and rate limiting.

use deadpool_redis::{Config, Runtime};
use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

/// Redis configuration
#[derive(Debug, Clone)]
pub struct RedisConfig {
    pub url: String,
    pub pool_size: u32,
    pub default_ttl: Duration,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            pool_size: 10,
            default_ttl: Duration::from_secs(3600), // 1 hour
        }
    }
}

impl RedisConfig {
    pub fn from_env() -> Self {
        Self {
            url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            pool_size: std::env::var("REDIS_POOL_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            default_ttl: Duration::from_secs(
                std::env::var("REDIS_DEFAULT_TTL")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(3600),
            ),
        }
    }
}

/// Cache error types
#[derive(Debug)]
pub enum CacheError {
    ConnectionError(String),
    SerializationError(String),
    DeserializationError(String),
    OperationError(String),
    NotConnected,
}

impl std::fmt::Display for CacheError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ConnectionError(msg) => write!(f, "Cache connection error: {}", msg),
            Self::SerializationError(msg) => write!(f, "Cache serialization error: {}", msg),
            Self::DeserializationError(msg) => write!(f, "Cache deserialization error: {}", msg),
            Self::OperationError(msg) => write!(f, "Cache operation error: {}", msg),
            Self::NotConnected => write!(f, "Cache not connected"),
        }
    }
}

impl std::error::Error for CacheError {}

/// Redis cache operations trait (Object-Safe)
#[async_trait::async_trait]
pub trait CacheOperations: Send + Sync {
    async fn get_raw(&self, key: &str) -> Result<Option<String>, CacheError>;
    async fn set_raw(
        &self,
        key: &str,
        value: &str,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError>;
    async fn delete(&self, key: &str) -> Result<(), CacheError>;
    async fn exists(&self, key: &str) -> Result<bool, CacheError>;
    async fn incr(&self, key: &str, ttl: Duration) -> Result<i64, CacheError>;
    async fn set_nx(
        &self,
        key: &str,
        value: &str,
        ttl: Option<Duration>,
    ) -> Result<bool, CacheError>;
}

/// Helper trait for typed access
#[async_trait::async_trait]
pub trait CacheJson {
    async fn get_json<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, CacheError>;
    async fn set_json<T: Serialize + Send + Sync>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError>;
}

#[async_trait::async_trait]
impl<C: CacheOperations + ?Sized> CacheJson for C {
    async fn get_json<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, CacheError> {
        match self.get_raw(key).await? {
            Some(v) => {
                let parsed: T = serde_json::from_str(&v)
                    .map_err(|e| CacheError::DeserializationError(e.to_string()))?;
                Ok(Some(parsed))
            }
            None => Ok(None),
        }
    }

    async fn set_json<T: Serialize + Send + Sync>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError> {
        let json = serde_json::to_string(value)
            .map_err(|e| CacheError::SerializationError(e.to_string()))?;
        self.set_raw(key, &json, ttl).await
    }
}

/// Real Redis cache implementation
#[derive(Clone)]
pub struct RedisCache {
    pool: deadpool_redis::Pool,
    default_ttl: Duration,
}

impl RedisCache {
    pub fn new(config: &RedisConfig) -> Self {
        let mut cfg = Config::from_url(&config.url);
        cfg.pool = Some(deadpool_redis::PoolConfig::new(config.pool_size as usize));

        let pool = cfg
            .create_pool(Some(Runtime::Tokio1))
            .expect("Failed to create Redis pool");

        Self {
            pool,
            default_ttl: config.default_ttl,
        }
    }
}

#[async_trait::async_trait]
impl CacheOperations for RedisCache {
    async fn get_raw(&self, key: &str) -> Result<Option<String>, CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;
        let value: Option<String> = conn
            .get(key)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        Ok(value)
    }

    async fn set_raw(
        &self,
        key: &str,
        value: &str,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;
        let ttl_secs = ttl.unwrap_or(self.default_ttl).as_secs();

        // Use set_ex for atomic set with expiry
        let _: () = conn
            .set_ex(key, value, ttl_secs)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<(), CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;
        let _: () = conn
            .del(key)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool, CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;
        let result: bool = conn
            .exists(key)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        Ok(result)
    }

    async fn incr(&self, key: &str, ttl: Duration) -> Result<i64, CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;

        // Atomic increment
        let count: i64 = conn
            .incr(key, 1)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        // If first increment, set expiry
        if count == 1 {
            let _: () = conn
                .expire(key, ttl.as_secs() as i64)
                .await
                .map_err(|e| CacheError::OperationError(e.to_string()))?;
        }

        Ok(count)
    }

    async fn set_nx(
        &self,
        key: &str,
        value: &str,
        ttl: Option<Duration>,
    ) -> Result<bool, CacheError> {
        let mut conn = self
            .pool
            .get()
            .await
            .map_err(|e| CacheError::ConnectionError(e.to_string()))?;

        // Use low-level command for SET NX EX (Set if Not Exists with Expiry)
        // Command: SET key value NX EX seconds
        let ttl_secs = ttl.unwrap_or(self.default_ttl).as_secs();

        // Note: redis crate `set_nx` returns a bool (0 or 1).
        // But for atomic NX + EX we need `cmd("SET")`.

        let result: Option<String> = redis::cmd("SET")
            .arg(key)
            .arg(value)
            .arg("NX")
            .arg("EX")
            .arg(ttl_secs)
            .query_async(&mut conn)
            .await
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        // If result is OK (Some("OK")), it was set. If None/Null, it wasn't.
        Ok(result.is_some())
    }
}

/// Cache key builder for consistent key naming
pub struct CacheKey;

impl CacheKey {
    /// Asset cache key
    pub fn asset(id: &uuid::Uuid) -> String {
        format!("asset:{}", id)
    }

    /// Asset list cache key
    pub fn asset_list(page: i64, per_page: i64) -> String {
        format!("assets:list:{}:{}", page, per_page)
    }

    /// User session cache key
    pub fn user_session(user_id: &uuid::Uuid) -> String {
        format!("session:{}", user_id)
    }
}
