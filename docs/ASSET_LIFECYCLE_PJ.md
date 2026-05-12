# Dokumentasi Sistem Penanggung Jawab (PJ) Aset Berdasarkan Lifecycle

Dokumen ini menjelaskan logika akuntabilitas dan penentuan Penanggung Jawab (PJ) otomatis untuk setiap tahap dalam siklus hidup aset (Asset Lifecycle) pada Sistem Manajemen Aset.

## 1. Konsep Utama
Setiap aset dalam sistem harus memiliki entitas (Grup, Departemen, atau Personal) yang bertanggung jawab atas keberadaan dan kondisi fisik aset tersebut. Sistem secara dinamis menentukan PJ ini berdasarkan status `status` aset saat ini.

---

## 2. Tabel Pemetaan PJ (Chain of Custody)

| Lifecycle State | Label Sistem | Penanggung Jawab (PJ) | Deskripsi Akuntabilitas |
| :--- | :--- | :--- | :--- |
| **Planning** | Operational | **Warehouse / GA Team** | Masa perencanaan pengadaan. |
| **Procurement** | Operational | **Warehouse / GA Team** | Aset dalam proses pemesanan/pembelian. |
| **Received** | Operational | **Warehouse / GA Team** | Barang baru tiba dan sedang dicek kualitasnya. |
| **In Inventory** | Operational | **Warehouse / GA Team** | Barang tersimpan di gudang pusat. |
| **Deployed** | Dept. Responsibility | **Manager Departemen** | Aset sudah diserahkan ke Departemen terkait (Default PJ: Manager). |
| **In Use (Internal Loan)** | Individual | **Karyawan Peminjam** | PJ beralih ke personal setelah proses *Checkout*. |
| **Under Maintenance** | Technical | **Maintenance Team / Vendor** | Aset sedang dalam perawatan rutin. |
| **Under Repair** | Technical | **Vendor / Workshop** | Aset sedang dalam perbaikan kerusakan. |
| **Under Conversion** | Technical | **Technical Team** | Aset sedang dalam proses modifikasi spesifikasi. |
| **Retired** | Asset Management | **Finance / Asset Manager** | Aset sudah tidak digunakan dan menunggu disposisi. |
| **Disposed** | Asset Management | **Finance / Asset Manager** | Aset sudah dijual/dihancurkan/dihibahkan. |

---

## 3. Logika Implementasi (Technical Logic)

Logika penentuan PJ di sisi Frontend (`web-admin`) mengikuti hierarki berikut:

1.  **Prioritas 1 (Individual)**: Jika properti `assigned_to_name` terisi (hasil dari modul *Internal Loan*), maka nama tersebut adalah PJ utama tanpa mempedulikan status lifecycle.
2.  **Prioritas 2 (Departmental)**: Jika status adalah `Deployed` dan tidak ada peminjaman personal, maka `department_manager_name` dari departemen aset tersebut menjadi PJ.
3.  **Prioritas 3 (Technical)**: Jika status mengandung kata `maintenance` atau `repair`, PJ beralih ke `vendor_name` atau internal Maintenance Team.
4.  **Prioritas 4 (Warehouse)**: Untuk status awal (`Planning` s/d `Inventory`), PJ default adalah tim Gudang (Warehouse/GA).

### Contoh Tampilan UI:
- **Status:** `Deployed`
- **PJ Label:** `Dept. Responsibility`
- **Nama PJ:** `Budi Santoso (Manager IT)`

---

## 4. Keamanan & Audit
Perubahan PJ direkam secara otomatis dalam tabel `lifecycle_history` dan `asset_history` setiap kali terjadi transisi status. Hal ini memastikan riwayat "tangan" pemegang aset dapat dilacak dari awal pengadaan hingga akhir (disposal).

---
*Dokumen ini diperbarui secara otomatis sesuai dengan implementasi sistem per Januari 2026.*
