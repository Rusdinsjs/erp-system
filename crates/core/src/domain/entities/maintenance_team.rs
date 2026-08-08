//! Maintenance Team Domain Entity

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// Maintenance Team Entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct MaintenanceTeam {
    pub id: Uuid,
    pub team_code: String,
    pub team_name: String,
    #[sqlx(default)]
    pub company_id: Option<Uuid>,
    #[sqlx(default)]
    pub manager_id: Option<Uuid>,
    #[sqlx(default)]
    pub manager_name: Option<String>,
    pub status: String,
    #[sqlx(default)]
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Maintenance Team Member Entity
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct MaintenanceTeamMember {
    pub id: Uuid,
    pub team_id: Uuid,
    #[sqlx(default)]
    pub user_id: Option<Uuid>,
    #[sqlx(default)]
    pub employee_id: Option<Uuid>,
    pub member_name: String,
    pub role_in_team: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// Maintenance Team with Detail (including members list)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MaintenanceTeamDetail {
    #[serde(flatten)]
    pub team: MaintenanceTeam,
    pub company_name: Option<String>,
    pub members: Vec<MaintenanceTeamMember>,
    pub total_members: usize,
}
