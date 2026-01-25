-- Fix inconsistent status strings
UPDATE assets SET status = 'in_inventory' WHERE status IN ('available', 'In Inventory', 'In_Inventory');
UPDATE assets SET status = 'planning' WHERE status IN ('Planning');
UPDATE assets SET status = 'procurement' WHERE status IN ('Procurement');
UPDATE assets SET status = 'received' WHERE status IN ('Received');
UPDATE assets SET status = 'deployed' WHERE status IN ('active', 'Active', 'Deployed');
UPDATE assets SET status = 'under_maintenance' WHERE status IN ('maintenance', 'Maintenance', 'under_maintenance');
UPDATE assets SET status = 'under_repair' WHERE status IN ('repair', 'Repair');
UPDATE assets SET status = 'retired' WHERE status IN ('Retired');
UPDATE assets SET status = 'disposed' WHERE status IN ('Disposed');
UPDATE assets SET status = 'lost_stolen' WHERE status IN ('lost', 'Lost', 'stolen', 'Stolen');
UPDATE assets SET status = 'archived' WHERE status IN ('Archived');

-- Fix integration test asset specific case (force to in_inventory if that matches the list view expectation)
-- Or ensure it matches the planning state if that's correct. 
-- User said: "Current status = Planning, but List = In Inventory". 
-- If list shows In Inventory, it means the LIST view logic might be defaulting unknown 'Planning' to In Inventory?
-- Or the DB actually has 'In Inventory'.
-- We'll normalize 'In Inventory' -> 'in_inventory' above.
-- If the user wants consistentcy, and the asset is logically in planning, it should show 'Planning'.
-- If the asset is logically in inventory, it should show 'In Inventory'.
-- We will update 'Planning' -> 'planning'.
