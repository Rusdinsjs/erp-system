const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5434/management_system'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query('SELECT asset_code, name, status, organization_id FROM assets ORDER BY created_at DESC LIMIT 20');

        console.log('Found ' + res.rows.length + ' assets:');
        res.rows.forEach(r => {
            console.log(`- [${r.asset_code}] ${r.name} (${r.status})`);
        });

        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
