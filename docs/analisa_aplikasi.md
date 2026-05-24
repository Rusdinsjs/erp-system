# Analisa Lengkap: SJS Group Asset Management System

## 🎯 Tujuan & Identitas Aplikasi

**Nama**: Asset Management System — ERP internal milik **SJS Group**
**Domain Produksi**: `api.sjsgroup.site`
**Tagline**: Sistem manajemen aset terintegrasi untuk perusahaan skala menengah-besar yang bergerak di bidang alat berat, kendaraan, dan infrastruktur.

**Tujuan utama**: Mengelola seluruh siklus hidup aset fisik perusahaan — dari pengadaan, penggunaan, perawatan, penyewaan, hingga penjualan/penghapusan — dalam satu platform terintegrasi dengan akuntansi dan SDM.

---

## 🏗️ Arsitektur Sistem (Fullstack)

```
┌─────────────────────────────────────────────────────────┐
│                  NGINX (Reverse Proxy)                  │
│                   api.sjsgroup.site                     │
└────────────────────┬────────────────┬───────────────────┘
                     │                │
          ┌──────────▼──────┐   ┌─────▼──────────┐
          │  Frontend       │   │  Backend API   │
          │  React + Vite   │   │  Rust (Axum)   │
          │  Port :8888     │   │  Port :8080    │
          │  TypeScript     │   │  REST + WS     │
          └─────────────────┘   └────────┬───────┘
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                      ┌───────▼──┐ ┌─────▼──┐ ┌───▼─────┐
                      │PostgreSQL│ │ Redis  │ │ Ollama  │
                      │  :5434   │ │ :6382  │ │  AI     │
                      │  v16     │ │  v7    │ │ (Hermes)│
                      └──────────┘ └────────┘ └─────────┘
```

### Stack Teknologi

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS + TanStack Query |
| **Backend** | Rust (Axum framework) — *compiled binary, sangat performa* |
| **Database** | PostgreSQL 16 (SQLx async ORM) |
| **Cache** | Redis 7 (session, real-time state) |
| **Auth** | JWT (access + refresh token) + Argon2 password hashing |
| **Real-time** | WebSocket (notifikasi live) |
| **AI Agent** | Ollama + Hermes model (AI assistant chat) |
| **Deploy** | Docker Compose + GitHub Actions CI/CD |
| **Server** | VPS Linux Ubuntu 24.04 |

---

## 📦 Modul-Modul Aplikasi (13 Modul Utama)

### 1. 🏭 Asset Management (INTI)
Manajemen aset fisik dari A sampai Z.

**Sub-fitur:**
- CRUD aset dengan kode unik (AST-001, dst)
- **Kategori dinamis** dengan attribute template (setiap kategori punya field berbeda)
- **3 Kelompok Aset** + 3 Admin Spesialis:
  - `ALAT_BERAT` → excavator, dozer, dll → dikelola `admin_alat_berat`
  - `KENDARAAN` → dump truck, truk ringan, dll → dikelola `admin_kendaraan`
  - `INFRASTRUKTUR` → bangunan, IT equipment, furniture → dikelola `admin_infrastruktur`
- Lifecycle states: `planning → available → in_use → maintenance → retired → disposed`
- QR Code generation untuk setiap aset
- Upload foto & dokumen aset
- Vehicle Details khusus (STNK, BPKB, KIR, pajak, odometer)
- Kalkulasi depreciation otomatis (straight-line method)

### 2. 🔧 Work Orders & Maintenance
Manajemen perawatan dan perbaikan aset.

**Sub-fitur:**
- Work Order (WO) dengan status: `draft → pending → in_progress → completed → cancelled`
- Maintenance templates (jadwal rutin berdasarkan template)
- Maintenance schedules (preventive maintenance terjadwal)
- Parts & inventory management (sparepart yang dipakai)
- Biaya aktual vs estimasi
- Supervisor sign-off
- Laporan biaya maintenance per aset

### 3. 🚗 Rental Management (Rented-Out)
Menyewakan aset perusahaan ke pihak eksternal (klien).

**Sub-fitur:**
- Rental contracts dengan multi-asset support
- Rate types: harian, jam, atau Kilometer (BCM)
- Timesheet operator (pencatatan jam kerja harian)
- Billing otomatis berdasarkan timesheet
- KPI billing (target vs aktual)
- Tier pricing (harga beda berdasarkan volume/km)
- Contract renewals & approval workflow
- Invoice generation

### 4. 📤 Loans (Internal Loan & Rented-In)
Peminjaman aset antar departemen atau dari pihak luar.

**Sub-fitur:**
- Request → Approve → Checkout → Checkin lifecycle
- Foto saat checkout & checkin (bukti kondisi)
- Tanggal jatuh tempo & tracking overdue
- Link ke employee yang meminjam

### 5. 💰 Finance & Accounting (Terintegrasi)
Modul akuntansi lengkap terintegrasi dengan operasional aset.

**Sub-fitur:**
- **Chart of Accounts** (Bagan Akun) Indonesian Standard
- **Journal Entries** (Jurnal Umum) — otomatis dari setiap transaksi aset
- **Sales** (Order → Quote → Invoice → Shipment → Payment)
- **Purchases** (PO → Quote → Bill → Shipment → Payment)
- **Cash & Bank** management
- **General Ledger** (Buku Besar)
- **Trial Balance** (Neraca Saldo)
- **Financial Reports** (Laporan Keuangan)
- Expense tracking dengan kategori CAPEX/OPEX
- Depreciation journal entries otomatis

### 6. ⛽ Fuel Management
Manajemen konsumsi BBM untuk armada kendaraan & alat berat.

**Sub-fitur:**
- Pencatatan pengisian BBM per kendaraan
- Konsumsi BBM vs odometer
- Laporan efisiensi BBM
- Akun GL khusus BBM

### 7. 📋 Inventory
Manajemen stok spare part dan material.

**Sub-fitur:**
- Item catalog
- Stock tracking (masuk/keluar)
- Inventory documents (penerimaan, pengeluaran)
- Relasi ke Work Orders (parts yang dipakai)

### 8. 👥 HR Module
Manajemen SDM dasar.

**Sub-fitur:**
- Employee management (profil karyawan)
- Department structure
- Attendance tracking
- Leave management (pengajuan & approval cuti)
- Link employee ke aset yang dipinjam/ditugaskan

### 9. 🔔 Notifications & Real-time
Sistem notifikasi real-time via WebSocket.

**Sub-fitur:**
- Live notification broadcast (asset created, WO updated, dll)
- Email notifications (SMTP)
- WhatsApp notifications (via API)
- Tax renewal reminders (otomatis via scheduler)

### 10. 📊 Reports & Analytics
Dashboard dan laporan manajemen.

**Sub-fitur:**
- Main Dashboard (KPI utama: jumlah aset, nilai total, WO pending, dll)
- Analytics Dashboard (grafik distribusi aset, trend maintenance)
- Asset lifecycle reports
- Financial reports (L/R, neraca, arus kas)
- Fuel efficiency reports
- Audit logs (siapa ubah apa, kapan)
- Export ke CSV/PDF

### 11. 🔑 Tax Renewals
Manajemen perpanjangan dokumen kendaraan & alat berat.

**Sub-fitur:**
- Tracking STNK, pajak kendaraan, KIR, lapor tiba
- Reminder otomatis X hari sebelum jatuh tempo
- Status: `pending → in_process → completed`
- Upload bukti pembayaran

### 12. 🤖 AI Agent (Hermes)
Asisten AI terintegrasi menggunakan model Hermes via Ollama.

**Sub-fitur:**
- Chat interface di dashboard
- Context-aware (tahu tentang data aset sistem)
- Berjalan lokal di server (privasi data terjaga)

### 13. ⚙️ System Settings & RBAC
Konfigurasi sistem dan manajemen hak akses.

**Sub-fitur:**
- User management
- Role-Based Access Control (RBAC) berbasis database
- Approval workflow settings
- Organization & department settings
- System-level settings (tax warning days, dll)

---

## 👤 Hierarki Role Pengguna

```
super_admin (level 1)     ← Akses SEMUA fitur, SEMUA data
    │
admin (level 4)           ← Akses semua aset + user management
    │
    ├─ admin_alat_berat   ← Hanya ALAT_BERAT + maintenance
    ├─ admin_kendaraan    ← Hanya KENDARAAN + maintenance
    └─ admin_infrastruktur ← Hanya INFRASTRUKTUR + maintenance
    │
manager (level 2)         ← Approval L2, bisa baca semua aset
    │
supervisor (level 3)      ← Approval L1 work orders
    │
technician (level 5)      ← Eksekusi work orders
    │
staff (level 5)           ← Baca aset, request loan
    │
user (level 5)            ← Baca aset, request loan
```

---

## 🗄️ Database (PostgreSQL)

**Total migrasi**: 132 migration files (sangat mature)

**Tabel utama:**
- `assets` + `categories` + `locations` + `departments`
- `maintenance_work_orders` + `maintenance_schedules`
- `rentals` + `rental_contracts` + `rental_timesheets` + `rental_billings`
- `asset_loans` (peminjaman)
- `fuel_logs` (BBM)
- `inventory_items` + `inventory_documents`
- `users` + `roles` + `permissions` + `role_permissions` (RBAC)
- `approval_requests` + `approval_workflows`
- `chart_of_accounts` + `journal_entries` + `journal_lines`
- `sales_orders` + `sales_invoices` + `purchase_orders` + `purchase_bills`
- `employees` + `attendance` + `leaves`
- `asset_tax_renewals`
- `notifications` + `audit_logs` + `settings`

---

## 🔄 Approval Workflow

Beberapa aksi butuh approval sebelum dieksekusi:
```
Aksi (Create/Update/Sell) oleh role_level > 2
    ↓
Approval Request (status: PENDING)
    ↓
Supervisor approve (L1)
    ↓
Manager approve (L2)
    ↓
Aksi dieksekusi ke database
```

---

## 🏢 Konteks Bisnis SJS Group

Dari struktur data yang ada, perusahaan ini adalah:
- **Industri**: Konstruksi / Pertambangan / Infrastruktur
- **Skala**: Menengah-besar (punya fleet alat berat + kendaraan + properti)
- **Operasi**: Menyewakan alat berat ke klien, memiliki departemen sendiri
- **Kebutuhan**: Multi-departemen, multi-lokasi, perlu approval berlapis

---

## 📌 Status Implementasi (per Mei 2026)

| Modul | Backend | Frontend | Notes |
|---|---|---|---|
| Asset CRUD | ✅ | ✅ | Lengkap + filter group |
| Maintenance/WO | ✅ | ✅ | Lengkap |
| Rental (Rented-Out) | ✅ | ✅ | Termasuk billing |
| Loans (Internal) | ✅ | ✅ | Lengkap |
| Finance | ✅ | ✅ | Lengkap |
| Fuel | ✅ | ✅ | |
| Inventory | ✅ | ✅ | |
| HR | ✅ | Partial | Attendance & Leave ada |
| Tax Renewals | ✅ | ✅ | |
| Notifications | ✅ | ✅ | WebSocket live |
| RBAC 3 Admin | ✅ DB | ⚠️ Partial | Backend filter ✅, Frontend filter masih perlu |
| AI Agent | ✅ Infra | ⚠️ | Ollama jalan, integrasi UI partial |
| Audit Logs | ✅ | ✅ | |

---

*Dibuat: 2026-05-24 | Berdasarkan analisa kode fullstack*
