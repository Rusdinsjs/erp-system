//! System Events for Event-Driven Architecture (QARC-005 & 3R.1.1-002)
use crate::domain::entities::fuel::FuelLog;
use crate::domain::entities::rental_billing::RentalBillingPeriod;
use crate::domain::entities::work_order::WorkOrder;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event_type", content = "payload")]
pub enum SystemEvent {
    // Loan Events
    LoanRequested {
        loan_id: Uuid,
        asset_id: Uuid,
        asset_name: String,
        borrower_id: Option<Uuid>,
    },
    LoanApproved {
        loan_id: Uuid,
        asset_id: Uuid,
        asset_name: String,
        borrower_id: Option<Uuid>,
    },
    LoanRejected {
        loan_id: Uuid,
        asset_id: Uuid,
        asset_name: String,
        borrower_id: Option<Uuid>,
        reason: Option<String>,
    },
    LoanCheckedOut {
        loan_id: Uuid,
        asset_id: Uuid,
        borrower_id: Option<Uuid>,
    },
    LoanReturned {
        loan_id: Uuid,
        asset_id: Uuid,
        borrower_id: Option<Uuid>,
    },
    LoanOverdue {
        loan_id: Uuid,
        borrower_id: Option<Uuid>,
        asset_name: String,
        days_overdue: i64,
    },

    // Inventory & Ops Events
    LowStockAlert {
        item_name: String,
        current_qty: Decimal,
        min_qty: Decimal,
    },

    // Asset Events
    AssetCreated {
        asset_id: Uuid,
        asset_name: String,
    },
    AssetUpdated {
        asset_id: Uuid,
        asset_name: String,
    },

    // Fuel Events
    FuelLogCreated(Box<FuelLog>),

    // Maintenance Events
    WorkOrderCreated(Box<WorkOrder>),

    // Rental Events
    RentalBillingGenerated(Box<RentalBillingPeriod>),
}
