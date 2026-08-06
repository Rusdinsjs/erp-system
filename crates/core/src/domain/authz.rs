//! Centralized AuthorizationEngine Contract (QSEC-001)

use std::collections::HashMap;
use uuid::Uuid;

/// Actor executing the requested action
#[derive(Debug, Clone)]
pub struct ActorContext {
    pub user_id: Uuid,
    pub role: String,
    pub role_level: i32,
    pub permissions: Vec<String>,
    pub organization_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
}

impl ActorContext {
    pub fn from_claims(claims: &crate::domain::entities::UserClaims) -> Self {
        let org_id = claims.org.as_deref().and_then(|id| Uuid::parse_str(id).ok());
        Self {
            user_id: claims.user_id(),
            role: claims.role.clone(),
            role_level: claims.role_level,
            permissions: claims.permissions.clone(),
            organization_id: org_id,
            company_id: None,
        }
    }

    pub fn is_super_admin(&self) -> bool {
        self.role == "super_admin" || self.role_level <= 1
    }

    pub fn is_admin(&self) -> bool {
        self.is_super_admin() || self.role == "admin" || self.role_level <= 2
    }
}

/// Context of the target resource being accessed
#[derive(Debug, Clone, Default)]
pub struct AuthzContext {
    pub organization_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub attributes: HashMap<String, String>,
}

/// Decision returned by the AuthorizationEngine
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthzDecision {
    Allow,
    Deny(String),
}

impl AuthzDecision {
    pub fn is_allowed(&self) -> bool {
        matches!(self, AuthzDecision::Allow)
    }
}

/// Centralized AuthorizationEngine trait (DENY by default)
pub trait AuthorizationEngine: Send + Sync {
    fn authorize(
        &self,
        actor: &ActorContext,
        action: &str,
        resource_type: &str,
        resource_id: Option<&str>,
        context: &AuthzContext,
    ) -> AuthzDecision;
}

/// Default implementation of AuthorizationEngine
pub struct DefaultAuthorizationEngine;

impl DefaultAuthorizationEngine {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DefaultAuthorizationEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthorizationEngine for DefaultAuthorizationEngine {
    fn authorize(
        &self,
        actor: &ActorContext,
        action: &str,
        resource_type: &str,
        _resource_id: Option<&str>,
        context: &AuthzContext,
    ) -> AuthzDecision {
        // 1. Super admin / system admin bypass
        if actor.is_admin() {
            return AuthzDecision::Allow;
        }

        // 2. Format required permission string: resource_type.action
        let required_perm = format!("{}.{}", resource_type, action);

        // 3. Evaluate permissions (DENY by default if empty or unmatched)
        let has_permission = actor.permissions.iter().any(|p| {
            if p == "*" || p == &required_perm {
                return true;
            }
            if let Some(prefix) = p.strip_suffix(".*") {
                if required_perm.starts_with(prefix) || resource_type == prefix {
                    return true;
                }
            }
            // Support view/read & edit/update aliases
            let norm_user = p.replace(".view", ".read").replace(".edit", ".update");
            let norm_req = required_perm.replace(".view", ".read").replace(".edit", ".update");
            norm_user == norm_req
        });

        if !has_permission {
            return AuthzDecision::Deny(format!("Access Denied: missing permission '{}'", required_perm));
        }

        // 4. Multi-tenancy / Cross-company validation
        if let (Some(actor_company), Some(res_company)) = (actor.company_id, context.company_id) {
            if actor_company != res_company && !actor.is_admin() {
                return AuthzDecision::Deny("Access Denied: cross-company isolation constraint violated".to_string());
            }
        }

        AuthzDecision::Allow
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_authz_engine_default_deny() {
        let engine = DefaultAuthorizationEngine::new();
        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "user".to_string(),
            role_level: 5,
            permissions: vec![],
            organization_id: None,
            company_id: None,
        };
        let ctx = AuthzContext::default();

        let decision = engine.authorize(&actor, "read", "asset", None, &ctx);
        assert!(!decision.is_allowed());
    }

    #[test]
    fn test_authz_engine_allow_matching_permission() {
        let engine = DefaultAuthorizationEngine::new();
        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "technician".to_string(),
            role_level: 4,
            permissions: vec!["asset.read".to_string()],
            organization_id: None,
            company_id: None,
        };
        let ctx = AuthzContext::default();

        let decision = engine.authorize(&actor, "read", "asset", None, &ctx);
        assert!(decision.is_allowed());
    }

    #[test]
    fn test_authz_engine_super_admin_bypass() {
        let engine = DefaultAuthorizationEngine::new();
        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "super_admin".to_string(),
            role_level: 1,
            permissions: vec![],
            organization_id: None,
            company_id: None,
        };
        let ctx = AuthzContext::default();

        let decision = engine.authorize(&actor, "delete", "user", None, &ctx);
        assert!(decision.is_allowed());
    }
}
