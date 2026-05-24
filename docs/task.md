# Task: Penyempurnaan Frontend Modul Aset & User Management

- `[x]` 1. Perbarui Role Label di User Management (`Users.tsx`)
    - `[x]` Ubah `getAccessScope` untuk mendeteksi `admin_alat_berat`, `admin_kendaraan`, `admin_infrastruktur`
- `[x]` 2. Perbarui Categories Form (`Categories.tsx`)
    - `[x]` Tambahkan `asset_group` ke dalam Interface `Category` dan state `formData`
    - `[x]` Tambahkan Select Input untuk memilih `asset_group`
    - `[x]` Filter Tree Categories berdasarkan `allowedGroup` role saat ini
- `[x]` 3. Perbarui `Categories` handler jika ada validasi payload tambahan
- `[x]` 4. Verifikasi perubahan via TypeScript build (`tsc`)
