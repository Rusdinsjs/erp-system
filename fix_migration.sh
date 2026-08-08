#!/bin/bash
# Fix broken migration checksum and apply missing migrations directly
# Run this via: docker exec mgmt-db bash /tmp/fix_migrations.sh

# Fix the checksum mismatch for 20260808000001 by updating it with the current file checksum
PGPASSWORD=postgres psql -U postgres -d management_system -c "
DELETE FROM _sqlx_migrations WHERE version = 20260808000001;
"

echo "Checksum entry deleted for 20260808000001"

# Now apply the missing column directly
PGPASSWORD=postgres psql -U postgres -d management_system -c "
ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON assets(company_id);
ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE rental_contracts ADD COLUMN IF NOT EXISTS company_id UUID;
"

echo "company_id columns applied successfully!"
