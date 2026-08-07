use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Role {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub role_level: Option<i32>,
    pub is_system: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Permission {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub resource: String,
    pub action: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserRoleAssignment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub granted_by: Option<Uuid>,
    pub granted_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DocType {
    pub id: Uuid,
    pub name: String,
    pub module: String,
    pub description: Option<String>,
    pub is_submittable: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CustomDocPerm {
    pub id: Uuid,
    pub doctype_id: Uuid,
    pub role_id: Uuid,
    pub permlevel: i32,
    pub read_perm: bool,
    pub write_perm: bool,
    pub create_perm: bool,
    pub delete_perm: bool,
    pub submit_perm: bool,
    pub cancel_perm: bool,
    pub amend_perm: bool,
    pub print_perm: bool,
    pub email_perm: bool,
    pub export_perm: bool,
    pub import_perm: bool,
    pub share_perm: bool,
    pub report_perm: bool,
    pub if_owner: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserPermission {
    pub id: Uuid,
    pub user_id: Uuid,
    pub allow_doctype: String,
    pub for_value: String,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RoleProfile {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

