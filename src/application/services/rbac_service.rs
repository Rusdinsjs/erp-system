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
}
