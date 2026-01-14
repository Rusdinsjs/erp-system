//! Auth Service

use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::domain::entities::{User, UserClaims, UserRole};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{EmployeeRepository, RbacRepository, UserRepository};
use crate::shared::utils::crypto::{hash_password, verify_password};
use crate::shared::utils::jwt::{create_token, JwtConfig};

/// Auth service
#[derive(Clone)]
pub struct AuthService {
    repository: UserRepository,
    rbac_repository: RbacRepository,
    employee_repository: EmployeeRepository,
    jwt_config: JwtConfig,
}

impl AuthService {
    pub fn new(
        repository: UserRepository,
        rbac_repository: RbacRepository,
        employee_repository: EmployeeRepository,
        jwt_config: JwtConfig,
    ) -> Self {
        Self {
            repository,
            rbac_repository,
            employee_repository,
            jwt_config,
        }
    }

    /// Login user
    pub async fn login(&self, email: &str, password: &str) -> DomainResult<(User, String)> {
        let user = self
            .repository
            .find_by_email(email)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::unauthorized("Invalid credentials"))?;

        if !user.is_active {
            return Err(DomainError::unauthorized("Account is disabled"));
        }

        // Verify password
        if !verify_password(password, &user.password_hash) {
            return Err(DomainError::unauthorized("Invalid credentials"));
        }

        // Update last login
        let _ = self.repository.update_last_login(user.id).await;

        // Fetch permissions from DB
        let permissions = if let Some(role_id) = user.role_id {
            self.rbac_repository
                .get_permissions_for_role(role_id)
                .await
                .unwrap_or_default()
        } else {
            // Fallback for legacy users (should ideally be migrated)
            UserRole::from_str(&user.role)
                .unwrap_or(UserRole::User)
                .default_permissions()
                .iter()
                .map(|s| s.to_string())
                .collect()
        };

        // Fetch employee ID if linked
        let employee = self
            .employee_repository
            .find_by_user_id(user.id)
            .await
            .unwrap_or(None);
        let employee_id = employee.map(|e| e.id);

        // Generate JWT token
        let claims = UserClaims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            role_level: user.role_level,
            department: user.department.clone(),
            org: user.organization_id.map(|id| id.to_string()),
            employee_id,
            permissions,
            exp: (Utc::now() + Duration::hours(24)).timestamp(),
            iat: Utc::now().timestamp(),
            jti: Uuid::new_v4().to_string(),
        };

        let token = create_token(&claims, &self.jwt_config).map_err(|e| {
            DomainError::ExternalServiceError {
                service: "jwt".to_string(),
                message: e,
            }
        })?;

        Ok((user, token))
    }

    /// Register new user
    pub async fn register(&self, email: &str, password: &str, name: &str) -> DomainResult<User> {
        // Check if email exists
        if let Some(_) = self.repository.find_by_email(email).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })? {
            return Err(DomainError::conflict("Email already registered"));
        }

        let password_hash =
            hash_password(password).map_err(|e| DomainError::ExternalServiceError {
                service: "password_hash".to_string(),
                message: e,
            })?;

        let user = User::new(email.to_string(), password_hash, name.to_string());

        self.repository
            .create(&user)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
