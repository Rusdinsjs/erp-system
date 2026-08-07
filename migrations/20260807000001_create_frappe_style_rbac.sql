-- Frappe / ERPNext Style RBAC Migration for ERPQu 1.0

CREATE TABLE IF NOT EXISTS doctypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    is_submittable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_docperms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctype_id UUID NOT NULL REFERENCES doctypes(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permlevel INT NOT NULL DEFAULT 0,
    read_perm BOOLEAN NOT NULL DEFAULT TRUE,
    write_perm BOOLEAN NOT NULL DEFAULT FALSE,
    create_perm BOOLEAN NOT NULL DEFAULT FALSE,
    delete_perm BOOLEAN NOT NULL DEFAULT FALSE,
    submit_perm BOOLEAN NOT NULL DEFAULT FALSE,
    cancel_perm BOOLEAN NOT NULL DEFAULT FALSE,
    amend_perm BOOLEAN NOT NULL DEFAULT FALSE,
    print_perm BOOLEAN NOT NULL DEFAULT TRUE,
    email_perm BOOLEAN NOT NULL DEFAULT FALSE,
    export_perm BOOLEAN NOT NULL DEFAULT FALSE,
    import_perm BOOLEAN NOT NULL DEFAULT FALSE,
    share_perm BOOLEAN NOT NULL DEFAULT FALSE,
    report_perm BOOLEAN NOT NULL DEFAULT TRUE,
    if_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_docperm_doctype_role_level UNIQUE(doctype_id, role_id, permlevel)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allow_doctype VARCHAR(100) NOT NULL,
    for_value VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_profile_roles (
    role_profile_id UUID NOT NULL REFERENCES role_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (role_profile_id, role_id)
);

-- Seed Standard DocTypes
INSERT INTO doctypes (name, module, description, is_submittable) VALUES
    ('Asset', 'Assets', 'Manajemen Aset Perusahaan', FALSE),
    ('Employee', 'HR', 'Data Karyawan & Kepegawaian', FALSE),
    ('Attendance', 'HR', 'Absensi & Kehadiran Karyawan', FALSE),
    ('InventoryItem', 'Inventory', 'Stok & Barang Material', FALSE),
    ('WorkOrder', 'Maintenance', 'Perintah Kerja Pemeliharaan', TRUE),
    ('PurchaseOrder', 'Purchase', 'Pesanan Pembelian', TRUE),
    ('SalesInvoice', 'Sales', 'Faktur Penjualan', TRUE),
    ('RentalContract', 'Rentals', 'Kontrak Sewa Aset', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed Default DocPerms for Super Admin / Admin / Manager Roles if roles exist
DO $$
DECLARE
    v_admin_role_id UUID;
    v_mgr_role_id UUID;
    v_doc_rec RECORD;
BEGIN
    SELECT id INTO v_admin_role_id FROM roles WHERE code IN ('admin', 'super_admin') LIMIT 1;
    SELECT id INTO v_mgr_role_id FROM roles WHERE code IN ('asset_manager', 'hr_manager', 'manager') LIMIT 1;

    FOR v_doc_rec IN SELECT id FROM doctypes LOOP
        IF v_admin_role_id IS NOT NULL THEN
            INSERT INTO custom_docperms (
                doctype_id, role_id, permlevel, read_perm, write_perm, create_perm, delete_perm, 
                submit_perm, cancel_perm, amend_perm, print_perm, email_perm, export_perm, import_perm, share_perm, report_perm
            ) VALUES (
                v_doc_rec.id, v_admin_role_id, 0, TRUE, TRUE, TRUE, TRUE, 
                TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
            ) ON CONFLICT ON CONSTRAINT uq_docperm_doctype_role_level DO NOTHING;
        END IF;

        IF v_mgr_role_id IS NOT NULL THEN
            INSERT INTO custom_docperms (
                doctype_id, role_id, permlevel, read_perm, write_perm, create_perm, delete_perm, 
                submit_perm, cancel_perm, amend_perm, print_perm, email_perm, export_perm, import_perm, share_perm, report_perm
            ) VALUES (
                v_doc_rec.id, v_mgr_role_id, 0, TRUE, TRUE, TRUE, FALSE, 
                TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE
            ) ON CONFLICT ON CONSTRAINT uq_docperm_doctype_role_level DO NOTHING;
        END IF;
    END LOOP;
END $$;
