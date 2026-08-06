//! RBAC Service

use uuid::Uuid;

use crate::domain::entities::{Permission, Role, UserRoleAssignment};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::RbacRepository;

#[derive(Clone)]
pub struct RbacService {
    repository: RbacRepository,
}

impl RbacService {
    pub fn new(repository: RbacRepository) -> Self {
        Self { repository }
    }

    /// Get all roles
    pub async fn list_roles(&self) -> DomainResult<Vec<Role>> {
        self.repository
            .list_roles()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get role by code
    pub async fn get_role_by_code(&self, code: &str) -> DomainResult<Role> {
        self.repository
            .find_role_by_code(code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Role", code))
    }

    /// Get all permissions
    pub async fn list_permissions(&self) -> DomainResult<Vec<Permission>> {
        self.repository
            .list_permissions()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get permissions for a role
    pub async fn get_role_permissions(&self, role_id: Uuid) -> DomainResult<Vec<Permission>> {
        self.repository
            .get_role_permissions(role_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get user's roles
    pub async fn get_user_roles(&self, user_id: Uuid) -> DomainResult<Vec<Role>> {
        self.repository.get_user_roles(user_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    /// Get user's permissions (aggregated from all roles)
    pub async fn get_user_permissions(&self, user_id: Uuid) -> DomainResult<Vec<Permission>> {
        self.repository
            .get_user_permissions(user_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Check if user has specific permission
    pub async fn user_has_permission(
        &self,
        user_id: Uuid,
        permission_code: &str,
    ) -> DomainResult<bool> {
        self.repository
            .user_has_permission(user_id, permission_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Require permission (throws error if not authorized)
    pub async fn require_permission(
        &self,
        user_id: Uuid,
        permission_code: &str,
    ) -> DomainResult<()> {
        let has_permission = self.user_has_permission(user_id, permission_code).await?;
        if !has_permission {
            return Err(DomainError::unauthorized(permission_code));
        }
        Ok(())
    }

    /// Assign role to user
    pub async fn assign_role(
        &self,
        user_id: Uuid,
        role_code: &str,
        granted_by: Option<Uuid>,
        organization_id: Option<Uuid>,
    ) -> DomainResult<UserRoleAssignment> {
        let role = self.get_role_by_code(role_code).await?;

        self.repository
            .assign_role_to_user(user_id, role.id, granted_by, organization_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Remove role from user
    pub async fn remove_role(&self, user_id: Uuid, role_code: &str) -> DomainResult<bool> {
        let role = self.get_role_by_code(role_code).await?;

        self.repository
            .remove_role_from_user(user_id, role.id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get permission codes for user (for JWT claims)
    pub async fn get_user_permission_codes(&self, user_id: Uuid) -> DomainResult<Vec<String>> {
        let permissions = self.get_user_permissions(user_id).await?;
        Ok(permissions.into_iter().map(|p| p.code).collect())
    }

    /// Update permissions for a role (bulk operation)
    pub async fn update_role_permissions(
        &self,
        role_id: Uuid,
        permission_ids: Vec<Uuid>,
    ) -> DomainResult<()> {
        self.repository
            .update_role_permissions(role_id, permission_ids)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Create a new custom role (Super Admin only)
    pub async fn create_role(
        &self,
        code: &str,
        name: &str,
        description: Option<&str>,
        role_level: i32,
    ) -> DomainResult<Role> {
        // Validate role_level range
        if !(1..=5).contains(&role_level) {
            return Err(DomainError::validation(
                "role_level",
                "Role level must be between 1 and 5",
            ));
        }

        // Normalize code: uppercase + spaces to underscores
        let code_normalized = code.trim().to_uppercase().replace(' ', "_");

        // Ensure code uniqueness
        let exists = self
            .repository
            .role_exists(&code_normalized)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        if exists {
            return Err(DomainError::validation(
                "code",
                &format!("Role code '{}' already exists", code_normalized),
            ));
        }

        self.repository
            .insert_role(&code_normalized, name.trim(), description, role_level)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Update an existing role (non-system roles only)
    pub async fn update_role(
        &self,
        role_id: Uuid,
        name: &str,
        description: Option<&str>,
        role_level: i32,
    ) -> DomainResult<Role> {
        if !(1..=5).contains(&role_level) {
            return Err(DomainError::validation(
                "role_level",
                "Role level must be between 1 and 5",
            ));
        }

        self.repository
            .update_role(role_id, name.trim(), description, role_level)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Delete a non-system role
    pub async fn delete_role(&self, role_id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete_role(role_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Securely assign role to user (QSEC-002: Prevents privilege escalation & self-escalation)
    pub async fn assign_role_secure(
        &self,
        actor: &crate::domain::authz::ActorContext,
        target_user_id: Uuid,
        target_org_id: Option<Uuid>,
        role_code: &str,
    ) -> DomainResult<UserRoleAssignment> {
        validate_role_mutation(actor, target_user_id, target_org_id)?;

        let role = self.get_role_by_code(role_code).await?;

        let assignment = self
            .repository
            .assign_role_to_user(target_user_id, role.id, Some(actor.user_id), target_org_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        tracing::info!(
            "AUDIT ROLE MUTATION: Action=ASSIGN Actor={} Target={} Role={}",
            actor.user_id,
            target_user_id,
            role_code
        );

        Ok(assignment)
    }

    /// Securely remove role from user (QSEC-002)
    pub async fn remove_role_secure(
        &self,
        actor: &crate::domain::authz::ActorContext,
        target_user_id: Uuid,
        target_org_id: Option<Uuid>,
        role_code: &str,
    ) -> DomainResult<bool> {
        validate_role_mutation(actor, target_user_id, target_org_id)?;

        let role = self.get_role_by_code(role_code).await?;

        let removed = self
            .repository
            .remove_role_from_user(target_user_id, role.id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        tracing::info!(
            "AUDIT ROLE MUTATION: Action=REMOVE Actor={} Target={} Role={}",
            actor.user_id,
            target_user_id,
            role_code
        );

        Ok(removed)
    }
}

/// Validate role mutation invariants (QSEC-002)
pub fn validate_role_mutation(
    actor: &crate::domain::authz::ActorContext,
    target_user_id: Uuid,
    target_org_id: Option<Uuid>,
) -> DomainResult<()> {
    // 1. Authorization check: Must have security.role.manage or be admin
    if !actor.is_admin()
        && !actor
            .permissions
            .iter()
            .any(|p| p == "*" || p == "security.role.manage" || p == "role.assign")
    {
        return Err(DomainError::unauthorized("security.role.manage"));
    }

    // 2. Self-escalation prevention
    if actor.user_id == target_user_id {
        return Err(DomainError::BusinessRuleViolation {
            rule: "SelfEscalationDenied".to_string(),
            message: "Self-escalation or self-modification of roles is strictly prohibited".to_string(),
        });
    }

    // 3. Cross-tenant isolation check
    if let (Some(actor_org), Some(target_org)) = (actor.organization_id, target_org_id) {
        if actor_org != target_org && !actor.is_super_admin() {
            return Err(DomainError::unauthorized("cross_tenant_role_assignment"));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::authz::ActorContext;

    #[test]
    fn test_normal_user_cannot_grant_roles() {
        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "user".to_string(),
            role_level: 5,
            permissions: vec!["asset.read".to_string()],
            organization_id: None,
            company_id: None,
        };
        let target_id = Uuid::new_v4();

        let result = validate_role_mutation(&actor, target_id, None);
        assert!(result.is_err());
        if let Err(DomainError::Unauthorized { action }) = result {
            assert_eq!(action, "security.role.manage");
        } else {
            panic!("Expected unauthorized error");
        }
    }

    #[test]
    fn test_self_escalation_denied() {
        let user_id = Uuid::new_v4();
        let actor = ActorContext {
            user_id,
            role: "admin".to_string(),
            role_level: 2,
            permissions: vec!["security.role.manage".to_string()],
            organization_id: None,
            company_id: None,
        };

        let result = validate_role_mutation(&actor, user_id, None);
        assert!(result.is_err());
        if let Err(DomainError::BusinessRuleViolation { rule, .. }) = result {
            assert_eq!(rule, "SelfEscalationDenied");
        } else {
            panic!("Expected SelfEscalationDenied error");
        }
    }

    #[test]
    fn test_cross_tenant_mutation_denied() {
        let actor_org = Uuid::new_v4();
        let target_org = Uuid::new_v4();

        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "admin".to_string(),
            role_level: 2,
            permissions: vec!["security.role.manage".to_string()],
            organization_id: Some(actor_org),
            company_id: None,
        };
        let target_id = Uuid::new_v4();

        let result = validate_role_mutation(&actor, target_id, Some(target_org));
        assert!(result.is_err());
        if let Err(DomainError::Unauthorized { action }) = result {
            assert_eq!(action, "cross_tenant_role_assignment");
        } else {
            panic!("Expected cross_tenant_role_assignment error");
        }
    }

    #[test]
    fn test_authorized_admin_mutation_succeeds() {
        let org_id = Uuid::new_v4();
        let actor = ActorContext {
            user_id: Uuid::new_v4(),
            role: "admin".to_string(),
            role_level: 2,
            permissions: vec!["security.role.manage".to_string()],
            organization_id: Some(org_id),
            company_id: None,
        };
        let target_id = Uuid::new_v4();

        let result = validate_role_mutation(&actor, target_id, Some(org_id));
        assert!(result.is_ok());
    }
}

