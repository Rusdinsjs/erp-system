# Project Status Overview

**Last Updated:** 2026-01-14

This document provides a high-level overview of the Asset Management System's current implementation status across all modules.

---

## 📋 Changelog

### 2026-01-14 (Operations Automation & Podman Readiness)

- **Maintenance Automation:**
  - **Scheduler Service:** Implemented daily background job (01:00 AM) to auto-generate Preventive Work Orders for assets reaching their `next_service_date`.
  - **Repository:** Added `list_due_next_service` logic to prevent duplicate SPKs and handle expired service dates.
- **Loans Module Refinement:**
  - **UI Integration:** Displaying Employee NIK in the loans table and detail views for better accountability.
  - **Data Integrity:** Ensured `employee_id` linkage is robust across the checkout/checkin lifecycle.
- **Rental Billing:**
  - **Frontend:** Implemented `BillingPeriodForm` and modal-based generation for new billing cycles.
  - **Audit Log:** Enhanced billing details with a historical timesheet audit log.
- **Production & Podman:**
  - **Dockerfile:** Upgraded to Rust 1.83-slim for `Cargo.lock` compatibility and added SQLx offline build support (`ENV SQLX_OFFLINE=true`).
  - **Preparation:** Generated `.sqlx/` metadata to allow builds without a live database connection.
  - **Compatibility:** Verified `start-dev.ps1` and `docker-compose.yml` stability using Podman.

### 2026-01-14 (Form Intelligence & Master Data)

- **Departments Module:** Implemented `departments` table and API endpoints with dynamic selection & "Quick Add" in Asset Forms.
- **Smart Templates:** Added auto-fill logic for asset specs based on category templates.

---

## 🟢 Core Modules (Stable/Complete)

### 1. Asset Management (`src/api/handlers/asset_handler.rs`)

- **Features:** CRUD, QR Codes, Lifecycle tracking, Master Data (Category/Dept) integration.

### 2. Master Data Engine (Categories, Locations, Departments)

- **Features:** Recursive Trees, Smart Dropdowns with "Quick Add".

### 3. Authentication & RBAC

- **Features:** JWT Auth + 4-Level Permission System.

---

## 🔵 Advanced Modules (Automated & Polished)

### 4. Work Order & Maintenance

- **Status:** **Automated**
- **Details:** Auto-generation of preventive SPKs, full cost tracking, and asset name joins in backend queries.

### 5. Loans Module (Internal Lending)

- **Status:** **Polished**
- **Features:** NIK-integrated checkout, condition logging, and overdue tracking.

### 6. Rental & Client Management

- **Status:** **High Fidelity UI / Verified**
- **Features:** Evidence-based timesheets, automated billing calculations, and invoice generation.

---

## 🛠 Tech Stack & Environment

- **Backend:** Rust (Axum, SQLx, Tokio)
- **Database:** PostgreSQL (5436) + Redis (6382)
- **Frontend:** React (Vite, Tailwind CSS v4, React Query)
- **Container Engine:** Podman / Docker (supports `podman compose`)

## 🔄 Handoff & Linux Handoff Notes

- **Linux Pickup:** Since the project uses Podman on Windows, it will transition seamlessly to Linux. Use `podman compose up -d` to start the infrastructure.
- **SQLx Offline:** If building in CI or a restricted environment, `cargo build` will use the `.sqlx` folder due to `SQLX_OFFLINE=true`.
- **Database:** Migrations run automatically on backend startup. To run manually: `sqlx migrate run`.
- **Backend Logs:** Check `backend.err.log` if `cargo run` fails.
