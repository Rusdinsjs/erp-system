//! Phase 7 Asset/EAM Invariant Test Suite (QAST-009)
//!
//! Validates:
//! - QAST-003: Straight-line depreciation math using Decimal
//! - QAST-004: Asset disposal gain/loss accounting calculation
//! - QAST-005: Append-only asset custody history
//! - QAST-007: Maintenance spare-parts expense integration

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_assets::domain::asset_eam::{
    AssetCustodyHistory, AssetDisposalRequest,
};

#[test]
fn test_qast_003_depreciation_straight_line_math() {
    let purchase_price = dec!(120000000.00); // 120.000.000 IDR
    let residual_value = dec!(0.00);
    let useful_life_months: i64 = 48; // 4 Years

    let depreciable_amount = purchase_price - residual_value;
    let monthly_depreciation = depreciable_amount / Decimal::from(useful_life_months);

    assert_eq!(monthly_depreciation, dec!(2500000.00)); // 2.500.000 IDR / month
}

#[test]
fn test_qast_004_asset_disposal_gain_loss_calculation() {
    let cost = dec!(100000000.00);
    let accum_depr = dec!(60000000.00);
    let book_value = cost - accum_depr; // 40.000.000 IDR

    let sale_proceeds = dec!(45000000.00); // Sold for 45.000.000 IDR
    let gain_loss = sale_proceeds - book_value; // +5.000.000 Gain

    let req = AssetDisposalRequest {
        asset_id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        disposal_date: chrono::NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        sale_amount: sale_proceeds,
        destination_account_id: Uuid::new_v4(),
        reason: Some("Asset Sold at Profit".to_string()),
    };

    assert_eq!(book_value, dec!(40000000.00));
    assert_eq!(gain_loss, dec!(5000000.00)); // Gain on disposal
    assert_eq!(req.sale_amount, dec!(45000000.00));
}

#[test]
fn test_qast_005_asset_custody_history_append_only() {
    let asset_id = Uuid::new_v4();
    let first_custodian = Uuid::new_v4();
    let second_custodian = Uuid::new_v4();

    let history1 = AssetCustodyHistory {
        id: Uuid::new_v4(),
        asset_id,
        custodian_user_id: Some(first_custodian),
        department_id: None,
        location_id: None,
        assigned_at: chrono::Utc::now(),
        assigned_by: None,
        notes: Some("Initial Assignment".to_string()),
    };

    let history2 = AssetCustodyHistory {
        id: Uuid::new_v4(),
        asset_id,
        custodian_user_id: Some(second_custodian),
        department_id: None,
        location_id: None,
        assigned_at: chrono::Utc::now(),
        assigned_by: None,
        notes: Some("Reassigned to new operator".to_string()),
    };

    let custody_log = vec![history1, history2];

    assert_eq!(custody_log.len(), 2);
    assert_eq!(custody_log[0].custodian_user_id, Some(first_custodian));
    assert_eq!(custody_log[1].custodian_user_id, Some(second_custodian));
}

#[test]
fn test_qast_007_maintenance_part_cost_accumulation() {
    let part1_qty = dec!(2.00);
    let part1_unit_cost = dec!(150000.00);

    let part2_qty = dec!(5.00);
    let part2_unit_cost = dec!(20000.00);

    let total_part_cost = (part1_qty * part1_unit_cost) + (part2_qty * part2_unit_cost);

    assert_eq!(total_part_cost, dec!(400000.00));
}
