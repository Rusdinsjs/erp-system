# Panduan Pembatasan Akses Modul & RBAC (DocPerm) - ERPQu 1.0

ERPQu 1.0 mengadopsi arsitektur **Role Permission Manager (DocPerm)** terinspirasi dari Frappe Framework / ERPNext. Pembatasan hak akses dilakukan secara berlapis (*Multi-Layered Security*) di tingkat Frontend (UI Control), Backend API Route Guards, dan Row-Level User Permissions.

---

## 🛡️ 1. Matriks Matriks Izin DocPerm (9 Hak Akses)

Setiap Role di ERPQu 1.0 dikonfigurasi menggunakan 9 Jenis Tindakan (*DocPerm Actions*) per DocType:

| Hak Akses / Action | Deskripsi |
| :--- | :--- |
| **`Read`** | Hak untuk melihat dan membaca data dokumen/aset. |
| **`Write`** | Hak untuk mengedit data dokumen yang belum difinalisasi. |
| **`Create`** | Hak untuk membuat dokumen/aset baru. |
| **`Delete`** | Hak untuk menghapus data dokumen/aset. |
| **`Submit`** | Hak untuk memfinalisasi (*Submit / Lock*) dokumen. |
| **`Cancel`** | Hak untuk membatalkan dokumen yang sudah di-Submit. |
| **`Amend`** | Hak untuk membuat revisi baru dari dokumen yang telah dibatalkan. |
| **`Print`** | Hak untuk mencetak atau mengunduh format cetak PDF dokumen. |
| **`Export`** | Hak untuk mengekspor data massal ke format CSV/Excel. |

---

## 🔍 2. Pembatasan Baris Data (Row-Level User Permissions)

Selain pembatasan berbasis Role, ERPQu 1.0 mendukung **User Permissions (Hak Akses Spesifik Per Pengguna)**:
* Seorang pengguna dapat dibatasi hanya boleh melihat Aset di **Kategori tertentu** (misal: *Kendaraan* saja).
* Seorang pengguna dapat dibatasi hanya boleh melihat Aset di **Lokasi tertentu** (misal: *Gudang Utama* saja).
* Seorang pengguna dapat dibatasi hanya boleh melihat Aset di **Departemen tertentu** (misal: *Operasional* saja).

---

## ⚙️ 3. Manajemen RBAC Melalui Web Admin

Super Admin dapat mengelola seluruh konfigurasi RBAC melalui menu **Roles > Role Permission Manager (DocPerm)**:
1. Pilih **Role** yang ingin diatur (misal: *Manager*, *Staff*, *Spesialis Kendaraan*).
2. Pilih **DocType** target (misal: *Asset*, *WorkOrder*, *RentalContract*).
3. Centang 9 jenis kotak centang (*Read, Write, Create, Delete, Submit, Cancel, Amend, Print, Export*) sesuai wewenang.
4. Klik **Simpan Matriks Perizinan**.
