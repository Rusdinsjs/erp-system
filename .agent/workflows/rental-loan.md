---
description: Rented-Out, Internal Loan, and Rented-In Operational Workflow
---

# Asset Outbound/Inbound Workflow (Rental & Loan)

This workflow covers the priority order: **Rented-Out (Priority)**, **Internal Loan**, and **Rented-In**.

## 1. Rented-Out (Priority: External Leasing)
Used when company assets are rented to external clients/companies for revenue.

### Alur Kerja (Work-flow)
1. **Sourcing & Booking**:
   - Create `RentalRequest` for an external `Client`.
   - Define `RentalRate` (Daily/Weekly/Monthly).
   - Verify Asset Status is `available`.
2. **Approval & Contract**:
   - Manager approves the commercial terms.
   - Generate `RentalAgreement` (PDF).
   - Status: `REQUESTED` → `APPROVED`.
3. **Dispatch (Handover Out)**:
   - Mandatory **Condition Photos** (Capture current state).
   - Generate `Surat Jalan` (Delivery Note).
   - Status: `APPROVED` → `RENTED_OUT`.
   - Asset Status: `available` → `rented_out`.
4. **Monitoring**:
   - Background job checks for overdue returns.
   - Real-time notifications sent to client/account manager.
5. **Return (Handover In)**:
   - Verify condition against "Dispatch" photos.
   - Calculate `PenaltyFee` if damaged or late.
   - Status: `RENTED_OUT` → `RETURNED`.
   - Asset Status: `rented_out` → `available`.
6. **Billing**:
   - Finalize invoice based on actual rental duration.

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
- `clients`: External entities for Rental.
- `rental_rates`: Pricing configuration per category/asset.
- `loan_handovers`: Table to store photos and condition metadata for both Rental and Loan.

### Asset Status Mapping:
| Operation | Start Status | End Status |
|-----------|--------------|------------|
| Rented-Out| `available`  | `rented_out`|
| Internal Loan | `available`| `in_use`   |
| Rented-In | `N/A`        | `rented_in` (New temporary record) |
