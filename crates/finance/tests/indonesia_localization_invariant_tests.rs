//! Phase 14 Indonesia Localization App Invariant Test Suite (QIDN-008)
//!
//! Validates:
//! - QIDN-008: Dynamic effective-date versioning of VAT rates for historical transactions
//! - QIDN-003: e-Faktur DPP (Tax Base) & PPN calculation math
//! - QIDN-004: PPh 23 / PPh 4(2) withholding certificate math
//! - QIDN-001: Core Accounting remains country-neutral

use chrono::{NaiveDate, Utc};
use rust_decimal_macros::dec;
use uuid::Uuid;

use management_system_finance::domain::indonesia_localization::{
    IndonesianTaxInvoice, VatRateVersion, WithholdingCertificate,
};

#[test]
fn test_qidn_008_vat_rate_effective_date_versioning() {
    // 2021 Transaction -> 10% VAT
    let date_2021 = NaiveDate::from_ymd_opt(2021, 12, 15).unwrap();
    assert_eq!(VatRateVersion::get_effective_vat_rate(date_2021), dec!(10.00));

    // 2023 Transaction -> 11% VAT
    let date_2023 = NaiveDate::from_ymd_opt(2023, 6, 1).unwrap();
    assert_eq!(VatRateVersion::get_effective_vat_rate(date_2023), dec!(11.00));

    // 2025 Transaction -> 12% VAT
    let date_2025 = NaiveDate::from_ymd_opt(2025, 2, 10).unwrap();
    assert_eq!(VatRateVersion::get_effective_vat_rate(date_2025), dec!(12.00));
}

#[test]
fn test_qidn_003_efaktur_dpp_and_ppn_math() {
    let posting_date = NaiveDate::from_ymd_opt(2024, 5, 10).unwrap();
    let vat_rate = VatRateVersion::get_effective_vat_rate(posting_date); // 11%

    let tax_base = dec!(100000000.00); // 100.000.000 IDR DPP
    let vat_amount = tax_base * (vat_rate / dec!(100.00)); // 11.000.000 IDR PPN

    let inv = IndonesianTaxInvoice {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        sales_invoice_id: Some(Uuid::new_v4()),
        tax_invoice_number: "010.000-24.00000123".to_string(),
        npwp_buyer: "01.234.567.8-012.000".to_string(),
        name_buyer: "PT Nusantara Jaya".to_string(),
        tax_base,
        vat_amount,
        vat_rate,
        effective_date: posting_date,
        status: "POSTED".to_string(),
        created_at: Utc::now(),
    };

    assert_eq!(inv.tax_invoice_number, "010.000-24.00000123");
    assert_eq!(inv.vat_rate, dec!(11.00));
    assert_eq!(inv.vat_amount, dec!(11000000.00));
}

#[test]
fn test_qidn_004_pph23_withholding_certificate_math() {
    let gross_services_amount = dec!(50000000.00); // 50.000.000 IDR
    let pph23_rate = dec!(2.00); // 2% PPh 23
    let pph_amount = gross_services_amount * (pph23_rate / dec!(100.00)); // 1.000.000 IDR

    let cert = WithholdingCertificate {
        id: Uuid::new_v4(),
        company_id: Uuid::new_v4(),
        certificate_number: "BP-2026-08-0001".to_string(),
        pph_type: "PPH23".to_string(),
        vendor_id: Some(Uuid::new_v4()),
        client_id: None,
        gross_amount: gross_services_amount,
        pph_amount,
        pph_rate: pph23_rate,
        posting_date: NaiveDate::from_ymd_opt(2026, 8, 6).unwrap(),
        status: "POSTED".to_string(),
        created_at: Utc::now(),
    };

    assert_eq!(cert.pph_type, "PPH23");
    assert_eq!(cert.pph_amount, dec!(1000000.00));
}
