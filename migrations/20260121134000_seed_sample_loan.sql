-- Migration: Seed Sample Internal Loan
-- Description: Creates 1 active loan for Toyota Avanza (OPS-003) to 'user@example.com'
-- Created: 2026-01-21

DO $$
DECLARE
    v_asset_id UUID;
    v_user_id UUID;
    v_loan_id UUID := gen_random_uuid();
BEGIN
    -- 1. Find the Asset (Toyota Avanza)
    SELECT id INTO v_asset_id FROM assets WHERE asset_code = 'OPS-003' LIMIT 1;
    
    -- 2. Find the Borrower (user@example.com)
    -- This user was seeded in 011_seed_data.sql
    SELECT id INTO v_user_id FROM users WHERE email = 'user@example.com' LIMIT 1;

    -- Safety check
    IF v_asset_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        
        -- 3. Create Loan Record
        INSERT INTO asset_loans (
            id,
            loan_number,
            asset_id,
            borrower_id,
            loan_date,
            expected_return_date,
            status,
            terms_accepted
        ) VALUES (
            v_loan_id,
            'LOAN-DEMO-001',
            v_asset_id,
            v_user_id,
            CURRENT_DATE,                 -- Borrowed today
            CURRENT_DATE + INTERVAL '7 days', -- Return in 7 days
            'in_use',                     -- Status: Currently active
            true                          -- Terms accepted
        );

        -- 4. Update Asset Status to 'in_use'
        UPDATE assets SET status = 'in_use' WHERE id = v_asset_id;

    END IF;
END $$;
