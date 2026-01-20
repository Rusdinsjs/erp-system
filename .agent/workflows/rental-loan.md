---
description: Rented-Out, Internal Loan, and Rented-In Operational Workflow
---

# Asset Outbound/Inbound Workflow (Rental & Loan)

This workflow covers the priority order: **Rented-Out (Priority)**, **Internal Loan**, and **Rented-In**.

## 1. Rented-Out (Priority: External Leasing)
Used when company assets are rented to external clients/companies for revenue. This module supports **Multi-Asset Rentals** (one contract, multiple items).

### Alur Kerja (Work-flow)

#### Phase 1: Rate Configuration (Setup)
Before renting, a `RentalRate` must be defined.
*   **Input**: Rate Amount (IDR), Rate Type (Hourly/Monthly), KPI Rules (Min Hours, Overtime Multiplier).
*   **Output**: A reusable Rate ID associated with an Asset Category or specific Asset.

#### Phase 2: Booking & Contract (Draft)
1.  **Create Header**: User creates a `Rental` for a Client. Status: `requested`.
2.  **Add Assets**: User adds Assets to the Rental.
    *   System creates `RentalItem` records.
    *   Each Item is linked to a `RentalRate`.

#### Phase 3: Activation & Dispatch (Handover)
1.  **Approve**: Manager approves the Rental. Status: `approved`.
2.  **Dispatch (Handover Out)**:
    *   User performs "Handover Out" for **each item** (scanning conditions).
    *   **System Action**: 
        *   Sets `RentalItem.status` = `rented_out`.
        *   Sets `Asset.status` = `Rented`.
        *   If it's the first item, `Rental.status` updates to `rented_out`.
3.  **Documents**: Generate `Surat Jalan` (Delivery Note) PDF.

#### Phase 4: Daily Operations (Timesheets)
1.  **Logging**: Field Checker submits a `CreateTimesheetRequest` for a specific `RentalItem`.
    *   Input: Date, Start/End Time, HM Start/End, Status (`operating`, `standby`, `breakdown`).
2.  **Verification**: Timesheets are reviewed and approved.

#### Phase 5: Billing Generation
1.  **Preview**: Finance Admin selects a Rental and Date Range (e.g., "Jan 2026").
2.  **Calculation (Multi-Asset)**:
    *   The system iterates through **ALL** active `RentalItems`.
    *   **Rules Applied**:
        *   *Minimum Hours*: If (Operating < Min), charge Min.
        *   *Standby*: Standby Hours * Rate * Multiplier.
        *   *Overtime*: (Operating - Standard 8h) * Rate * Multiplier.
3.  **Invoice Creation**: System generates `RentalBillingPeriod` records (one per asset) and Invoice PDF.

#### Phase 6: Termination (Return)
1.  **Return Handover**: User logs "Return" for an item (Checking condition vs Dispatch).
2.  **System Action**:
    *   Sets `RentalItem.status` = `returned`.
    *   Sets `Asset.status` = `Available`.
    *   Checks if *all* items are returned. If yes, closes `Rental` header.

---

## 2. Internal Loan (Karyawan/Internal)
Used when employees borrow assets for internal operations.

### Alur Kerja (Work-flow)
1. **Request**: Employee submits `LoanRequest`.
2. **Approval**: Supervisor approves based on operational needs.
3. **Handover**: Condition check (simpler than rental).
4. **Return**: Asset returned to inventory.
- Asset Status: `available` ↔ `in_use`.

---

## 3. Rented-In (Sewa dari Vendor)
Used when the company rents equipment from external vendors.

### Alur Kerja (Work-flow)
1. **Procurement Request**: Request to rent specific equipment.
2. **Vendor Coordination**: Link with `Vendor` and `Contract`.
3. **Receipt (Check-in)**:
    - Inspect vendor's asset.
    - Create temporary asset record with tag `RENTED_IN`.
4. **Usage**: Track usage duration/cost.
5. **Return**: Return asset to vendor and close contract.

---

## Technical Integration Notes (For Development)

### Database Entities required:
- `rentals`: Contract Header.
- `rental_items`: Link between Rental and Asset (Multi-Asset).
- `rental_rates`: Pricing configuration.
- `rental_timesheets`: Daily usage logs.
- `rental_billing_periods`: Invoices per item.

### Asset Status Mapping:
| Operation | Start Status | End Status |
|-----------|--------------|------------|
| Rented-Out| `available`  | `rented|` (via `RentalItem`) |
| Internal Loan | `available`| `in_use`   |
| Rented-In | `N/A`        | `rented_in` (New temporary record) |
