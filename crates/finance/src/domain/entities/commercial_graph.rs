use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Traceable link between commercial graph documents (QSELL-002, QBUY-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommercialDocumentLink {
    pub id: Uuid,
    pub source_type: String,
    pub source_id: Uuid,
    pub target_type: String,
    pub target_id: Uuid,
    pub created_at: DateTime<Utc>,
}

/// Purchase Receipt Entity (QBUY-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseReceipt {
    pub id: Uuid,
    pub company_id: Uuid,
    pub receipt_number: String,
    pub purchase_order_id: Option<Uuid>,
    pub vendor_id: Uuid,
    pub warehouse_id: Uuid,
    pub posting_date: NaiveDate,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

/// Purchase Receipt Item Line Entity (QBUY-002)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseReceiptItem {
    pub id: Uuid,
    pub receipt_id: Uuid,
    pub item_id: Uuid,
    pub qty_received: Decimal,
    pub unit_cost: Decimal,
    pub total_amount: Decimal,
    pub po_line_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub serial_no: Option<String>,
}

/// Payment Allocation for Multi-Invoice & Partial Payments (QACC-009, QSELL-003)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentAllocation {
    pub id: Uuid,
    pub payment_entry_id: Uuid,
    pub invoice_type: String, // "SALES_INVOICE" or "PURCHASE_BILL"
    pub invoice_id: Uuid,
    pub allocated_amount: Decimal,
    pub created_at: DateTime<Utc>,
}

/// Request to allocate a payment across invoices
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocatePaymentRequest {
    pub payment_entry_id: Uuid,
    pub invoice_type: String,
    pub invoice_id: Uuid,
    pub allocated_amount: Decimal,
}
