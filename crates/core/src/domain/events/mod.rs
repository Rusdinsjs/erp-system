//! System Events for Event-Driven Architecture
use crate::domain::entities::finance::{Expense, PurchaseOrder};
use crate::domain::entities::fuel::FuelLog;
use crate::domain::entities::rental_billing::RentalBillingPeriod;
use crate::domain::entities::work_order::WorkOrder;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event_type", content = "payload")]
pub enum SystemEvent {
    // Finance Events
    ExpenseCreated(Expense),
    PurchaseOrderCreated(PurchaseOrder),

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

    // Inventory/Asset Events
    LowStockAlert {
        item_name: String,
        current_qty: Decimal,
        min_qty: Decimal,
    },
    AssetStatusChanged {
        asset_id: Uuid,
        old_status: String,
        new_status: String,
    },

    // Fuel Events
    FuelLogCompleted(FuelLog),

    // Work Order Events
    WorkOrderFinalized(WorkOrder),

    // Rental Events
    RentalInvoiceGenerated(RentalBillingPeriod),
}
