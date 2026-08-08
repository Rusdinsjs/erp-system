//! Maintenance Team Repository
//!
//! Database access operations for Maintenance Teams and Maintenance Team Members.

use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::domain::entities::{MaintenanceTeam, MaintenanceTeamDetail, MaintenanceTeamMember};

#[derive(Clone)]
pub struct MaintenanceTeamRepository {
    pool: PgPool,
}

impl MaintenanceTeamRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find all teams with optional search query, company filter, and status filter
    pub async fn find_all(
        &self,
        search: Option<&str>,
        status: Option<&str>,
        company_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MaintenanceTeamDetail>, sqlx::Error> {
        let search_pattern = search.map(|s| format!("%{}%", s));

        let rows = sqlx::query(
            r#"
            SELECT 
                t.id, t.team_code, t.team_name, t.company_id, t.manager_id, t.manager_name,
                t.status, t.description, t.created_at, t.updated_at,
                c.name as company_name,
                (SELECT COUNT(*) FROM maintenance_team_members m WHERE m.team_id = t.id AND m.is_active = true) as total_members
            FROM maintenance_teams t
            LEFT JOIN companies c ON t.company_id = c.id
            WHERE ($1::text IS NULL OR t.team_name ILIKE $1 OR t.team_code ILIKE $1 OR t.manager_name ILIKE $1)
              AND ($2::text IS NULL OR t.status = $2)
              AND ($3::uuid IS NULL OR t.company_id = $3)
            ORDER BY t.created_at DESC
            LIMIT $4 OFFSET $5
            "#
        )
        .bind(search_pattern)
        .bind(status)
        .bind(company_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let mut details = Vec::new();
        for r in rows {
            let team_id: Uuid = r.get("id");
            let members = self.find_members_by_team_id(team_id).await?;
            let count: i64 = r.get("total_members");

            let team = MaintenanceTeam {
                id: team_id,
                team_code: r.get("team_code"),
                team_name: r.get("team_name"),
                company_id: r.try_get("company_id").ok(),
                manager_id: r.try_get("manager_id").ok(),
                manager_name: r.try_get("manager_name").ok(),
                status: r.get("status"),
                description: r.try_get("description").ok(),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            details.push(MaintenanceTeamDetail {
                team,
                company_name: r.try_get("company_name").ok(),
                members,
                total_members: count as usize,
            });
        }

        Ok(details)
    }

    /// Count teams matching query
    pub async fn count(
        &self,
        search: Option<&str>,
        status: Option<&str>,
        company_id: Option<Uuid>,
    ) -> Result<i64, sqlx::Error> {
        let search_pattern = search.map(|s| format!("%{}%", s));

        let row = sqlx::query(
            r#"
            SELECT COUNT(*)
            FROM maintenance_teams t
            WHERE ($1::text IS NULL OR t.team_name ILIKE $1 OR t.team_code ILIKE $1 OR t.manager_name ILIKE $1)
              AND ($2::text IS NULL OR t.status = $2)
              AND ($3::uuid IS NULL OR t.company_id = $3)
            "#
        )
        .bind(search_pattern)
        .bind(status)
        .bind(company_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get(0))
    }

    /// Find team by ID (with detail and members)
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<MaintenanceTeamDetail>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT 
                t.id, t.team_code, t.team_name, t.company_id, t.manager_id, t.manager_name,
                t.status, t.description, t.created_at, t.updated_at,
                c.name as company_name,
                (SELECT COUNT(*) FROM maintenance_team_members m WHERE m.team_id = t.id AND m.is_active = true) as total_members
            FROM maintenance_teams t
            LEFT JOIN companies c ON t.company_id = c.id
            WHERE t.id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            let members = self.find_members_by_team_id(id).await?;
            let count: i64 = r.get("total_members");

            let team = MaintenanceTeam {
                id,
                team_code: r.get("team_code"),
                team_name: r.get("team_name"),
                company_id: r.try_get("company_id").ok(),
                manager_id: r.try_get("manager_id").ok(),
                manager_name: r.try_get("manager_name").ok(),
                status: r.get("status"),
                description: r.try_get("description").ok(),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };

            Ok(Some(MaintenanceTeamDetail {
                team,
                company_name: r.try_get("company_name").ok(),
                members,
                total_members: count as usize,
            }))
        } else {
            Ok(None)
        }
    }

    /// Find members by team ID
    pub async fn find_members_by_team_id(&self, team_id: Uuid) -> Result<Vec<MaintenanceTeamMember>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceTeamMember>(
            r#"
            SELECT id, team_id, user_id, employee_id, member_name, role_in_team, is_active, created_at
            FROM maintenance_team_members
            WHERE team_id = $1
            ORDER BY created_at ASC
            "#
        )
        .bind(team_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Create new Maintenance Team
    pub async fn create(
        &self,
        team_code: &str,
        team_name: &str,
        company_id: Option<Uuid>,
        manager_id: Option<Uuid>,
        manager_name: Option<&str>,
        description: Option<&str>,
    ) -> Result<MaintenanceTeam, sqlx::Error> {
        let row = sqlx::query_as::<_, MaintenanceTeam>(
            r#"
            INSERT INTO maintenance_teams (
                id, team_code, team_name, company_id, manager_id, manager_name, status, description, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, 'ACTIVE', $6, NOW(), NOW()
            )
            RETURNING id, team_code, team_name, company_id, manager_id, manager_name, status, description, created_at, updated_at
            "#
        )
        .bind(team_code)
        .bind(team_name)
        .bind(company_id)
        .bind(manager_id)
        .bind(manager_name)
        .bind(description)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Add member to Maintenance Team
    pub async fn add_member(
        &self,
        team_id: Uuid,
        user_id: Option<Uuid>,
        employee_id: Option<Uuid>,
        member_name: &str,
        role_in_team: &str,
    ) -> Result<MaintenanceTeamMember, sqlx::Error> {
        let row = sqlx::query_as::<_, MaintenanceTeamMember>(
            r#"
            INSERT INTO maintenance_team_members (
                id, team_id, user_id, employee_id, member_name, role_in_team, is_active, created_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW()
            )
            RETURNING id, team_id, user_id, employee_id, member_name, role_in_team, is_active, created_at
            "#
        )
        .bind(team_id)
        .bind(user_id)
        .bind(employee_id)
        .bind(member_name)
        .bind(role_in_team)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Update Maintenance Team
    pub async fn update(
        &self,
        id: Uuid,
        team_code: Option<&str>,
        team_name: Option<&str>,
        company_id: Option<Uuid>,
        manager_id: Option<Uuid>,
        manager_name: Option<&str>,
        status: Option<&str>,
        description: Option<&str>,
    ) -> Result<MaintenanceTeam, sqlx::Error> {
        let row = sqlx::query_as::<_, MaintenanceTeam>(
            r#"
            UPDATE maintenance_teams
            SET 
                team_code = COALESCE($2, team_code),
                team_name = COALESCE($3, team_name),
                company_id = COALESCE($4, company_id),
                manager_id = COALESCE($5, manager_id),
                manager_name = COALESCE($6, manager_name),
                status = COALESCE($7, status),
                description = COALESCE($8, description),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, team_code, team_name, company_id, manager_id, manager_name, status, description, created_at, updated_at
            "#
        )
        .bind(id)
        .bind(team_code)
        .bind(team_name)
        .bind(company_id)
        .bind(manager_id)
        .bind(manager_name)
        .bind(status)
        .bind(description)
        .fetch_one(&self.pool)
        .await?;

        Ok(row)
    }

    /// Remove team member
    pub async fn remove_member(&self, member_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_team_members WHERE id = $1")
            .bind(member_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete team
    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_teams WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
