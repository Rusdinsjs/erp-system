# Role-Based Access Control (RBAC) & DocPerm Schema - ERPQu 1.0

ERPQu 1.0 implements a Frappe/ERPNext-compliant Role Permission Manager system, replacing static hardcoded role checks with dynamic **DocPerm Matrix Rules** and **User Permissions**.

---

## 🏛️ Database Tables

### 1. `doctypes`
Registers system entities (e.g. `Asset`, `WorkOrder`, `RentalContract`, `InventoryItem`).
```sql
CREATE TABLE doctypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(100) NOT NULL,
    is_submittable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `custom_docperms`
Stores permission rules for each Role on a DocType across 9 actions.
```sql
CREATE TABLE custom_docperms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    doctype_id UUID NOT NULL REFERENCES doctypes(id) ON DELETE CASCADE,
    perm_level INT NOT NULL DEFAULT 0,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_write BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_submit BOOLEAN NOT NULL DEFAULT false,
    can_cancel BOOLEAN NOT NULL DEFAULT false,
    can_amend BOOLEAN NOT NULL DEFAULT false,
    can_print BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    if_owner BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_doctype_perm UNIQUE (role_id, doctype_id, perm_level)
);
```

### 3. `user_permissions`
Stores row-level filtering rules for specific users.
```sql
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allow_doctype VARCHAR(100) NOT NULL, -- e.g. 'Category', 'Location', 'Department'
    for_value VARCHAR(255) NOT NULL,    -- e.g. 'VEHICLE', 'Gudang Utama'
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `role_profiles` & `role_profile_roles`
Bundles multiple roles into reusable Role Profiles assigned to users.

---

## 🔒 Role Hierarchy Levels

Lower numeric levels indicate higher system hierarchy:

| Level | Role Code | Role Name | Scope |
| :---: | :--- | :--- | :--- |
| **1** | `super_admin` | Super Admin | Full System Access |
| **2** | `admin` | Administrator | System Admin & Config |
| **3** | `manager` | Manager | Department & Master Oversight |
| **4** | `staff` / `technician` | Operational Staff | Daily Operational Access |
| **5** | `viewer` | Viewer | Read-only Access |
