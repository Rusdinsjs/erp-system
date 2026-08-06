-- Migration 20260806000019: Phase 12 Operational ERP Expansion (CRM, Project, HR, Rental, Support)

-- 1. CRM Workstream (QCRM-001..003)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    lead_name VARCHAR(150) NOT NULL,
    organization_name VARCHAR(150),
    email VARCHAR(100),
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'LEAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    lead_id UUID REFERENCES leads(id),
    title VARCHAR(200) NOT NULL,
    estimated_value NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    stage VARCHAR(50) NOT NULL DEFAULT 'PROSPECTING', -- PROSPECTING, QUALIFICATION, PROPOSAL, WON, LOST
    expected_closing_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Project Workstream (QPRJ-001..003)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    project_code VARCHAR(50) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    cost_center_id UUID REFERENCES cost_centers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    budget_amount NUMERIC(20,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_name VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    estimated_hours NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_task_id UUID NOT NULL REFERENCES project_tasks(id),
    employee_id UUID NOT NULL,
    work_date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HR & Payroll Workstream (QHR-001..005)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    department_id UUID REFERENCES departments(id),
    user_id UUID REFERENCES users(id),
    joining_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_salary NUMERIC(20,4) NOT NULL,
    total_deductions NUMERIC(20,4) NOT NULL,
    net_salary NUMERIC(20,4) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Contract & Rental Workstream (QCTR-001, QRNT-001)
CREATE TABLE IF NOT EXISTS commercial_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    contract_number VARCHAR(100) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES commercial_contracts(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    monthly_rate NUMERIC(20,4) NOT NULL,
    billing_frequency VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Support Workstream (QSUP-001)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    ticket_number VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    asset_id UUID REFERENCES assets(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
