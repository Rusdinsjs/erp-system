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
        if (self
            .repository
            .find_by_email(&req.email)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?)
        .is_some()
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

        let created_user =
            self.repository
                .create(&user)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        if let Some(emp_id) = req.employee_id {
            self.repository
                .link_employee(created_user.id, emp_id)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        Ok(created_user)
    }

    /// Update user
    pub async fn update_user(&self, id: Uuid, req: UpdateUserRequest) -> DomainResult<User> {
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

        let allowed_group = req.allowed_asset_group.map(|g| {
            if g.trim().is_empty() {
                "__CLEAR__".to_string()
            } else {
                g
            }
        });
        let dept = req.department.map(|d| {
            if d.trim().is_empty() {
                "__CLEAR__".to_string()
            } else {
                d
            }
        });

        // Synchronize user_roles table on role_codes or primary role change FIRST
        let role_codes_opt = req.role_codes.as_ref().map(|codes| {
            codes
                .iter()
                .map(|code| match code.as_str() {
                    "admin_alat_berat" => "admin_heavy_eq".to_string(),
                    "admin_infrastruktur" => "admin_infra".to_string(),
                    "admin_kendaraan" => "admin_vehicle".to_string(),
                    "administrator" => "admin".to_string(),
                    other => other.to_string(),
                })
                .collect::<Vec<String>>()
        });

        let mut final_role_code = req.role_code.as_ref().map(|code| match code.as_str() {
            "admin_alat_berat" => "admin_heavy_eq".to_string(),
            "admin_infrastruktur" => "admin_infra".to_string(),
            "admin_kendaraan" => "admin_vehicle".to_string(),
            "administrator" => "admin".to_string(),
            other => other.to_string(),
        });

        if let Some(role_codes) = &role_codes_opt {
            if let Some(first_code) = role_codes.first() {
                final_role_code = Some(first_code.clone());
            }
            self.repository
                .set_user_roles(id, role_codes)
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;
        }

        let mut role_id = None;
        if let Some(code) = final_role_code.clone() {
            if let Ok(Some(role)) = self.rbac_repo.find_role_by_code(&code).await {
                role_id = Some(role.id);
            }
        }

        let updated_user = self
            .repository
            .update(
                id,
                req.name,
                role_id,
                final_role_code,
                dept,
                req.department_id,
                req.avatar_url,
                req.is_active,
                allowed_group,
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

        // Handle employee linking / unlinking
        if req.clear_employee_link == Some(true) {
            self.repository.unlink_employee(id).await.map_err(|e| {
                DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                }
            })?;
        } else if let Some(emp_id) = req.employee_id {
            self.repository
                .link_employee(id, emp_id)
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

        let avatar_url = format!("/api/uploads/avatars/{}", new_filename);
        self.repository
            .update_avatar(id, avatar_url)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn deactivate_by_employee_id(&self, employee_id: Uuid) -> DomainResult<()> {
        self.repository
            .deactivate_by_employee_id(employee_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;
        Ok(())
    }
}
