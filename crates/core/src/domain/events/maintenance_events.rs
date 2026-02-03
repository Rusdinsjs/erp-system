//! Maintenance Domain Events

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::DomainEvent;

/// Work order created event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrderCreated {
    pub work_order_id: Uuid,
    pub wo_number: String,
    pub asset_id: Uuid,
    pub wo_type: String,
    pub priority: String,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for WorkOrderCreated {
    fn event_type(&self) -> &'static str {
        "maintenance.work_order_created"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.work_order_id
    }
}

/// Work order assigned event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrderAssigned {
    pub work_order_id: Uuid,
    pub technician_id: Uuid,
    pub assigned_by: Option<Uuid>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for WorkOrderAssigned {
    fn event_type(&self) -> &'static str {
        "maintenance.work_order_assigned"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.work_order_id
    }
}

/// Work order completed event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrderCompleted {
    pub work_order_id: Uuid,
    pub asset_id: Uuid,
    pub completed_by: Uuid,
    pub actual_cost: Option<rust_decimal::Decimal>,
    pub actual_hours: Option<rust_decimal::Decimal>,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for WorkOrderCompleted {
    fn event_type(&self) -> &'static str {
        "maintenance.work_order_completed"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.work_order_id
    }
}

/// Maintenance scheduled event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceScheduled {
    pub asset_id: Uuid,
    pub maintenance_type: String,
    pub scheduled_date: chrono::NaiveDate,
    pub occurred_at: DateTime<Utc>,
}

impl DomainEvent for MaintenanceScheduled {
    fn event_type(&self) -> &'static str {
        "maintenance.scheduled"
    }
    fn occurred_at(&self) -> DateTime<Utc> {
        self.occurred_at
    }
    fn aggregate_id(&self) -> Uuid {
        self.asset_id
    }
}
