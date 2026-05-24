const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: 'postgres://postgres:postgres@localhost:5434/management_system'
    });
    await client.connect();
    
    // First, find the category for ALAT_BERAT
    const catRes = await client.query(`SELECT id FROM categories WHERE asset_group = 'ALAT_BERAT' LIMIT 1`);
    if (catRes.rows.length > 0) {
        const catId = catRes.rows[0].id;
        console.log("Found ALAT_BERAT category:", catId);
        
        await client.query(`
            UPDATE assets 
            SET department = 'ALAT_BERAT', status = 'in_inventory', category_id = $1
            WHERE name ILIKE '%Excavator%'
        `, [catId]);
        console.log("Updated assets.");
    }
    
    const res = await client.query(`SELECT name, department, status FROM assets WHERE department = 'ALAT_BERAT'`);
    console.table(res.rows);
    
    await client.end();
}
run();
