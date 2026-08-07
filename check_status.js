const { Client } = require('pg');

async function checkStatus() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/management_system'
    });
    
    try {
        await client.connect();
        const res = await client.query('SELECT status, COUNT(*) FROM assets GROUP BY status ORDER BY count DESC;');
        console.log("Current Statuses in DB:");
        console.table(res.rows);
    } catch (err) {
        console.error('Error connecting to DB:', err.message);
    } finally {
        await client.end();
    }
}

checkStatus();
