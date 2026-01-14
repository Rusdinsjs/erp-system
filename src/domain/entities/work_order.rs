//! Work Order Entity
//!
//! Maintenance work orders with checklists and technician assignment.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

/// Work order priority
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkOrderPriority {
    Low,
    Medium,
    High,
    Critical,
}

impl WorkOrderPriority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }

    /// Get SLA hours based on priority
    pub fn sla_hours(&self) -> i32 {
        match self {
            Self::Critical => 4,
            Self::High => 8,
            Self::Medium => 24,
            Self::Low => 72,
        }
    }
}

/// Work order status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkOrderStatus {
    Pending,
    Approved,
    Assigned,
    InProgress,
    OnHold,
    Completed,
    Cancelled,
}

impl WorkOrderStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Assigned => "assigned",
            Self::InProgress => "in_progress",
            Self::OnHold => "on_hold",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }
}

/// Maintenance Work Order
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkOrder {
    pub id: Uuid,
    pub wo_number: String,
    pub asset_id: Uuid,

    pub wo_type: String,
    pub priority: Option<String>,
    pub location_id: Option<Uuid>,
    pub status: String,

    // Scheduling
    pub scheduled_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,

    // Resources
    pub assigned_technician: Option<Uuid>,
    pub vendor_id: Option<Uuid>,
    pub estimated_hours: Option<Decimal>,
    pub actual_hours: Option<Decimal>,

    // Costs
    pub estimated_cost: Option<Decimal>,
    pub actual_cost: Option<Decimal>,
    pub parts_cost: Option<Decimal>,
    pub labor_cost: Option<Decimal>,

    // Details
    pub problem_description: Option<String>,
    pub work_performed: Option<String>,
    pub recommendations: Option<String>,

    // Safety
    pub safety_requirements: Option<Vec<String>>,
    pub lockout_tagout_required: bool,

    // Completion
    pub completion_notes: Option<String>,
    pub customer_signoff: Option<String>,
    pub technician_signoff: Option<String>,

    // System
    pub created_by: Option<Uuid>,
    pub approved_by: Option<Uuid>,
    pub completed_by: Option<Uuid>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl WorkOrder {
    pub fn new(asset_id: Uuid, wo_type: &str) -> Self {
        let now = Utc::now();
        let wo_number = format!("WO-{}", now.format("%Y%m%d%H%M%S"));

        Self {
            id: Uuid::new_v4(),
            wo_number,
            asset_id,
            wo_type: wo_type.to_string(),
            priority: Some(WorkOrderPriority::Medium.as_str().to_string()),
            location_id: None,
            status: WorkOrderStatus::Pending.as_str().to_string(),
            scheduled_date: None,
            due_date: None,
            actual_start_date: None,
            actual_end_date: None,
            assigned_technician: None,
            vendor_id: None,
            estimated_hours: None,
            actual_hours: None,
            estimated_cost: None,
            actual_cost: None,
            parts_cost: None,
            labor_cost: None,
            problem_description: None,
            work_performed: None,
            recommendations: None,
            safety_requirements: None,
            lockout_tagout_required: false,
            completion_notes: None,
            customer_signoff: None,
            technician_signoff: None,
            created_by: None,
            approved_by: None,
            completed_by: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if work order is overdue
    pub fn is_overdue(&self) -> bool {
        if let Some(due) = self.due_date {
            let today = Utc::now().date_naive();
            due < today && self.status != "completed" && self.status != "cancelled"
        } else {
            false
        }
    }

    /// Calculate total cost
    pub fn total_cost(&self) -> Decimal {
        let parts = self.parts_cost.unwrap_or(Decimal::ZERO);
        let labor = self.labor_cost.unwrap_or(Decimal::ZERO);
        parts + labor
    }
}

/// Checklist item for work order
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChecklistItem {
    pub id: Uuid,
    pub work_order_id: Uuid,
    pub task_number: i32,
    pub description: String,
    pub instructions: Option<String>,
    pub expected_result: Option<String>,

    pub status: String,
    pub completed_by: Option<Uuid>,
    pub completed_at: Option<DateTime<Utc>>,
    pub actual_result: Option<String>,

    pub verified_by: Option<Uuid>,
    pub verified_at: Option<DateTime<Utc>>,
    pub verification_notes: Option<String>,

    pub photos: Option<Vec<String>>,
    pub readings: Option<JsonValue>,

    pub created_at: DateTime<Utc>,
}

impl ChecklistItem {
    pub fn new(work_order_id: Uuid, task_number: i32, description: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            work_order_id,
            task_number,
            description,
            instructions: None,
            expected_result: None,
            status: "pending".to_string(),
            completed_by: None,
            completed_at: None,
            actual_result: None,
            verified_by: None,
            verified_at: None,
            verification_notes: None,
            photos: None,
            readings: None,
            created_at: Utc::now(),
        }
    }
}

/// Spare part used in work order
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkOrderPart {
    pub id: Uuid,
    pub work_order_id: Uuid,
    pub part_name: String,
    pub quantity: Decimal,
    pub unit_cost: Decimal,
    pub total_cost: Decimal,
    pub added_at: DateTime<Utc>,
}

impl WorkOrderPart {
    pub fn new(
        work_order_id: Uuid,
        part_name: &str,
        quantity: Decimal,
        unit_cost: Decimal,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            work_order_id,
            part_name: part_name.to_string(),
            quantity,
            unit_cost,
            total_cost: quantity * unit_cost,
            added_at: Utc::now(),
        }
    }
}
