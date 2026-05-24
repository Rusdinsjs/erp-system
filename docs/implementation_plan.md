# Penyempurnaan Modul Aset & User Management (RBAC)

Melanjutkan perbaikan akses untuk 3 admin spesialis (Alat Berat, Kendaraan, Infrastruktur), kita perlu menyelaraskan frontend agar benar-benar merefleksikan pembatasan yang sudah ada di backend.

## User Review Required

> [!IMPORTANT]
> Saat ini backend sudah memiliki role `admin_alat_berat`, `admin_kendaraan`, dan `admin_infrastruktur`. Namun, di UI User Management (halaman Users) masih menggunakan label lama (`admin_heavy_eq`, dll). Kita akan perbaiki ini agar sinkron.
> 
> Selain itu, di modul Categories, kita perlu menambahkan pilihan "Asset Group" (Kelompok Aset) agar setiap kali membuat kategori baru, kategori tersebut masuk ke ranah admin yang benar.

## Proposed Changes

### Frontend User Management

#### [MODIFY] [Users.tsx](file:///home/rus/Ngoding/management-system/web-admin/src/pages/Users.tsx)
- Menyesuaikan fungsi `getAccessScope` agar mengenali kode role baru:
  - `admin_alat_berat` -> "Spesialis Alat Berat"
  - `admin_kendaraan` -> "Spesialis Kendaraan"
  - `admin_infrastruktur` -> "Spesialis Infrastruktur"
- Memastikan tampilan badge dan hak akses di tabel User lebih representatif.

### Frontend Asset Management (Kategori)

#### [MODIFY] [Categories.tsx](file:///home/rus/Ngoding/management-system/web-admin/src/pages/Assets/Categories.tsx)
- Menambahkan field `asset_group` ke interface `Category` dan `CategoryRequest`.
- Menambahkan **Dropdown Asset Group** di form pembuatan kategori (pilihan: `ALAT_BERAT`, `KENDARAAN`, `INFRASTRUKTUR`).
- Memfilter tampilan pohon kategori (Tree View) berdasarkan role user yang sedang login (misal: Admin Kendaraan tidak akan melihat kategori Alat Berat).

### Frontend Dashboard / Navigasi (Opsional/Pengecekan)

- Memastikan menu navigasi (Launchpad/Sidebar) tetap berjalan normal untuk 3 role baru ini.

---

## Verification Plan

### Automated/Manual Tests
- Buka `/users` dan periksa kolom "Access Scope", pastikan role admin yang baru terbaca dengan benar.
- Buat kategori aset baru melalui menu Categories, pastikan ada pilihan "Asset Group".
- Login sebagai `admin_kendaraan` dan pastikan di menu Categories hanya muncul kategori kendaraan.
