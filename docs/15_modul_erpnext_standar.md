# 📋 Catatan Penting: 15 Modul Standar Industri ERPNext

Dokumen ini berisi rangkuman 15 modul standar industri berdasarkan framework Frappe/ERPNext. Catatan ini berfungsi sebagai **blueprint dan acuan utama** bagi pengembangan SJS Group ERP System agar setara dengan standar ERP kelas dunia.

---

## 🏗️ 1. ACCOUNTING (Akuntansi & Keuangan)
Pusat urat nadi perusahaan. Semua mutasi finansial bermuara di sini.
*   **Fitur Kunci:** Chart of Accounts (Bagan Akun), Journal Entry, AR/AP (Piutang/Hutang), Rekonsiliasi Bank, Cost Center, Budgeting, Perhitungan Pajak otomatis, Penutupan Buku, dan Laporan Keuangan (Neraca, Laba/Rugi, Arus Kas).

## 🏢 2. ASSET (Manajemen Aset Tetap)
Mengelola siklus hidup aset tetap milik perusahaan.
*   **Fitur Kunci:** Asset Register, Kategori & Metode Penyusutan, Mutasi Aset (Movement), Perawatan (Maintenance), Perbaikan, Kapitalisasi Aset, Revaluasi, Penghapusan (Scrapping), dan Jadwal Penyusutan Otomatis.

## 🛒 3. BUYING (Pembelian & Pengadaan)
Menangani alur pengadaan barang dari internal hingga tagihan supplier.
*   **Fitur Kunci:** Master Supplier, Material Request (Permintaan Internal), Request for Quotation (RFQ), Purchase Order (PO), Penerimaan Barang, Purchase Invoice, Evaluasi Kinerja Supplier (Scorecard), dan Subkontrak.

## 🤝 4. SELLING (Penjualan)
Mengelola alur penjualan dari prospek hingga penagihan.
*   **Fitur Kunci:** Master Customer, Quotation (Penawaran), Sales Order (SO), Surat Jalan (Delivery Note), Sales Invoice, Aturan Harga (Pricing Rules), Komisi Sales, dan Program Loyalitas.

## 📦 5. STOCK / INVENTORY (Manajemen Gudang)
Mengelola pergerakan dan ketersediaan stok fisik.
*   **Fitur Kunci:** Master Item & Varian, Multi-Gudang berhierarki, Stock Entry (In/Out/Transfer), Tracking Batch & Serial Number, Rekonsiliasi Fisik, Reorder Point (Peringatan Stok Minimum), Valuasi Stok (FIFO/Moving Average), dan Inspeksi Kualitas.

## 🏭 6. MANUFACTURING (Produksi)
Khusus untuk perusahaan manufaktur atau perakitan.
*   **Fitur Kunci:** Bill of Materials (BOM/Resep), Work Order, Job Card (Kartu Kerja Mesin), Material Requirements Planning (MRP), Routing & Workstation, Tracking Waktu Mati Mesin (Downtime), dan Kelola Sisa Produksi (Scrap).

## 🏗️ 7. PROJECTS (Manajemen Proyek)
Tracking biaya, waktu, dan progres pengerjaan proyek.
*   **Fitur Kunci:** Dashboard Proyek, Task & Dependensi, Gantt Chart, Timesheet (Pencatatan Waktu), Project Costing (Anggaran vs Aktual), Milestone, Tracking Kendala (Issue), dan Tagihan berbasis Jam Kerja.

## 📈 8. CRM (Manajemen Hubungan Pelanggan)
Fokus pada pra-penjualan dan aktivitas marketing.
*   **Fitur Kunci:** Leads, Opportunities (Peluang), Prospects, Pipeline View (Kanban), Kampanye Marketing, Otomasi Email Campaign, Jadwal Temu (Appointment), dan Analisa Kegagalan (Lost Reason).

## 🛠️ 9. SUPPORT / HELPDESK (Layanan Pelanggan)
Layanan purna jual dan pengelolaan tiket keluhan.
*   **Fitur Kunci:** Ticketing (Issues), SLA (Service Level Agreement), Prioritas Masalah, Klaim Garansi, Penjadwalan Teknisi/Maintenance Visit, dan Portal Pelanggan.

## 👥 10. HUMAN RESOURCES (Sumber Daya Manusia)
Mengelola data dan operasional karyawan.
*   **Fitur Kunci:** Database Karyawan, Struktur Organisasi, Absensi (termasuk Auto-Attendance), Manajemen Shift, Manajemen Cuti, Training, Penilaian Kinerja (Appraisal), dan Proses Keluar (Exit Interview).

## 💰 11. PAYROLL (Penggajian)
*(Sering dipisah karena kompleksitasnya)*
*   **Fitur Kunci:** Komponen Gaji (Tunjangan/Potongan), Struktur Gaji, Proses Gaji Massal (Payroll Entry), Slip Gaji Individual, Perhitungan Pajak (PPh 21), dan Perhitungan Pesangon (Gratuity).

## 🔍 12. QUALITY MANAGEMENT (Kontrol Kualitas)
Memastikan standar kualitas barang dan layanan terpenuhi.
*   **Fitur Kunci:** Template Inspeksi Kualitas, Pencatatan Inspeksi (saat beli/jual/produksi), Laporan Ketidaksesuaian (NCR), dan Target Kualitas.

## ⚙️ 13. CUSTOMIZATION & AUTOMATION (Kustomisasi)
Alat fleksibel untuk memodifikasi sistem tanpa coding.
*   **Fitur Kunci:** Custom Field, Custom Form/DocType, Alur Persetujuan (Workflow), Aturan Notifikasi (Auto Email/WA), Format Penomoran, dan Print Format Builder.

## 🌐 14. WEBSITE & E-COMMERCE
Portal web yang terhubung langsung ke database ERP.
*   **Fitur Kunci:** Katalog Produk Online, Keranjang Belanja, Portal Customer Self-Service, Blog, Halaman Statis, dan Web Form.

## 🔗 15. INTEGRATIONS & REGIONAL (Integrasi Sistem)
Sambungan ke aplikasi pihak ketiga dan fitur lokalisasi.
*   **Fitur Kunci:** Payment Gateway (Midtrans, Stripe), Google Sync, Single Sign-On (LDAP/SSO), Integrasi WhatsApp, dan Lokalisasi Aturan Negara (seperti pajak Indonesia, eFaktur, dll).

---

## 📌 Kesimpulan Posisi SJS Group Saat Ini
*   **Unggul / Matang:** Accounting, Asset (bahkan lebih spesifik dengan rental), Buying, Selling.
*   **Perlu Disempurnakan (Partial):** Inventory, HR.
*   **Peluang Pengembangan Utama (Gap):** Payroll, Shift Management, Projects, CRM, dan Manajemen Tiket Support.
