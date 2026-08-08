-- Migration: Move categories and maintenance-templates to Asset Management module in launchpad_config

UPDATE settings
SET value = '{
    "globalMenuIds": ["profile"],
    "modules": [
        {
            "id": "organization",
            "title": "Organization",
            "subtitle": "Entitas & Struktur Organisasi",
            "icon": "Building2",
            "gradient": "from-blue-600/20 to-indigo-600/20",
            "iconBg": "bg-gradient-to-br from-blue-600 to-indigo-600",
            "defaultRoute": "/company",
            "minLevel": 2,
            "features": ["Company & Legal Entity", "Department & Branch", "Users & Access Control"],
            "menuIds": ["company", "departments", "branch", "users", "roles", "email-account"],
            "order": 1,
            "enabled": true
        },
        {
            "id": "insights",
            "title": "Insights & Reporting",
            "subtitle": "Business Intelligence",
            "icon": "BarChart3",
            "gradient": "from-blue-500/20 to-cyan-500/20",
            "iconBg": "bg-gradient-to-br from-blue-500 to-cyan-500",
            "defaultRoute": "/dashboard",
            "minLevel": 5,
            "features": ["Dashboard Overview", "Analytics", "Reports"],
            "menuIds": ["dashboard", "analytics", "reports"],
            "order": 2,
            "enabled": true
        },
        {
            "id": "asset-management",
            "title": "Asset Management",
            "subtitle": "Asset Registry & Tracking",
            "icon": "Box",
            "gradient": "from-emerald-500/20 to-teal-500/20",
            "iconBg": "bg-gradient-to-br from-emerald-500 to-teal-500",
            "defaultRoute": "/assets",
            "minLevel": 5,
            "features": ["Asset Registry", "Asset Categories", "Maintenance SOP", "Lifecycle Tracking", "Asset Audit"],
            "menuIds": ["assets", "categories", "maintenance-templates", "asset-lifecycle", "conversions", "asset-audit"],
            "order": 3,
            "enabled": true
        },
        {
            "id": "field-operations",
            "title": "Field Operations",
            "subtitle": "Maintenance & Services",
            "icon": "Wrench",
            "gradient": "from-amber-500/20 to-orange-500/20",
            "iconBg": "bg-gradient-to-br from-amber-500 to-orange-500",
            "defaultRoute": "/work-orders",
            "minLevel": 5,
            "features": ["Work Orders", "PM Schedules", "Fuel & Tax", "Internal Loans"],
            "menuIds": ["work-orders", "maintenance-schedules", "fuel", "tax-renewals", "loans"],
            "order": 4,
            "enabled": true
        },
        {
            "id": "commercial",
            "title": "Commercial & Revenue",
            "subtitle": "Sales, Rentals & Procurement",
            "icon": "TrendingUp",
            "gradient": "from-violet-500/20 to-purple-500/20",
            "iconBg": "bg-gradient-to-br from-violet-500 to-purple-500",
            "defaultRoute": "/rentals",
            "minLevel": 4,
            "features": ["Rental Operations", "Contracts", "Client Management", "Procurement & Vendor Bills"],
            "menuIds": ["rentals", "contracts", "sales-invoices", "clients", "purchase-bills"],
            "order": 5,
            "enabled": true
        },
        {
            "id": "supply-chain",
            "title": "Supply Chain",
            "subtitle": "Inventory Management",
            "icon": "ShoppingBag",
            "gradient": "from-orange-500/20 to-red-500/20",
            "iconBg": "bg-gradient-to-br from-orange-500 to-red-400",
            "defaultRoute": "/inventory-items",
            "minLevel": 3,
            "features": ["Inventory Control", "Stock Opname"],
            "menuIds": ["inventory-items", "inventory-categories", "stock-opname"],
            "order": 6,
            "enabled": true
        },
        {
            "id": "finance",
            "title": "Finance & Accounting",
            "subtitle": "Financial Management",
            "icon": "Wallet",
            "gradient": "from-green-500/20 to-emerald-500/20",
            "iconBg": "bg-gradient-to-br from-green-500 to-emerald-500",
            "defaultRoute": "/cash-bank",
            "minLevel": 2,
            "features": ["Cash & Bank", "Expenses", "General Ledger"],
            "menuIds": ["finance", "cash-bank", "expenses", "journal-entries", "financial-reports"],
            "order": 7,
            "enabled": true
        },
        {
            "id": "hr",
            "title": "Human Resources",
            "subtitle": "People Management",
            "icon": "Users",
            "gradient": "from-pink-500/20 to-rose-500/20",
            "iconBg": "bg-gradient-to-br from-pink-500 to-rose-500",
            "defaultRoute": "/employees",
            "minLevel": 3,
            "features": ["Employees", "Attendance", "Leave Management"],
            "menuIds": ["employees", "attendance", "leaves"],
            "order": 8,
            "enabled": true
        },
        {
            "id": "admin",
            "title": "System Administration",
            "subtitle": "Configuration & Security",
            "icon": "Settings",
            "gradient": "from-slate-500/20 to-gray-500/20",
            "iconBg": "bg-gradient-to-br from-slate-500 to-gray-500",
            "defaultRoute": "/approvals",
            "minLevel": 2,
            "features": ["Master Data & Templates", "Approvals & Workflows", "System Config"],
            "menuIds": ["inventory-categories", "locations", "contract-templates", "approvals", "approval-workflow-settings", "audit", "settings"],
            "order": 9,
            "enabled": true
        }
    ]
}'::jsonb,
updated_at = NOW()
WHERE key = 'launchpad_config';
