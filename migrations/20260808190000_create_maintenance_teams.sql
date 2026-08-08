-- Migration: 20260808190000_create_maintenance_teams.sql
-- Description: Create Maintenance Teams and Maintenance Team Members tables (ERPNext style)

-- 1. Create maintenance_teams table
CREATE TABLE IF NOT EXISTS public.maintenance_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code VARCHAR(50) NOT NULL UNIQUE,
    team_name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    manager_id UUID, -- References users(id) or employees(id)
    manager_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_teams_company_id ON public.maintenance_teams(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_teams_status ON public.maintenance_teams(status);

-- 2. Create maintenance_team_members table
CREATE TABLE IF NOT EXISTS public.maintenance_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.maintenance_teams(id) ON DELETE CASCADE,
    user_id UUID, -- References users(id)
    employee_id UUID, -- References employees(id)
    member_name VARCHAR(255) NOT NULL,
    role_in_team VARCHAR(100) NOT NULL DEFAULT 'Technician', -- Lead, Senior Mechanic, Electrician, Technician, Helper
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_team_members_team_id ON public.maintenance_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_team_members_user_id ON public.maintenance_team_members(user_id);

-- 3. Add maintenance_team_id column to maintenance_work_orders if not exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_work_orders') THEN
        ALTER TABLE public.maintenance_work_orders ADD COLUMN IF NOT EXISTS maintenance_team_id UUID REFERENCES public.maintenance_teams(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_work_orders_maintenance_team_id ON public.maintenance_work_orders(maintenance_team_id);
    END IF;
END $$;

-- 4. Seed default Maintenance Teams
INSERT INTO public.maintenance_teams (id, team_code, team_name, manager_name, status, description)
SELECT 
    't0000000-0000-0000-0000-000000000001'::uuid,
    'MT-HEAVY-01',
    'Tim Pemeliharaan Alat Berat & Excavator',
    'Budi Santoso',
    'ACTIVE',
    'Tim spesialis perbaikan dan overhaul mesin hidrolik alat berat, excavator, dan bulldozer.'
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_teams WHERE team_code = 'MT-HEAVY-01');

INSERT INTO public.maintenance_teams (id, team_code, team_name, manager_name, status, description)
SELECT 
    't0000000-0000-0000-0000-000000000002'::uuid,
    'MT-ELEC-01',
    'Tim Mekanikal & Elektrikal (M&E)',
    'Ahmad Hidayat',
    'ACTIVE',
    'Tim penanganan sistem kelistrikan, kontrol sensor, genset, dan panel daya unit kendaraan.'
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_teams WHERE team_code = 'MT-ELEC-01');

INSERT INTO public.maintenance_teams (id, team_code, team_name, manager_name, status, description)
SELECT 
    't0000000-0000-0000-0000-000000000003'::uuid,
    'MT-FLEET-01',
    'Tim Service Truk & Armada Lube Truck',
    'Rahmat Hidayat',
    'ACTIVE',
    'Tim perawatan rutin pelumasan, ganti oli, ban, dan rem armada truk dump & trailer.'
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_teams WHERE team_code = 'MT-FLEET-01');

-- Seed sample team members
INSERT INTO public.maintenance_team_members (team_id, member_name, role_in_team, is_active)
SELECT 't0000000-0000-0000-0000-000000000001'::uuid, 'Budi Santoso', 'Lead Specialist', true
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_team_members WHERE member_name = 'Budi Santoso');

INSERT INTO public.maintenance_team_members (team_id, member_name, role_in_team, is_active)
SELECT 't0000000-0000-0000-0000-000000000001'::uuid, 'Dedi Kurniawan', 'Senior Hydraulic Mechanic', true
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_team_members WHERE member_name = 'Dedi Kurniawan');

INSERT INTO public.maintenance_team_members (team_id, member_name, role_in_team, is_active)
SELECT 't0000000-0000-0000-0000-000000000002'::uuid, 'Ahmad Hidayat', 'Electrical Lead', true
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_team_members WHERE member_name = 'Ahmad Hidayat');

INSERT INTO public.maintenance_team_members (team_id, member_name, role_in_team, is_active)
SELECT 't0000000-0000-0000-0000-000000000002'::uuid, 'Rudi Hermawan', 'Auto Electrician', true
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_team_members WHERE member_name = 'Rudi Hermawan');

INSERT INTO public.maintenance_team_members (team_id, member_name, role_in_team, is_active)
SELECT 't0000000-0000-0000-0000-000000000003'::uuid, 'Rahmat Hidayat', 'Fleet Lube Manager', true
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_team_members WHERE member_name = 'Rahmat Hidayat');
