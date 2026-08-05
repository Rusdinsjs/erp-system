-- Migration: Backfill existing pending approvals from all modules into approval_requests
-- This creates unified approval_requests records for items currently pending in each module

-- ============================================
-- 1. WORK ORDERS: status = 'pending'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'work_order',
    wo.id,
    'create_work_order',
    wo.created_by,
    jsonb_build_object(
        'title', 'WO #' || wo.wo_number,
        'wo_type', wo.wo_type,
        'priority', wo.priority,
        'estimated_cost', wo.estimated_cost,
        'asset_id', wo.asset_id
    ),
    'PENDING',
    1,
    'work_order',
    jsonb_build_object('wo_id', wo.id),
    wo.created_at,
    wo.updated_at
FROM maintenance_work_orders wo
JOIN approval_workflows aw ON aw.entity_type = 'work_order' AND aw.is_active = true
WHERE wo.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'work_order' AND ar.resource_id = wo.id AND ar.status = 'PENDING'
);

-- ============================================
-- 2. LOANS: status = 'requested'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'loan',
    l.id,
    'loan_request',
    l.borrower_id,
    jsonb_build_object(
        'asset_id', l.asset_id,
        'loan_date', l.loan_date,
        'expected_return_date', l.expected_return_date,
        'loan_number', l.loan_number
    ),
    'PENDING',
    1,
    'loan',
    jsonb_build_object('loan_id', l.id),
    l.created_at,
    l.updated_at
FROM asset_loans l
JOIN approval_workflows aw ON aw.entity_type = 'loan' AND aw.is_active = true
WHERE l.status = 'requested'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'loan' AND ar.resource_id = l.id AND ar.status = 'PENDING'
);

-- ============================================
-- 3. CONTRACTS: status = 'pending_approval'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'contract',
    c.id,
    'contract_approval',
    c.created_by,
    jsonb_build_object(
        'contract_number', c.contract_number,
        'client_id', c.client_id,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'total_approval_steps', c.total_approval_steps,
        'current_approval_step', c.current_approval_step
    ),
    'PENDING',
    COALESCE(c.current_approval_step, 1),
    'contract',
    jsonb_build_object('contract_id', c.id),
    c.submitted_for_approval_at,
    c.updated_at
FROM rental_contracts c
JOIN approval_workflows aw ON aw.entity_type = 'contract' AND aw.is_active = true
WHERE c.status = 'pending_approval'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'contract' AND ar.resource_id = c.id AND ar.status = 'PENDING'
);

-- ============================================
-- 4. FUEL LOGS: status = 'requested'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'fuel_request',
    fl.id,
    'fuel_request',
    fl.requested_by,
    jsonb_build_object(
        'asset_id', fl.asset_id,
        'asset_name', fl.asset_name,
        'odometer_reading', fl.odometer_reading,
        'request_type', fl.request_type,
        'requested_value', fl.requested_value,
        'tracking_number', fl.tracking_number
    ),
    'PENDING',
    1,
    'fuel',
    jsonb_build_object('fuel_id', fl.id),
    fl.created_at,
    fl.updated_at
FROM fuel_logs fl
JOIN approval_workflows aw ON aw.entity_type = 'fuel_request' AND aw.is_active = true
WHERE fl.status = 'requested'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'fuel_request' AND ar.resource_id = fl.id AND ar.status = 'PENDING'
);

-- ============================================
-- 5. TAX RENEWALS: status = 'PENDING_APPROVAL'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'tax_renewal',
    tr.id,
    'tax_renewal',
    tr.created_by,
    jsonb_build_object(
        'asset_id', tr.asset_id,
        'asset_name', tr.asset_name,
        'license_plate', tr.license_plate,
        'document_type', tr.document_type,
        'current_expiry', tr.current_expiry,
        'renewal_cost', tr.renewal_cost
    ),
    'PENDING',
    1,
    'tax_renewal',
    jsonb_build_object('tax_renewal_id', tr.id),
    tr.created_at,
    tr.updated_at
FROM tax_renewals tr
JOIN approval_workflows aw ON aw.entity_type = 'tax_renewal' AND aw.is_active = true
WHERE tr.status = 'PENDING_APPROVAL'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'tax_renewal' AND ar.resource_id = tr.id AND ar.status = 'PENDING'
);

-- ============================================
-- 6. CONVERSIONS: status = 'pending'
-- ============================================
INSERT INTO approval_requests (
    workflow_id, required_levels, resource_type, resource_id, action_type, 
    requested_by, data_snapshot, status, current_approval_level,
    module_callback, callback_data, created_at, updated_at
)
SELECT 
    aw.id,
    aw.approval_levels,
    'conversion_request',
    ac.id,
    'conversion',
    ac.requested_by,
    jsonb_build_object(
        'asset_id', ac.asset_id,
        'title', ac.title,
        'from_category_id', ac.from_category_id,
        'to_category_id', ac.to_category_id,
        'conversion_cost', ac.conversion_cost,
        'cost_treatment', ac.cost_treatment,
        'reason', ac.reason
    ),
    'PENDING',
    1,
    'conversion',
    jsonb_build_object('conversion_id', ac.id),
    ac.created_at,
    ac.updated_at
FROM asset_conversions ac
JOIN approval_workflows aw ON aw.entity_type = 'conversion_request' AND aw.is_active = true
WHERE ac.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM approval_requests ar 
    WHERE ar.resource_type = 'conversion_request' AND ar.resource_id = ac.id AND ar.status = 'PENDING'
);

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT 'work_order' as module, count(*) FROM approval_requests WHERE resource_type='work_order' AND status='PENDING'
-- UNION ALL SELECT 'loan', count(*) FROM approval_requests WHERE resource_type='loan' AND status='PENDING'
-- UNION ALL SELECT 'contract', count(*) FROM approval_requests WHERE resource_type='contract' AND status='PENDING'
-- UNION ALL SELECT 'fuel_request', count(*) FROM approval_requests WHERE resource_type='fuel_request' AND status='PENDING'
-- UNION ALL SELECT 'tax_renewal', count(*) FROM approval_requests WHERE resource_type='tax_renewal' AND status='PENDING'
-- UNION ALL SELECT 'conversion_request', count(*) FROM approval_requests WHERE resource_type='conversion_request' AND status='PENDING';