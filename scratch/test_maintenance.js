const BASE_URL = 'http://localhost:8080/api';

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Login failed for ${email}`);
    return await res.json();
}

async function getAssets(token) {
    const res = await fetch(`${BASE_URL}/assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch assets`);
    return await res.json();
}

async function createWorkOrder(token, assetId) {
    const res = await fetch(`${BASE_URL}/work-orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            asset_id: assetId,
            title: "Routine Maintenance",
            description: "Check engine and replace oil",
            priority: "medium",
            wo_type: "preventive",
            expected_start_date: new Date().toISOString().split('T')[0]
        })
    });
    if (!res.ok) throw new Error(`Failed to create work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Created new work order.`);
    return await res.json();
}

async function assignWorkOrder(token, woId, assigneeId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/assign/${assigneeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
    });
    if (!res.ok) throw new Error(`Failed to assign work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Assigned work order.`);
}

async function approveWorkOrder(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: "Approved for execution" })
    });
    if (!res.ok) throw new Error(`Failed to approve work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Approved work order.`);
}

async function startWorkOrder(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error(`Failed to start work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Started work order execution.`);
}

async function addWorkOrderTask(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            task_number: 1,
            description: "Drain old oil and fill with new"
        })
    });
    if (!res.ok) throw new Error(`Failed to add task: ${await res.text()}`);
    console.log(`[WORK ORDER] Added task with labor cost.`);
    return await res.json();
}

async function completeWorkOrder(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ work_performed: "Task completed successfully" })
    });
    if (!res.ok) throw new Error(`Failed to complete work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Completed work order.`);
}

async function verifyWorkOrder(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ labor_cost: "100000.00" })
    });
    if (!res.ok) throw new Error(`Failed to verify work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Verified work order with labor cost.`);
}

async function finalizeWorkOrder(token, woId) {
    const res = await fetch(`${BASE_URL}/work-orders/${woId}/finalize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ labor_expense_type: "OPEX" })
    });
    if (!res.ok) throw new Error(`Failed to finalize work order: ${await res.text()}`);
    console.log(`[WORK ORDER] Finalized work order.`);
}

async function getJournals(token) {
    const res = await fetch(`${BASE_URL}/finance/journals`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch journals: ${await res.text()}`);
    const parsed = await res.json();
    return parsed.data || parsed;
}

async function run() {
    try {
        console.log("=== STARTING MAINTENANCE & WORK ORDER SIMULATION ===");

        // 1. Authenticate roles
        const adminAuth = await login('berat@sjs.com', 'admin123');
        console.log("[LOGIN] berat@sjs.com (Role: admin_alat_berat)");

        const managerAuth = await login('manager@sjs.com', 'admin123');
        console.log("[LOGIN] manager@sjs.com (Role: manager)");

        // 2. Fetch Assets and select one
        const assetsObj = await getAssets(adminAuth.token);
        const assets = assetsObj.data || assetsObj;
        
        let asset = assets.find(a => a.status === 'in_inventory' || a.status === 'InInventory');
        if (!asset) {
            console.warn("No available asset found for maintenance!");
            return;
        }
        console.log(`[ASSET] Selected Asset: ${asset.name}`);

        // 3. Create Work Order
        const woRes = await createWorkOrder(managerAuth.token, asset.id);
        const wo = woRes.data || woRes;
        
        // 4. Approve & Assign & Start
        await approveWorkOrder(managerAuth.token, wo.id);
        await assignWorkOrder(managerAuth.token, wo.id, adminAuth.user.id);
        await startWorkOrder(adminAuth.token, wo.id);

        // 5. Add Task
        await addWorkOrderTask(managerAuth.token, wo.id);

        // 6. Complete, Verify & Finalize
        await completeWorkOrder(managerAuth.token, wo.id);
        await verifyWorkOrder(managerAuth.token, wo.id);
        await finalizeWorkOrder(managerAuth.token, wo.id);

        // Wait a bit for Event Bus to process Finance Journal
        await new Promise(r => setTimeout(r, 1000));

        // 7. Verify Finance Journal Entry
        const journals = await getJournals(managerAuth.token);
        const woJournal = journals.find(j => j.reference === wo.wo_number);
        
        if (woJournal) {
            console.log(`[FINANCE RECONCILIATION] SUCCESS - Found Journal Entry for WO: ${wo.wo_number}`);
            console.log(`[FINANCE RECONCILIATION] Journal Description: ${woJournal.description}`);
            console.log(`[FINANCE RECONCILIATION] Total Debit: ${woJournal.total_debit}`);
        } else {
            console.warn(`[FINANCE RECONCILIATION] FAILED - Journal Entry not found for ${wo.wo_number}!`);
        }

        console.log("=== MAINTENANCE SIMULATION SUCCESS ===");
    } catch (e) {
        console.error("ERROR:", e);
    }
}

run();
