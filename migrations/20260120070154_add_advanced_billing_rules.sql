-- Add Fuel & Tiered Pricing to rental_rates
ALTER TABLE rental_rates
ADD COLUMN fuel_surcharge_rate DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN tier_config JSONB DEFAULT NULL;

-- Add Mob/Demob & Fuel Flag to rental_items
ALTER TABLE rental_items
ADD COLUMN mob_demob_cost DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN is_fuel_included BOOLEAN DEFAULT FALSE;
