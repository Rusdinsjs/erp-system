# Asset Lifecycle & Status Matrix

Dokumen ini merangkum aturan main perpindahan status aset, level approval yang dibutuhkan, serta pemetaan antara status umum (UI) dengan status teknis (System).

## 1. Matrix Transaksi & Approval

| Status Grup (UI) | Detailed State (System) | Bisa Pindah Ke | Approval | Trigger / Action |
| :--- | :--- | :--- | :---: | :--- |
| **Available** | `In Inventory` | In Use, Rented Out | **L1** / None | Penyerahan Asset / Rental Dispatch |
| **In Use** | `Deployed` | Maintenance, Retired | None / **L2** | WO Dimulai / Pengajuan Pensiun |
| **Rented Out** | `Rented Out` | Available | None | Pengembalian via Modul Rental (Return) |
| **Maintenance** | `Under Maintenance` | In Use (Deployed) | None | WO Selesai (Update via Modul WO) |
| | `Under Repair` | In Use (Deployed) | None | WO Selesai (Update via Modul WO) |
| | `Under Conversion` | In Use (Deployed) | **L2** | Approval Modifikasi Fungsi Asset |
| **Pre-Ready** | `Planning` | Procurement | None | Perencanaan Budget |
| | `Procurement` | Received | None | Proses Pembelian (PO) |
| | `Received` | Available | None | Barang Datang & Cek Fisik |
| **End of Life** | `Retired` | Disposed | **L2** | Penarikan dari Operasional |
| | `Disposed` | (Terminal) | **L2** | Lelang / Scrap / Jual |
| | `Lost/Stolen` | Archived | **L2** | Pelaporan Hilang |

---

## 2. Definisi Level Approval

*   **None**: Sistem memproses otomatis atau user level staf bisa melakukan aksi langsung.
*   **L1 (Supervisor/Pool Manager)**: Verifikasi operasional lapangan (cek fisik/assignment).
*   **L2 (Department Manager/Finance)**: Otoritas tinggi untuk perubahan nilai aset atau penghentian aset.

---

## 3. Aturan Bisnis Utama (System Rules)

1.  **Immutability**: Aset dalam status `Disposed` atau `Archived` tidak dapat diubah statusnya kembali (Data Integrity).
2.  **Safety Lock**: Aset bermasalah (`Under Repair` atau `Lost/Stolen`) otomatis terkunci dari semua modul transaksi (Rental/Loan/Deployment).
3.  **Audit Trail**: Setiap perpindahan status dicatat dalam tabel `lifecycle_history` lengkap dengan user, timestamp, dan alasan perubahan.
4.  **Auto-Sync**: Status `Rented Out` dan `Under Maintenance` sepenuhnya dikontrol oleh modul masing-masing (Rental & Work Order) untuk menjamin sinkronisasi data real-time.

---
*Terakhir diperbarui: 2026-01-22*
