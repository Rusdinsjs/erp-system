//! Cost Center Entity Dimension (QTEN-005)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
pub struct CostCenter {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub company_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl CostCenter {
    pub fn new(
        tenant_id: Uuid,
        company_id: Option<Uuid>,
        code: String,
        name: String,
        parent_id: Option<Uuid>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            tenant_id,
            company_id,
            code,
            name,
            parent_id,
            manager_id: None,
            status: "ACTIVE".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        }
    }

    pub fn is_root(&self) -> bool {
        self.parent_id.is_none()
    }

    pub fn is_active(&self) -> bool {
        self.status.eq_ignore_ascii_case("ACTIVE") && self.deleted_at.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cost_center_hierarchy_defaults() {
        let tenant_id = Uuid::new_v4();
        let parent = CostCenter::new(
            tenant_id,
            None,
            "CC-00".to_string(),
            "Divisi Utama".to_string(),
            None,
        );

        assert!(parent.is_root());
        assert!(parent.is_active());

        let child = CostCenter::new(
            tenant_id,
            None,
            "CC-01".to_string(),
            "Sub-Operasional Tambang".to_string(),
            Some(parent.id),
        );

        assert!(!child.is_root());
        assert_eq!(child.parent_id, Some(parent.id));
    }
}
