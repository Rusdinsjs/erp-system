//! User Entity
//!
//! User management with role-based access control.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// User roles
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    SuperAdmin,
    Admin,
    Manager,
    Technician,
    Staff,
    User,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SuperAdmin => "super_admin",
            Self::Admin => "admin",
            Self::Manager => "manager",
            Self::Technician => "technician",
            Self::Staff => "staff",
            Self::User => "user",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "super_admin" => Some(Self::SuperAdmin),
            "admin" => Some(Self::Admin),
            "manager" => Some(Self::Manager),
            "technician" => Some(Self::Technician),
            "staff" => Some(Self::Staff),
            "user" => Some(Self::User),
            _ => None,
        }
    }

    /// Get default permissions for this role
    pub fn default_permissions(&self) -> Vec<&'static str> {
        match self {
            Self::SuperAdmin => vec!["*"],
            Self::Admin => vec!["asset.*", "user.read", "report.*", "maintenance.*"],
            Self::Manager => vec![
                "asset.read",
                "asset.update",
                "maintenance.*",
                "loan.approve",
            ],
            Self::Technician => vec!["maintenance.read", "maintenance.update", "asset.read"],
            Self::Staff => vec!["asset.read", "loan.request", "maintenance.request"],
            Self::User => vec!["asset.read", "loan.request"],
        }
    }
}

/// User entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,

    // RBAC
    pub role_id: Option<Uuid>,
    #[sqlx(rename = "role_code")] // Mapped from join
    pub role: String,
    #[sqlx(default)]
    pub role_level: i32, // Mapped from join

    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,

    // Profile
    pub phone: Option<String>,
    pub avatar_url: Option<String>,

    // Status
    pub is_active: bool,
    pub email_verified: bool,
    pub last_login_at: Option<DateTime<Utc>>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    pub fn new(email: String, password_hash: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            email,
            password_hash,
            name,
            role_id: None,            // Needs to be set by service/repo default logic
            role: "user".to_string(), // Default (will be updated via DB default)
            role_level: 5,
            department: None,
            department_id: None,
            organization_id: None,
            phone: None,
            avatar_url: None,
            is_active: true,
            email_verified: false,
            last_login_at: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if user has a specific permission
    pub fn has_permission(&self, permission: &str) -> bool {
        let role = UserRole::from_str(&self.role).unwrap_or(UserRole::User);
        let permissions = role.default_permissions();

        permissions.iter().any(|p| {
            *p == "*" || *p == permission || {
                // Check wildcard patterns like "asset.*"
                if p.ends_with(".*") {
                    let prefix = &p[..p.len() - 2];
                    permission.starts_with(prefix)
                } else {
                    false
                }
            }
        })
    }

    /// Check if user is admin or super admin
    pub fn is_admin(&self) -> bool {
        matches!(
            UserRole::from_str(&self.role),
            Some(UserRole::SuperAdmin) | Some(UserRole::Admin)
        )
    }
}

/// User summary for list views (without sensitive data)
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct UserSummary {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    #[sqlx(rename = "role_code")]
    pub role: String,
    #[sqlx(default)]
    pub role_level: i32,
    pub department: Option<String>,
    pub department_id: Option<Uuid>,
    pub is_active: bool,
    pub employee_name: Option<String>,
    pub employee_nik: Option<String>,
}

/// JWT Claims for authentication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserClaims {
    pub sub: String, // User ID
    pub email: String,
    pub name: String,
    pub role: String,
    pub role_level: i32,
    pub department: Option<String>,
    pub org: Option<String>,       // Organization ID
    pub employee_id: Option<Uuid>, // Employee ID if linked
    pub permissions: Vec<String>,
    pub exp: i64,
    pub iat: i64,
    pub jti: String, // JWT ID for revocation
}

impl UserClaims {
    pub fn user_id(&self) -> Uuid {
        Uuid::parse_str(&self.sub).unwrap_or_else(|_| Uuid::nil())
    }
}
