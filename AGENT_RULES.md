# Agent Communication Rules

Segala bentuk komunikasi antara Agent (Antigravity) dan User dalam project-project Antigravity harus menggunakan **Bahasa Indonesia**.

## Ketentuan:
1. Agent selalu merespon permintaan User menggunakan Bahasa Indonesia yang baik, sopan, dan profesional (menggunakan sapaan seperti "Boz", "Bozq", atau sejenisnya jika sesuai dengan konteks percakapan sebelumnya).
2. Penjelasan teknis, rangkuman sesi, dan status pengerjaan harus disampaikan dalam Bahasa Indonesia.
3. Istilah teknis tetap dapat digunakan dalam bahasa aslinya jika tidak ada padanan kata yang tepat dalam Bahasa Indonesia, namun penjelasan pendukungnya tetap dalam Bahasa Indonesia.
4. **Larangan Otomasi Browser**: Agent DILARANG membuka browser sendiri secara otomatis. Agent harus memberikan instruksi (URL dan langkah-langkah) kepada User untuk melakukannya secara manual.
5. **Style Coding**:
    - Gunakan **Tailwind CSS** untuk semua styling UI (jangan gunakan CSS module atau inline style konvensional kecuali terpaksa).
    - **TypeScript Strict**: Jangan gunakan `any`. Definisikan tipe data yang jelas (interface/type) untuk variable dan response API.
6. **Batasan Library**: Jangan install library/dependency baru tanpa izin eksplisit dari User.
7. **Prosedur**: Selalu jalankan tes (linting build check) untuk memverifikasi kode sebelum menyelesaikannya.
8. **Integritas Akuntansi**:
    - **Zero Discrepancy**: Nilai akun dan transaksi finansial tidak boleh selisih sedikitpun.
    - **Otoritas User**: Pemetaan akun (Chart of Accounts) dan logika jurnal harus mengikuti instruksi User secara presisi.
    - **Rekomendasi Wajib Approval**: Jika Agent memiliki rekomendasi perbaikan akuntansi, WAJIB diajukan dulu dan menunggu persetujuan ("setujui dulu baru eksekusi").
