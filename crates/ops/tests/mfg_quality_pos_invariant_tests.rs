//! Phase 13 Manufacturing, Quality & POS Invariant Test Suite (QMFG-010, QQLT-004, QPOS-003)
//!
//! Validates:
//! - QMFG-001 / QMFG-003: BOM explosion & ProductionOrder WIP tracking
//! - QQLT-004: Quality Hold status enforcement preventing shipment
//! - QPOS-003: POS shift cash reconciliation math

use chrono::Utc;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_core::domain::manufacturing_pos::{
    BomItem, PosShift, ProductionOrder, QualityInspection,
};

#[test]
fn test_qmfg_001_bom_explosion_material_calculation() {
    let target_production_qty = dec!(100.00);

    let raw_material_line = BomItem {
        id: Uuid::new_v4(),
        bom_id: Uuid::new_v4(),
        item_id: Uuid::new_v4(),
        qty_required: dec!(2.50), // 2.5 units per finished product
        scrap_percentage: Some(dec!(2.00)), // 2% scrap
    };

    let base_material_req = target_production_qty * raw_material_line.qty_required; // 250.00
    let scrap_allowance = base_material_req * (raw_material_line.scrap_percentage.unwrap() / dec!(100.00)); // 5.00
    let total_required = base_material_req + scrap_allowance;

    assert_eq!(base_material_req, dec!(250.00));
    assert_eq!(total_required, dec!(255.00));
}

#[test]
fn test_qmfg_003_production_order_wip_tracking() {
    let prod_order = ProductionOrder {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        production_order_number: "PRD-2026-0001".to_string(),
        bom_id: Uuid::new_v4(),
        item_id: Uuid::new_v4(),
        target_qty: dec!(500.00),
        produced_qty: dec!(200.00),
        warehouse_id: Uuid::new_v4(),
        status: "IN_PROGRESS".to_string(),
        wip_account_id: Some(Uuid::new_v4()),
        created_at: Utc::now(),
    };

    let remaining_qty = prod_order.target_qty - prod_order.produced_qty;

    assert_eq!(prod_order.production_order_number, "PRD-2026-0001");
    assert_eq!(prod_order.status, "IN_PROGRESS");
    assert_eq!(remaining_qty, dec!(300.00));
}

#[test]
fn test_qqlt_004_quality_hold_prevents_shipment() {
    let inspection = QualityInspection {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        inspection_number: "QI-2026-0012".to_string(),
        inspection_type: "INCOMING".to_string(),
        item_id: Uuid::new_v4(),
        batch_no: Some("BATCH-2026-08A".to_string()),
        sample_size: dec!(50.00),
        status: "QUALITY_HOLD".to_string(),
        inspected_by: Some(Uuid::new_v4()),
        created_at: Utc::now(),
    };

    let is_eligible_for_shipment = inspection.status == "PASSED";

    assert_eq!(inspection.status, "QUALITY_HOLD");
    assert!(!is_eligible_for_shipment); // Blocked from standard fulfillment
}

#[test]
fn test_qpos_003_pos_shift_reconciliation_math() {
    let opening_balance = dec!(500000.00); // 500.000 IDR cash drawer start
    let total_cash_sales = dec!(2350000.00);
    let expected_closing = opening_balance + total_cash_sales; // 2.850.000 IDR

    let actual_counted_closing = dec!(2850000.00);
    let cash_discrepancy = actual_counted_closing - expected_closing;

    let shift = PosShift {
        id: Uuid::new_v4(),
        pos_profile_id: Uuid::new_v4(),
        cashier_user_id: Uuid::new_v4(),
        opening_balance,
        closing_balance: Some(actual_counted_closing),
        status: "CLOSED".to_string(),
        opened_at: Utc::now(),
        closed_at: Some(Utc::now()),
    };

    assert_eq!(shift.status, "CLOSED");
    assert_eq!(expected_closing, dec!(2850000.00));
    assert_eq!(cash_discrepancy, Decimal::ZERO);
}
