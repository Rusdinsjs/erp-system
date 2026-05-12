ALTER TABLE rental_billing_periods
ADD COLUMN total_fuel_consumed DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN fuel_surcharge_rate DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN fuel_surcharge_amount DECIMAL(10, 2) DEFAULT 0;
