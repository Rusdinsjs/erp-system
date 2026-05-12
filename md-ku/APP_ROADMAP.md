# Roadmap Pengembangan Aplikasi (Rencana Bertahap)

Dokumen ini merinci rencana peningkatan aplikasi secara bertahap untuk mencapai standar ERP yang matang dan stabil.

## Phase 1: Analytics & Visualisasi Data
**Fokus**: Memberikan wawasan (insight) yang lebih baik bagi manajemen melalui visualisasi data yang informatif.

| Fitur | Deskripsi | Target File |
| :--- | :--- | :--- |
| **Trend Charts** | Grafik bulanan biaya perawatan (maintenance) & penyusutan aset. | `Dashboard.tsx`, `analytics_service.rs` |
| **Asset Distribution** | Chart lingkaran untuk sebaran aset berdasarkan kategori dan kondisi. | `Dashboard.tsx` |
| **Download PDF Report** | Fitur ekspor ringkasan dashboard ke format PDF. | `data_service.rs`, `genpdf` |

---

## Phase 2: Real-time User Experience
**Fokus**: Meningkatkan responsivitas aplikasi dan memberikan umpan balik (feedback) instan kepada pengguna.

| Fitur | Deskripsi | Target File |
| :--- | :--- | :--- |
| **WebSocket Notifications** | Notifikasi instan saat ada pengajuan Approval atau Peminjaman (Loan) baru. | `src/api/server.rs`, `useNotificationStore.ts` |
| **Smart Global Search** | Kolom pencarian tunggal yang cepat untuk Kode Aset, Serial Number, & Nama. | `AssetList.tsx`, `asset_repository.rs` |
| **Enhanced Toast Feedback** | Feedback yang lebih detail untuk setiap proses latar belakang (background process). | `Toast.tsx` |

---

## Phase 3: Integritas Data & Logika Bisnis Lanjutan
**Fokus**: Menjamin keamanan dan validitas data saat banyak pengguna mengakses sistem secara bersamaan.

| Fitur | Deskripsi | Target File |
| :--- | :--- | :--- |
| **Optimistic Locking** | Sistem versi (`version` field) untuk mencegah data terhapus/tertumpuk saat edit bersamaan. | `Asset.rs`, `asset_repository.rs` |
| **Advanced Filtering** | Filter multifaktor (Lokasi + Kategori + Status + Rentang Harga). | `AssetList.tsx`, `AssetSearchParams` |
| **Bulk Status Update** | Fitur untuk mengubah status banyak aset sekaligus dari daftar utama. | `assetApi.ts`, `asset_service.rs` |

---

## Phase 4: Infrastruktur & Skalabilitas
**Fokus**: Memastikan aplikasi siap menangani beban trafik tinggi dan penyimpanan data besar.

| Fitur | Deskripsi | Target File |
| :--- | :--- | :--- |
| **Object Storage (S3)** | Integrasi AWS S3 atau MinIO untuk penyimpanan dokumen dan foto secara terpusat. | `upload_handler.rs`, `S3Service.rs` |
| **Database Archiving** | Sistem pengarsipan otomatis untuk log audit yang berumur lebih dari 1 tahun. | `db_maintenance.rs` |
| **Redis Caching** | Implementasi cache untuk mempercepat akses data dashboard yang berat. | `CacheOperations.rs` |

---

## Rekomendasi Prioritas

> [!TIP]
> **Saran**: Mulailah dari **Phase 1** untuk memberikan nilai tambah yang nyata bagi pemilik bisnis dan manajemen, kemudian lanjutkan ke **Phase 2** untuk mempermudah operasional harian Admin.
