const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: 'postgres://postgres:postgres@localhost:5434/management_system'
    });
    await client.connect();
    
    const res = await client.query('SELECT name, department, status FROM assets LIMIT 5');
    console.table(res.rows);
    
    await client.end();
}
run();
