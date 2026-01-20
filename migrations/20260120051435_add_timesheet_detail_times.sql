ALTER TABLE rental_timesheets
ADD COLUMN standby_start_time TIME,
ADD COLUMN standby_end_time TIME,
ADD COLUMN breakdown_start_time TIME,
ADD COLUMN breakdown_end_time TIME;
