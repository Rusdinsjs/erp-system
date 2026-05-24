const fs = require('fs');

const BASE_URL = 'http://localhost:8080/api';

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Login failed for ${email}: ${await res.text()}`);
    const data = await res.json();
    console.log(`[LOGIN] ${email} (Role: ${data.user.role})`);
    return { token: data.token, user: data.user };
}

async function fetchAssets(token) {
    const res = await fetch(`${BASE_URL}/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch assets");
    return (await res.json()).data;
}

async function getOrCreateClient(token) {
    // List clients
    let res = await fetch(`${BASE_URL}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    let data = await res.json();
    if (data.length > 0) return data[0];

    // Create client
    res = await fetch(`${BASE_URL}/clients`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: "PT Mitra Tambang Sentosa",
            company_name: "PT MTS",
            email: "contact@mts.co.id",
            phone: "08123456789",
            address: "Kawasan Industri Kendal",
            is_active: true
        })
    });
    if (!res.ok) throw new Error(`Failed to create client: ${await res.text()}`);
    console.log(`[CLIENT] Created new client.`);
    data = await res.json();
    return data.data; // Depending on wrapper
}

async function createRentalRate(token, assetId) {
    const rateReq = {
        name: "Sewa Harian Alat Berat",
        asset_id: assetId,
        rate_type: "daily",
        rate_amount: "1500000.00",
        currency: "IDR",
        rate_basis: "daily",
        hours_per_day: "8.0",
        minimum_duration: 1,
        overtime_multiplier: "1.5",
        deposit_percentage: "10.0"
    };
    const res = await fetch(`${BASE_URL}/rental-rates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rateReq)
    });
    if (!res.ok) throw new Error(`Failed to create rate: ${await res.text()}`);
    console.log(`[RATE] Created rental rate.`);
    return (await res.json()).data;
}

async function createRental(token, clientId, assetId, rateId) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    
    const rentalReq = {
        client_id: clientId,
        start_date: startDate,
        expected_end_date: endDate,
        items: [{
            asset_id: assetId,
            rental_rate_id: rateId,
            rate_amount: "1500000.00",
            rate_basis: "daily"
        }]
    };

    const res = await fetch(`${BASE_URL}/rentals`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rentalReq)
    });

    if (!res.ok) throw new Error(`Failed to create rental: ${await res.text()}`);
    const data = await res.json();
    console.log(`[RENTAL] Created rental request: ${data.data.rental_number}`);
    return data.data;
}

async function approveRental(token, rentalId) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/rentals/${rentalId}/approve`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ start_date: startDate, expected_end_date: endDate, deposit_amount: "150000.00" })
    });
    if (!res.ok) throw new Error(`Failed to approve rental: ${await res.text()}`);
    console.log(`[RENTAL APPROVE] Manager approved rental.`);
    return (await res.json()).data;
}

async function dispatchRental(token, rentalId, rentalItemId) {
    const res = await fetch(`${BASE_URL}/rentals/${rentalId}/dispatch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            rental_item_id: rentalItemId,
            condition_rating: "good",
            condition_notes: "Semua sistem hidrolik normal"
        })
    });
    if (!res.ok) throw new Error(`Failed to dispatch rental: ${await res.text()}`);
    console.log(`[RENTAL DISPATCH] Asset dispatched to client.`);
    return (await res.json()).data;
}

async function getAsset(token, assetId) {
    const res = await fetch(`${BASE_URL}/assets/${assetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data;
}

async function createBilling(token, rentalId) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/rentals/${rentalId}/billing`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ start_date: startDate, end_date: endDate })
    });
    if (!res.ok) throw new Error(`Failed to create billing: ${await res.text()}`);
    console.log(`[BILLING] Generated rental billing.`);
    const data = await res.json();
    return data; // Returns an array of RentalBillingPeriod
}

async function createTimesheet(token, rentalId, rentalItemId) {
    const workDate = new Date().toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/rentals/timesheets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            rental_id: rentalId,
            rental_item_id: rentalItemId,
            work_date: workDate,
            operating_hours: 8.0,
            operation_status: "operating"
        })
    });
    if (!res.ok) throw new Error(`Failed to create timesheet: ${await res.text()}`);
    console.log(`[TIMESHEET] Created timesheet for 8 operating hours.`);
    return await res.json();
}

async function returnRental(token, rentalId, rentalItemId) {
    const res = await fetch(`${BASE_URL}/rentals/${rentalId}/return`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            rental_item_id: rentalItemId,
            return_date: new Date().toISOString().split('T')[0],
            meter_reading: 1050.5,
            condition_rating: "Good",
            has_damage: false
        })
    });
    if (!res.ok) throw new Error(`Failed to return rental: ${await res.text()}`);
    console.log(`[RENTAL RETURN] Asset returned from client.`);
    return await res.json();
}

async function getSalesInvoices(token) {
    const res = await fetch(`${BASE_URL}/finance/sales/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch sales invoices: ${await res.text()}`);
    const parsed = await res.json();
    return parsed.data || parsed;
}

async function run() {
    try {
        console.log("=== STARTING RENTAL-OUT SIMULATION ===");
        const adminAuth = await login("berat@sjs.com", "admin123");
        const managerAuth = await login("manager@sjs.com", "admin123");

        const client = await getOrCreateClient(adminAuth.token);
        // Sometimes wrapped in data, sometimes not depending on API response.
        const clientId = client.id || client.data?.id; 
        console.log(`[CLIENT] Selected Client ID: ${clientId}`);

        const allAssets = await fetchAssets(adminAuth.token);
        const assets = allAssets.filter(a => a.department === "ALAT_BERAT" && a.status === "in_inventory");
        if (assets.length === 0) {
            console.error("No available Heavy Equipment found!");
            return;
        }
        const asset = assets[0];
        console.log(`[ASSET] Selected Asset: ${asset.name}`);

        const rate = await createRentalRate(adminAuth.token, asset.id);
        const rental = await createRental(adminAuth.token, clientId, asset.id, rate.id);
        await approveRental(managerAuth.token, rental.id);
        
        // Wait, rental object might need to be fetched again to get items, but createRental returns rental with items
        const rentalItemId = rental.items[0].id;
        
        await dispatchRental(adminAuth.token, rental.id, rentalItemId);

        // Wait a bit just in case async dispatch events take time
        await new Promise(r => setTimeout(r, 1000));

        // 6. Submit Timesheet (Fixes the missing data for billing issue)
        await createTimesheet(managerAuth.token, rental.id, rentalItemId);

        // 7. Generate Billing (triggers Finance Sales Invoice)
        const billings = await createBilling(managerAuth.token, rental.id);
        if (billings.length > 0) {
            console.log(`[VERIFY] Created billing with invoice number: ${billings[0].invoice_number}`);
            
            // Wait a moment for async event processing if necessary
            await new Promise(r => setTimeout(r, 1000));

            // 8. Verify Finance Reconciliation
            const invoices = await getSalesInvoices(managerAuth.token);
            const rentalInvoice = invoices.find(inv => inv.invoice_number === billings[0].invoice_number);
            
            if (rentalInvoice) {
                console.log(`[FINANCE RECONCILIATION] SUCCESS - Found Sales Invoice: ${rentalInvoice.invoice_number}`);
                console.log(`[FINANCE RECONCILIATION] Total Amount: ${rentalInvoice.total_amount}`);
            } else {
                console.warn(`[FINANCE RECONCILIATION] FAILED - Sales Invoice not found for ${billings[0].invoice_number}!`);
            }
        } else {
            console.warn("[BILLING] No billings generated!");
        }

        // 9. Return Handover (Complete the lifecycle)
        await returnRental(adminAuth.token, rental.id, rentalItemId);
        const returnedAsset = await getAsset(adminAuth.token, asset.id);
        console.log(`[VERIFY] Asset status after return: ${returnedAsset.status}`);

        console.log("=== RENTAL-OUT SIMULATION SUCCESS ===");
    } catch (e) {
        console.error("ERROR:", e);
    }
}
run();
