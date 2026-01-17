# Role-Based Access Control (RBAC) Schema

This document outlines the access levels and permissions for different user roles in the Management System.

## Role Levels Hierarchy

The system uses a numeric level system where **lower numbers indicate higher privileges**.

| Level | Role Code | Role Name | Description |
| :---: | :--- | :--- | :--- |
| **1** | `super_admin` | **Super Admin** | Complete system access with no restrictions. |
| **2** | `admin` | **Admin** | System administration, user management, and sensitive configuration. |
| **3** | `manager` | **Manager** | Department heads causing financial/HR oversight and master data management. |
| **4** | `staff` / `technician` | **Staff** | Operational staff dealing with day-to-day tasks (Rentals, Work Orders). |
| **5** | `viewer` / `user` | **Viewer** | Read-only or basic interaction access (Asset search, Self-service loans). |

---

## Access Matrix

The following table details exactly what each role can access in the application sidebar and dashboard.

| Feature / Module | Access Details | Viewer (5) | Staff (4) | Manager (3) | Admin (1-2) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **DASHBOARD** | | | | | |
| Basic Stats | Asset Count, Activity | ✅ | ✅ | ✅ | ✅ |
| Financial Snapshot | Total Value, Depreciation | ❌ | ❌ | ✅ | ✅ |
| **ASSET MANAGEMENT** | | | | | |
| Asset List | View All Assets | ✅ | ✅ | ✅ | ✅ |
| Internal Loans | Request/View Loans | ✅ | ✅ | ✅ | ✅ |
| Work Orders | Create/Manage WO | ❌ | ✅ | ✅ | ✅ |
| Maintenance Status | View Under Repair | ❌ | ✅ | ✅ | ✅ |
| Conversions | Asset Conversions | ❌ | ❌ | ✅ | ✅ |
| Lifecycle (Audit) | Asset History | ❌ | ❌ | ✅ | ✅ |
| **RENTAL MANAGEMENT** | | | | | |
| Rentals | Reservations/Dispatch | ❌ | ✅ | ✅ | ✅ |
| **FINANCE (ACCOUNTING)** | | | | | |
| Cash & Bank | Cash Mutations | ❌ | ❌ | ✅ | ✅ |
| Sales | Invoices, Orders, Quotes | ❌ | ❌ | ✅ | ✅ |
| Purchases | Bills, Orders, Quotes | ❌ | ❌ | ✅ | ✅ |
| Expenses | Expense Claims | ❌ | ❌ | ✅ | ✅ |
| Advanced Finance | Journal, Ledger, Balance | ❌ | ❌ | ❌ | ✅ |
| **HRD** | | | | | |
| Employees | Employee Data | ❌ | ❌ | ✅ | ✅ |
| Attendance | Attendance Records | ❌ | ❌ | ✅ | ✅ |
| Leaves | Leave Requests | ❌ | ❌ | ✅ | ✅ |
| **MASTER DATA** | | | | | |
| References | Clients, Locations, Depts | ❌ | ❌ | ✅ | ✅ |
| **OTHER** | | | | | |
| Approval Center | Approvals | ❌ | ❌ | ✅ | ✅ |
| Reports | All Reports | ❌ | ❌ | ✅ | ✅ |
| **SETTINGS** | | | | | |
| Profile | Personal Settings | ✅ | ✅ | ✅ | ✅ |
| User Management | Create/Edit Users | ❌ | ❌ | ❌ | ✅ |
| Audit Mode | System Audit Logs | ❌ | ❌ | ❌ | ✅ |

## Implementation Summary

### Frontend (`useAuthStore.ts`)
- **`role_level`**: Stores the numeric level of the current user.
- **`hasRoleLevel(level)`**: Helper function to check if `user.role_level <= required_level`.

### Navigation (`AdminDashboard.tsx`)
- Menu items have a `minLevel` property.
- The sidebar strictly filters out items where `user.level > item.minLevel`.
- **Groups**: If a user does not have permission for ANY child in a group, the entire group is hidden.

### Dashboard Widget (`Dashboard.tsx`)
- Financial widgets (Total Value, Depreciation) are conditionally rendered checking `hasRoleLevel(3)`.
