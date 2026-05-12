const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5434/management_system'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query("SELECT id, email, password_hash, role FROM users WHERE email = 'admin@example.com'");

        if (res.rows.length === 0) {
            console.log('User admin@example.com NOT FOUND');
        } else {
            const user = res.rows[0];
            console.log('User Found:');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Hash:', user.password_hash);
        }

        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
