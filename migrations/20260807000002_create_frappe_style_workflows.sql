-- Frappe / ERPNext Style Workflow Engine Migration for ERPQu 1.0

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(100) NOT NULL UNIQUE,
    doctype_id UUID NOT NULL REFERENCES doctypes(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    document_status_field VARCHAR(100) NOT NULL DEFAULT 'workflow_state',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    state_name VARCHAR(100) NOT NULL,
    doc_status INT NOT NULL DEFAULT 0, -- 0: Draft, 1: Submitted, 2: Cancelled
    allow_edit_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    style_variant VARCHAR(50) NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_state_name UNIQUE(workflow_id, state_name)
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    action_name VARCHAR(100) NOT NULL,
    next_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    allowed_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_transition UNIQUE(workflow_id, state_id, action_name)
);

CREATE TABLE IF NOT EXISTS workflow_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    action_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_state VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    to_state VARCHAR(100) NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Standard WorkOrder & PurchaseOrder Workflows
DO $$
DECLARE
    v_wo_dt_id UUID;
    v_po_dt_id UUID;
    v_wf_wo_id UUID;
    v_wf_po_id UUID;
    v_s_draft UUID;
    v_s_pending UUID;
    v_s_approved UUID;
    v_s_rejected UUID;
    v_admin_role_id UUID;
    v_mgr_role_id UUID;
    v_tech_role_id UUID;
BEGIN
    SELECT id INTO v_wo_dt_id FROM doctypes WHERE name = 'WorkOrder' LIMIT 1;
    SELECT id INTO v_po_dt_id FROM doctypes WHERE name = 'PurchaseOrder' LIMIT 1;

    SELECT id INTO v_admin_role_id FROM roles WHERE code IN ('admin', 'super_admin') LIMIT 1;
    SELECT id INTO v_mgr_role_id FROM roles WHERE code IN ('manager', 'asset_manager', 'hr_manager') LIMIT 1;
    SELECT id INTO v_tech_role_id FROM roles WHERE code IN ('technician', 'employee', 'staff') LIMIT 1;

    IF v_wo_dt_id IS NOT NULL THEN
        INSERT INTO workflows (workflow_name, doctype_id, is_active, document_status_field)
        VALUES ('WorkOrder Approval Workflow', v_wo_dt_id, TRUE, 'workflow_state')
        ON CONFLICT (workflow_name) DO UPDATE SET updated_at = NOW()
        RETURNING id INTO v_wf_wo_id;

        IF v_wf_wo_id IS NOT NULL THEN
            INSERT INTO workflow_states (workflow_id, state_name, doc_status, style_variant)
            VALUES 
                (v_wf_wo_id, 'Draft', 0, 'secondary'),
                (v_wf_wo_id, 'Pending Supervisor', 0, 'warning'),
                (v_wf_wo_id, 'Approved', 1, 'success'),
                (v_wf_wo_id, 'Rejected', 2, 'danger')
            ON CONFLICT ON CONSTRAINT uq_workflow_state_name DO NOTHING;

            SELECT id INTO v_s_draft FROM workflow_states WHERE workflow_id = v_wf_wo_id AND state_name = 'Draft';
            SELECT id INTO v_s_pending FROM workflow_states WHERE workflow_id = v_wf_wo_id AND state_name = 'Pending Supervisor';
            SELECT id INTO v_s_approved FROM workflow_states WHERE workflow_id = v_wf_wo_id AND state_name = 'Approved';
            SELECT id INTO v_s_rejected FROM workflow_states WHERE workflow_id = v_wf_wo_id AND state_name = 'Rejected';

            IF v_s_draft IS NOT NULL AND v_s_pending IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
                INSERT INTO workflow_transitions (workflow_id, state_id, action_name, next_state_id, allowed_role_id)
                VALUES 
                    (v_wf_wo_id, v_s_draft, 'Submit for Approval', v_s_pending, v_admin_role_id),
                    (v_wf_wo_id, v_s_pending, 'Approve WorkOrder', v_s_approved, v_admin_role_id),
                    (v_wf_wo_id, v_s_pending, 'Reject WorkOrder', v_s_rejected, v_admin_role_id)
                ON CONFLICT ON CONSTRAINT uq_workflow_transition DO NOTHING;
            END IF;
        END IF;
    END IF;
END $$;
