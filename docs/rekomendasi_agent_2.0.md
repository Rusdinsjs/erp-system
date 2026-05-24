# 🚀 Rekomendasi Penggunaan Agent Antigravity (Menuju Paradigma 2.0)

Bozz, commit dan push Anda barusan (`87bdc19`) berjalan dengan **mulus 100%**. Penggunaan git Anda sudah sangat rapi dan sinkron!

Sebagai partner coding Bozz, saya ingin memberikan saran taktis bagaimana cara Bozz mempekerjakan saya dengan kapasitas maksimal (Paradigma Agent 2.0) agar pengembangan SJS Group ERP berjalan 5x lebih cepat dan zero-bug.

Berikut adalah 4 taktik utama yang bisa Bozz gunakan mulai sekarang:

---

## 1. Gunakan Browser Subagent untuk Pengujian Visual (Visual QA)
Selama ini, kita menguji kode hanya sampai tahap *compiler* (`tsc` lolos). Padahal, cara terbaik memastikan UI benar-benar cantik dan responsif adalah dengan melihatnya langsung.

**Bagaimana cara kerjanya?**
Bozz bisa memerintahkan saya seperti ini:
> *"Bro, tolong jalankan browser subagent. Login ke dashboard dev pake akun `admin_alat_berat`, masuk ke halaman Kategori, dan ambil screenshot untuk memastikan filter berjalan visual."*

Saya akan otomatis membuka browser virtual di server, melakukan klik, mengisi form secara mandiri, mengambil screenshot/video, lalu menyajikannya ke layar Bozz. Ini menghemat waktu Bozz untuk ngetes manual!

---

## 2. Manfaatkan Ekosistem Workflow (`.agent/workflows/`)
Di dalam folder proyek kita, ada folder khusus bernama `.agent/workflows/`. Ini adalah petunjuk jalan bagi saya.

**Rekomendasi:**
Jika Bozz punya prosedur kerja baru (misalnya: SOP migrasi database produksi atau SOP setup AI Ollama), Bozz tinggal bilang:
> *"Bro, buatkan file workflow baru dengan nama `setup-ollama.md` di folder `.agent/workflows/`."*

Di sesi berikutnya, Bozz cukup mengetik `/setup-ollama` dan saya akan otomatis membaca panduan tersebut dan menjalankannya tanpa perlu Bozz jelaskan ulang secara panjang lebar.

---

## 3. Akumulasi Knowledge Items (KI) untuk "Memori Abadi"
Tantangan terbesar LLM adalah "lupa ingatan" jika sesi percakapan sudah terlalu panjang atau berganti hari. Di sistem saya, ada folder khusus bernama `<appDataDir>/knowledge/`.

**Rekomendasi:**
Setiap kali kita menyelesaikan fitur yang rumit (seperti setup Auth Trust kemarin), mintalah saya:
> *"Bro, simpan setup database kemarin ke dalam Knowledge Item baru dengan nama `vps-db-trust-auth`."*

Ketika sesi baru dimulai minggu depan, saya akan otomatis membaca ringkasan *Knowledge Item* tersebut di detik pertama, sehingga ingatan saya langsung pulih 100% dan kita tidak perlu mengulang penjelasan dari nol.

---

## 4. Delegasi Tugas Riset Berat
Jika Bozz punya ide gila tapi belum tahu cara kodingnya (misal: *"Saya mau integrasikan sistem absensi berbasis Face Recognition"*), jangan langsung suruh saya nulis kodenya di file utama.

**Rekomendasi:**
Suruh saya melakukan riset paralel terlebih dahulu:
> *"Bro, buat sub-agent khusus untuk riset library Rust/React yang paling stabil untuk face recognition, lalu buatkan POC (Proof of Concept) di folder `scratch/`."*

Saya akan membuat file uji coba terpisah di folder `scratch/` sehingga kode utama SJS ERP tetap bersih dan aman dari eksperimen yang gagal. Setelah POC sukses, baru kita gabungkan ke proyek utama.

---

### Kesimpulan untuk Bozz:
Pola komunikasi Bozz saat ini sudah **sangat bagus** (langsung pada sasaran dan bertahap). Untuk ke depannya, jangan ragu untuk **menyuruh saya melakukan aksi-aksi otonom** seperti:
- *"Bro, tolong tes jalankan servernya, terus buka browser dan verifikasi..."*
- *"Bro, tolong buatkan skrip otomatis untuk..."*

Saya siap menjadi asisten terbaik untuk menyempurnakan SJS ERP, Bozz! 🚀
