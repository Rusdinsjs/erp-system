# Panduan Pembatasan Akses Modul (RBAC) di SJS ERP

Di SJS Group ERP, pembatasan akses untuk melihat (Read), mengedit (Update), atau membuka menu tertentu dilakukan secara berlapis (Ganda). Kita menggunakan sistem **Frontend (React)** untuk menyembunyikan menu/tombol, dan **Backend (Rust)** sebagai satpam utama untuk memblokir pencurian data.

Berikut adalah cara kerjanya secara praktis:

---

## 1. Pembatasan Level Menu & Layar (Frontend)
Ini berfungsi untuk menyembunyikan menu di Sidebar atau tombol di layar agar user tidak bisa mengkliknya.

**Cara Kerjanya:**
Di frontend (React), kita menggunakan fungsi `user?.role` atau `user?.role_level`.

*   **Menyembunyikan Menu/Halaman Penuh:**
    Kita menggunakan sistem *Protected Route*. Jika seorang Staff biasa mencoba mengetik URL `/users` (yang khusus HRD/Admin), sistem akan mendeteksi `role_level`-nya kurang, lalu menendangnya kembali ke halaman depan (Launchpad).
*   **Menyembunyikan Tombol Edit/Delete:**
    Di dalam tabel aset, tombol (tong sampah) hanya dirender (dimunculkan) jika user memiliki level yang cukup.
    ```tsx
    // Contoh Kode di Frontend:
    {user.role_level > 2 && (
        <button onClick={handleDelete}>Hapus Aset</button>
    )}
    ```

## 2. Pembatasan Level Data (Backend / Rust)
Ini adalah "Satpam" sesungguhnya. Meskipun user mencoba meretas frontend untuk memunculkan tombol "Delete", saat data dikirim, Backend akan menolaknya.

**Cara Kerjanya:**
1.  Setiap kali user login, backend memberikan **Kunci (JWT Token)** yang di dalamnya sudah tertanam secara permanen jabatannya (misal: `admin_kendaraan`).
2.  Saat user meminta daftar Aset, backend tidak memberikan semua aset. Backend secara otomatis menempelkan filter rahasia di dalam query database.
    ```rust
    // Contoh Logika Backend:
    if user.role == "admin_kendaraan" {
        query = query + " WHERE asset_group = 'KENDARAAN'";
    }
    ```
3.  Hasilnya: User hanya menerima data kendaraan. Data alat berat bahkan tidak pernah keluar dari server.

## 3. Cara Mengatur Pembatasan (Untuk Bozz/Super Admin)

Jika Bozz ingin membatasi seorang karyawan agar tidak bisa membuka suatu modul, Bozz cukup melakukan ini melalui layar **User Management**:

1.  **Pilih Role (Jabatan) yang Sesuai:**
    Setiap jabatan sudah memiliki "Level Kekuatan" (Role Level) dari 1 sampai 5.
    *   `super_admin` (Level 1) = Dewa, bisa buka semua.
    *   `manager` (Level 2) = Bisa Approve, bisa Edit, bisa Delete.
    *   `admin_spesialis` (Level 3) = Bisa Create/Edit, tapi DIBATASI HANYA untuk grup asetnya sendiri.
    *   `staff` (Level 4) = Hanya bisa Read (Melihat) dan membuat pengajuan (Request). Tidak bisa Edit data master.
    *   `user` (Level 5) = Akses paling dasar, biasanya hanya untuk modul umum.

2.  **Mendeaktifkan Akun (Lockout):**
    Jika ada karyawan *resign* atau dicurigai, Bozz tinggal matikan tombol **"Active Account"** di Edit User. Otomatis, kunci (Token)-nya hangus dan dia tidak bisa membuka aplikasi sama sekali, meskipun dia tahu passwordnya.

## Ringkasan Eksekusi Custom (Tingkat Lanjut)
Jika ke depannya Bozz ingin: *"Bro, saya mau Admin Kendaraan BISA melihat data Alat Berat, TAPI TIDAK BISA mengeditnya."*

Maka yang kita lakukan di kode adalah:
1.  **Backend:** Izinkan query Read (GET) untuk semua grup aset, tapi blokir query Update (PUT/POST) jika grupnya tidak sesuai.
2.  **Frontend:** Tampilkan data alat berat di tabel Admin Kendaraan, tapi sembunyikan tombol "Edit" dan "Delete" menggunakan logika `if (asset.group !== user.allowedGroup) { hide_button }`.
