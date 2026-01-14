-- Insert Asset
INSERT INTO assets (id, asset_code, name, category_id, status, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222', 
    'AST-MOBILE-01', 
    'Excavator CAT 320', 
    (SELECT id FROM categories WHERE name ILIKE '%Alat Berat%' LIMIT 1), 
    'rented_out', 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert Rental
INSERT INTO rentals (id, rental_number, client_id, asset_id, status, request_date, start_date, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333', 
    'RNT-MOBILE-01', 
    (SELECT id FROM clients WHERE client_code='CLT-MOBILE-01' LIMIT 1), 
    (SELECT id FROM assets WHERE asset_code='AST-MOBILE-01' LIMIT 1), 
    'rented_out', 
    NOW(), 
    NOW(), 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO NOTHING;
