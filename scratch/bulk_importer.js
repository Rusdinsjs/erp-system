// Bulk Importer Script (CSV -> JSON -> API)
// Jalankan dengan: bun scratch/bulk_importer.js <email> <password> <file.csv>

const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Login gagal: ${res.statusText}`);
    const data = await res.json();
    return data.token;
}

async function getCategories(token) {
    const res = await fetch(`${BASE_URL}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Gagal mengambil kategori: ${res.statusText}`);
    const data = await res.json();
    
    // Buat map: code -> id
    const map = {};
    for (const cat of data.data) {
        map[cat.code] = cat.id;
    }
    return map;
}

function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error('File CSV kosong atau tidak memiliki data.');

    const headers = lines[0].split(',');
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index] || null;
        });
        results.push(row);
    }
    return results;
}

async function importAssets() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Gunakan: bun scratch/bulk_importer.js <email> <password> <file.csv>');
        console.log('Contoh : bun scratch/bulk_importer.js berat@sjs.com admin123 scratch/template_bulk_import_aset.csv');
        process.exit(1);
    }

    const email = args[0];
    const password = args[1];
    const csvPath = args[2];

    try {
        console.log(`🔑 Login sebagai ${email}...`);
        const token = await login(email, password);
        console.log(`✅ Berhasil login!`);

        console.log(`📥 Mengambil referensi Kategori dari server...`);
        const categoryMap = await getCategories(token);
        console.log(`✅ Ditemukan ${Object.keys(categoryMap).length} kategori yang diizinkan untuk user ini.`);

        console.log(`📄 Membaca file ${csvPath}...`);
        const csvData = parseCSV(csvPath);
        console.log(`✅ Berhasil membaca ${csvData.length} baris data.`);

        // Transformasi ke format CreateAssetRequest
        const payloadAssets = [];
        for (const row of csvData) {
            const catId = categoryMap[row.category_code];
            if (!catId) {
                console.warn(`⚠️ Kategori '${row.category_code}' tidak valid atau Anda tidak punya akses ke kategori ini. Baris dilewati.`);
                continue;
            }

            payloadAssets.push({
                asset_code: row.asset_code,
                name: row.name,
                category_id: catId,
                brand: row.brand || undefined,
                model: row.model || undefined,
                status: row.status || 'draft',
                notes: row.notes || undefined
            });
        }

        if (payloadAssets.length === 0) {
            console.log('❌ Tidak ada data yang valid untuk diimport.');
            return;
        }

        console.log(`🚀 Mengirim ${payloadAssets.length} data ke server via Bulk Import API...`);
        const resBulk = await fetch(`${BASE_URL}/api/assets/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ assets: payloadAssets })
        });

        const textRes = await resBulk.text();
        if (!resBulk.ok) {
            throw new Error(`Gagal Import: ${textRes}`);
        }

        const jsonRes = JSON.parse(textRes);
        console.log(`🎉 SUKSES! ${jsonRes.data} aset berhasil di-import/diajukan sebagai request!`);
        
    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
    }
}

importAssets();
