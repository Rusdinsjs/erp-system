-- Migration: 20260808000001_separate_logical_schemas
-- Description: Creates schemas for HR, CRM, Rental, Inventory, Commercial and moves tables safely.
-- Created: 2026-08-08

-- 1. Create Schemas
CREATE SCHEMA IF NOT EXISTS hr;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS rental;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS commercial;

-- 2. Move HR Tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employees') THEN
        ALTER TABLE public.employees SET SCHEMA hr;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'attendance_records') THEN
        ALTER TABLE public.attendance_records SET SCHEMA hr;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'face_photos') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'face_photos') THEN
        ALTER TABLE public.face_photos SET SCHEMA hr;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_experiences') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'work_experiences') THEN
        ALTER TABLE public.work_experiences SET SCHEMA hr;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_evaluations') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'employee_evaluations') THEN
        ALTER TABLE public.employee_evaluations SET SCHEMA hr;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'hr' AND table_name = 'leave_requests') THEN
        ALTER TABLE public.leave_requests SET SCHEMA hr;
    END IF;
END $$;

-- 3. Move CRM Tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'vendors') THEN
        ALTER TABLE public.vendors SET SCHEMA crm;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'clients') THEN
        ALTER TABLE public.clients SET SCHEMA crm;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'companies') THEN
        ALTER TABLE public.companies SET SCHEMA crm;
    END IF;
END $$;

-- 4. Move Rental Tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rentals') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'rentals') THEN
        ALTER TABLE public.rentals SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_contracts') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'rental_contracts') THEN
        ALTER TABLE public.rental_contracts SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_billings') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'rental_billings') THEN
        ALTER TABLE public.rental_billings SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rental_timesheets') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'rental_timesheets') THEN
        ALTER TABLE public.rental_timesheets SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_approvals') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'contract_approvals') THEN
        ALTER TABLE public.contract_approvals SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_documents') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'contract_documents') THEN
        ALTER TABLE public.contract_documents SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_renewals') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'contract_renewals') THEN
        ALTER TABLE public.contract_renewals SET SCHEMA rental;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_templates') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rental' AND table_name = 'contract_templates') THEN
        ALTER TABLE public.contract_templates SET SCHEMA rental;
    END IF;
END $$;

-- 5. Move Inventory Tables
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_categories') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'inventory_categories') THEN
        ALTER TABLE public.inventory_categories SET SCHEMA inventory;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_items') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'inventory_items') THEN
        ALTER TABLE public.inventory_items SET SCHEMA inventory;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_movements') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'inventory_movements') THEN
        ALTER TABLE public.inventory_movements SET SCHEMA inventory;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_documents') AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'inventory' AND table_name = 'inventory_documents') THEN
        ALTER TABLE public.inventory_documents SET SCHEMA inventory;
    END IF;
END $$;
