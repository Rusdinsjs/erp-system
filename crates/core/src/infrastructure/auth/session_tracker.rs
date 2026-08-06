use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Thread-safe session tracker for JTI revocation & role security invalidations (QSEC-008)
#[derive(Clone, Default)]
pub struct SessionTracker {
    /// Maps revoked JTI string -> revocation expiration time
    revoked_jtis: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    /// Maps user_id -> timestamp when user sessions were invalidated (e.g. role mutation / password change)
    user_invalidations: Arc<RwLock<HashMap<Uuid, i64>>>,
}

impl SessionTracker {
    pub fn new() -> Self {
        Self {
            revoked_jtis: Arc::new(RwLock::new(HashMap::new())),
            user_invalidations: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Revoke a specific token JTI (e.g. on logout or explicit revocation)
    pub async fn revoke_jti(&self, jti: String, expires_at: DateTime<Utc>) {
        let mut map = self.revoked_jtis.write().await;
        map.insert(jti, expires_at);
    }

    /// Check if a JTI is revoked
    pub async fn is_jti_revoked(&self, jti: &str) -> bool {
        let map = self.revoked_jtis.read().await;
        if let Some(exp) = map.get(jti) {
            if *exp > Utc::now() {
                return true;
            }
        }
        false
    }

    /// Invalidate all active tokens for a specific user issued BEFORE this moment
    /// (called on role assignment, role removal, password change, or security mutation)
    pub async fn invalidate_user_sessions(&self, user_id: Uuid) {
        let now_epoch = Utc::now().timestamp();
        let mut map = self.user_invalidations.write().await;
        map.insert(user_id, now_epoch);
        tracing::info!(
            "Invalidated active sessions for user {} issued before {}",
            user_id,
            now_epoch
        );
    }

    /// Check if token issued at timestamp (`iat`) for `user_id` was invalidated by security mutation
    pub async fn is_user_token_invalidated(&self, user_id: Uuid, iat: i64) -> bool {
        let map = self.user_invalidations.read().await;
        if let Some(&invalidated_before) = map.get(&user_id) {
            if iat <= invalidated_before {
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_jti_revocation() {
        let tracker = SessionTracker::new();
        let jti = "test-jti-123".to_string();

        assert!(!tracker.is_jti_revoked(&jti).await);

        tracker
            .revoke_jti(jti.clone(), Utc::now() + chrono::Duration::hours(1))
            .await;

        assert!(tracker.is_jti_revoked(&jti).await);
    }

    #[tokio::test]
    async fn test_user_session_invalidation_after_role_change() {
        let tracker = SessionTracker::new();
        let user_id = Uuid::new_v4();
        let old_iat = Utc::now().timestamp() - 100;

        // Active token issued before role change should be valid initially
        assert!(!tracker.is_user_token_invalidated(user_id, old_iat).await);

        // Role is revoked/mutated -> invalidate active sessions
        tracker.invalidate_user_sessions(user_id).await;

        // Old token issued before role change is now rejected
        assert!(tracker.is_user_token_invalidated(user_id, old_iat).await);

        // Newly issued token (iat in future relative to invalidation) remains valid
        let new_iat = Utc::now().timestamp() + 10;
        assert!(!tracker.is_user_token_invalidated(user_id, new_iat).await);
    }
}
