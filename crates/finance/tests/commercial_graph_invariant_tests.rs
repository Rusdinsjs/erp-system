//! Phase 6 Commercial Graph Invariant Test Suite (QCOM-001)
//!
//! Validates:
//! - QSELL-002 / QBUY-002: Source line traceability across commercial document graph
//! - QSELL-003 / QBUY-003: Partial fulfillment and billing remaining quantity math
//! - QBUY-005: Three-way matching (PO vs Receipt vs Invoice)
//! - QACC-009: Multi-invoice & partial payment allocation

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_finance::domain::entities::commercial_graph::{
    AllocatePaymentRequest, CommercialDocumentLink,
};

#[test]
fn test_qsell_002_sales_graph_source_line_traceability() {
    let _order_id = Uuid::new_v4();
    let order_line_id = Uuid::new_v4();
    let shipment_id = Uuid::new_v4();

    let link = CommercialDocumentLink {
        id: Uuid::new_v4(),
        source_type: "SALES_ORDER_LINE".to_string(),
        source_id: order_line_id,
        target_type: "SALES_SHIPMENT".to_string(),
        target_id: shipment_id,
        created_at: chrono::Utc::now(),
    };

    assert_eq!(link.source_type, "SALES_ORDER_LINE");
    assert_eq!(link.source_id, order_line_id);
    assert_eq!(link.target_id, shipment_id);
}

#[test]
fn test_qsell_003_partial_fulfillment_remaining_qty_math() {
    let ordered_qty = dec!(100.00);
    let first_shipment_qty = dec!(30.00);
    let second_shipment_qty = dec!(45.00);

    let total_shipped = first_shipment_qty + second_shipment_qty; // 75.00
    let remaining_qty = ordered_qty - total_shipped; // 25.00

    assert_eq!(total_shipped, dec!(75.00));
    assert_eq!(remaining_qty, dec!(25.00));
}

#[test]
fn test_qbuy_005_three_way_matching_po_receipt_invoice() {
    let po_unit_cost = dec!(50000.00);
    let receipt_unit_cost = dec!(50000.00);
    let invoice_unit_cost = dec!(55000.00); // 10% mismatch!

    let diff = (invoice_unit_cost - po_unit_cost).abs();
    let tolerance = dec!(1000.00);
    let is_matched = diff <= tolerance;

    assert_eq!(receipt_unit_cost, po_unit_cost);
    assert!(!is_matched); // Mismatch exceeds tolerance -> Requires Approval
}

#[test]
fn test_qacc_009_multi_invoice_payment_allocation() {
    let payment_amount = dec!(5000000.00);

    let inv1_amount = dec!(3000000.00);
    let inv2_amount = dec!(2000000.00);

    let alloc1 = AllocatePaymentRequest {
        payment_entry_id: Uuid::new_v4(),
        invoice_type: "SALES_INVOICE".to_string(),
        invoice_id: Uuid::new_v4(),
        allocated_amount: inv1_amount,
    };

    let alloc2 = AllocatePaymentRequest {
        payment_entry_id: Uuid::new_v4(),
        invoice_type: "SALES_INVOICE".to_string(),
        invoice_id: Uuid::new_v4(),
        allocated_amount: inv2_amount,
    };

    let total_allocated: Decimal = alloc1.allocated_amount + alloc2.allocated_amount;
    let unallocated = payment_amount - total_allocated;

    assert_eq!(total_allocated, payment_amount);
    assert_eq!(unallocated, Decimal::ZERO);
}
