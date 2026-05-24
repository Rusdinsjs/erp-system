const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/api';

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
        throw new Error(`Login failed for ${email}: ${await res.text()}`);
    }
    const data = await res.json();
    console.log(`[LOGIN] Logged in successfully as ${email} (Role: ${data.user.role})`);
    return { token: data.token, user: data.user };
}

async function fetchAssets(token) {
    const res = await fetch(`${BASE_URL}/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch assets");
    const data = await res.json();
    return data.data; // Array of assets
}

async function createLoan(token, assetId, borrowerId) {
    const loanReq = {
        asset_id: assetId,
        borrower_id: borrowerId,
        loan_date: new Date().toISOString().split('T')[0],
        expected_return_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        deposit_amount: null
    };

    const res = await fetch(`${BASE_URL}/loans`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(loanReq)
    });

    if (!res.ok) throw new Error(`Failed to create loan: ${await res.text()}`);
    const data = await res.json();
    console.log(`[LOAN REQUEST] Created loan: ${data.data.loan_number}`);
    return data.data;
}

async function approveLoan(token, loanId) {
    const res = await fetch(`${BASE_URL}/loans/${loanId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to approve loan: ${await res.text()}`);
    const data = await res.json();
    console.log(`[LOAN APPROVE] Loan approved by Manager/SPV. Status: ${data.data.status}`);
    return data.data;
}

async function checkoutLoan(token, loanId) {
    const res = await fetch(`${BASE_URL}/loans/${loanId}/checkout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ condition: "Good working condition", photos: [] })
    });
    if (!res.ok) throw new Error(`Failed to checkout loan: ${await res.text()}`);
    const data = await res.json();
    console.log(`[LOAN CHECKOUT] Handover completed. Status: ${data.data.status}`);
    return data.data;
}

async function checkinLoan(token, loanId) {
    const res = await fetch(`${BASE_URL}/loans/${loanId}/checkin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ condition: "Normal wear and tear", photos: [] })
    });
    if (!res.ok) throw new Error(`Failed to checkin loan: ${await res.text()}`);
    const data = await res.json();
    console.log(`[LOAN CHECKIN] Asset returned. Status: ${data.data.status}`);
    return data.data;
}

async function getAsset(token, assetId) {
    const res = await fetch(`${BASE_URL}/assets/${assetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to get asset");
    return (await res.json()).data;
}

async function run() {
    try {
        console.log("=== STARTING LOAN WORKFLOW SIMULATION ===");

        // 1. Login as Admin Alat Berat (Borrower / Creator)
        const adminAuth = await login("berat@sjs.com", "admin123");
        
        // 2. Login as Manager (Approver)
        const managerAuth = await login("manager@sjs.com", "admin123");

        // 3. Find an available Heavy Equipment
        const allAssets = await fetchAssets(adminAuth.token);
        const assets = allAssets.filter(a => a.department === "ALAT_BERAT" && a.status === "in_inventory");
        console.log(`[ASSET] Found ${allAssets.length} total assets, ${assets.length} Heavy Equipment InInventory`);
        if (assets.length === 0) {
            console.error("No available Heavy Equipment found!");
            return;
        }
        const asset = assets[0];
        console.log(`[ASSET] Selected Asset: ${asset.name} (Status: ${asset.status})`);

        // 4. Create Loan
        const loan = await createLoan(adminAuth.token, asset.id, adminAuth.user.id);

        // 5. Manager Approves Loan
        await approveLoan(managerAuth.token, loan.id);

        // 6. Admin checks out the asset (Handover to user)
        await checkoutLoan(adminAuth.token, loan.id);

        // Verify Asset Status
        let checkedOutAsset = await getAsset(adminAuth.token, asset.id);
        console.log(`[VERIFY] Asset status after checkout: ${checkedOutAsset.status}`);

        // 7. Admin returns the asset (Checkin)
        await checkinLoan(adminAuth.token, loan.id);

        // Verify Asset Status
        let returnedAsset = await getAsset(adminAuth.token, asset.id);
        console.log(`[VERIFY] Asset status after return: ${returnedAsset.status}`);

        console.log("=== LOAN WORKFLOW SIMULATION SUCCESS ===");
    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
