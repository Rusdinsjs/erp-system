use uuid::Uuid;

use crate::application::dto::{
    ChangePasswordRequest, CreateUserRequest, UpdateProfileRequest, UpdateUserRequest,
};
use crate::domain::entities::{User, UserSummary};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{RbacRepository, UserRepository};
use crate::shared::utils::crypto::{hash_password, verify_password};

#[derive(Clone)]
pub struct UserService {
    repository: UserRepository,
    rbac_repo: RbacRepository,
}

impl UserService {
    pub fn new(repository: UserRepository, rbac_repo: RbacRepository) -> Self {
        Self {
            repository,
            rbac_repo,
        }
    }

    /// List users with pagination
    pub async fn list_users(&self, limit: i64, offset: i64) -> DomainResult<Vec<UserSummary>> {
        self.repository
            .list(limit, offset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Create new user
    pub async fn create_user(&self, req: CreateUserRequest) -> DomainResult<User> {
        // Check if email exists
        if let Some(_) = self
            .repository
            .find_by_email(&req.email)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        {
            return Err(DomainError::conflict("Email already registered"));
        }

        // Get Role ID from Role Code
        let role = self
            .rbac_repo
            .find_role_by_code(&req.role_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::bad_request("Invalid role code"))?;

        let password_hash =
            hash_password(&req.password).map_err(|e| DomainError::ExternalServiceError {
                service: "crypto".to_string(),
                message: e,
            })?;

        let mut user = User::new(req.email, password_hash, req.name);
        user.role = req.role_code; // Set legacy role code
        user.role_id = Some(role.id);
        user.department_id = req.department_id;
        user.organization_id = req.organization_id;

        self.repository
            .create(&user)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Update user
    pub async fn update_user(&self, id: Uuid, req: UpdateUserRequest) -> DomainResult<User> {
        let mut role_id = None;
        if let Some(code) = &req.role_code {
            let role = self
                .rbac_repo
                .find_role_by_code(code)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?
                .ok_or_else(|| DomainError::bad_request("Invalid role code"))?;
            role_id = Some(role.id);
        }

        let password_hash = if let Some(pwd) = req.password {
            Some(
                hash_password(&pwd).map_err(|e| DomainError::ExternalServiceError {
                    service: "crypto".to_string(),
                    message: e,
                })?,
            )
        } else {
            None
        };

        let _updated_user = self
            .repository
            .update(
                id,
                req.name,
                role_id,
                req.role_code,
                req.department,
                req.department_id,
                req.is_active,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // If password needs update
        if let Some(hash) = password_hash {
            self.repository
                .update_password(id, &hash)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        // Refetch to be sure (optional, but consistent)
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("User", id))
    }

    /// Delete user
    pub async fn delete_user(&self, id: Uuid) -> DomainResult<()> {
        let deleted =
            self.repository
                .delete(id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        if deleted {
            Ok(())
        } else {
            Err(DomainError::not_found("User", id))
        }
    }

    /// Get user profile
    pub async fn get_profile(&self, id: Uuid) -> DomainResult<User> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("User", id))
    }

    /// Update user profile
    pub async fn update_profile(&self, id: Uuid, req: UpdateProfileRequest) -> DomainResult<User> {
        self.repository
            .update_profile(id, req.name, req.phone)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Change password
    pub async fn change_password(&self, id: Uuid, req: ChangePasswordRequest) -> DomainResult<()> {
        let user = self.get_profile(id).await?;

        if !verify_password(&req.old_password, &user.password_hash) {
            return Err(DomainError::bad_request("Invalid old password"));
        }

        let new_hash =
            hash_password(&req.new_password).map_err(|e| DomainError::ExternalServiceError {
                service: "crypto".to_string(),
                message: e,
            })?;

        self.repository
            .update_password(id, &new_hash)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
    /// Upload avatar
    pub async fn upload_avatar(
        &self,
        id: Uuid,
        filename: String,
        data: Vec<u8>,
    ) -> DomainResult<User> {
        let upload_dir = "uploads/avatars";
        tokio::fs::create_dir_all(upload_dir).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "filesystem".to_string(),
                message: e.to_string(),
            }
        })?;

        // Sanitize filename or generate new one
        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(std::ffi::OsStr::to_str)
            .unwrap_or("png");

        let new_filename = format!("{}-{}.{}", id, Uuid::new_v4(), ext);
        let filepath = format!("{}/{}", upload_dir, new_filename);

        tokio::fs::write(&filepath, data)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "filesystem".to_string(),
                message: e.to_string(),
            })?;

        let avatar_url = format!("/uploads/avatars/{}", new_filename);
        self.repository
            .update_avatar(id, avatar_url)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
