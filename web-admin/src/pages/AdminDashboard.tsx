// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, Package, FolderTree, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle, Clock,
    Calendar as CalendarIcon, ArrowLeftRight, Scale, TrendingUp,
    Wallet, ShoppingCart, ShoppingBag, Receipt, History, Calculator, Wrench, Fuel, Shield, Layers
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import { PageLoading, Logo } from '../components/ui';

// Import all views
const DashboardView = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const AssetsView = lazy(() => import('./Assets').then(m => ({ default: m.Assets })));
const AssetDetailsView = lazy(() => import('./AssetDetails').then(m => ({ default: m.AssetDetails })));
const CategoriesView = lazy(() => import('./Categories').then(m => ({ default: m.Categories })));
const WorkOrdersView = lazy(() => import('./WorkOrders').then(m => ({ default: m.WorkOrders })));
const WorkOrderDetailsView = lazy(() => import('./WorkOrderDetails').then(m => ({ default: m.WorkOrderDetails })));
const ApprovalCenterView = lazy(() => import('./ApprovalCenter').then(m => ({ default: m.ApprovalCenter })));
const UsersView = lazy(() => import('./Users').then(m => ({ default: m.Users })));
const RolesView = lazy(() => import('./Roles').then(m => ({ default: m.Roles })));
const ProfileView = lazy(() => import('./Profile').then(m => ({ default: m.Profile })));
const ReportsView = lazy(() => import('./Reports/ReportCenter'));
const AuditModeView = lazy(() => import('./AuditMode').then(m => ({ default: m.AuditMode })));
const AuditLogsView = lazy(() => import('./AuditLogs').then(m => ({ default: m.AuditLogs })));
const AssetLifecycleView = lazy(() => import('./AssetLifecycle').then(m => ({ default: m.AssetLifecycle })));
const ConversionsView = lazy(() => import('./Conversions').then(m => ({ default: m.Conversions })));
const FuelView = lazy(() => import('./Fuel/FuelDashboard').then(m => ({ default: m.FuelDashboard })));
const RentalsView = lazy(() => import('./rentals/Rentals').then(m => ({ default: m.Rentals })));
const RentalFormView = lazy(() => import('./rentals/RentalForm').then(m => ({ default: m.RentalForm })));
const RentalDetailView = lazy(() => import('./rentals/RentalDetail').then(m => ({ default: m.RentalDetail })));
const ContractListView = lazy(() => import('./Contracts').then(m => ({ default: m.default }))); // Added ContractList
const ContractDetailView = lazy(() => import('./ContractDetail')); // Added ContractDetail
const ContractAnalyticsView = lazy(() => import('./ContractAnalytics')); // Added ContractAnalytics
const ContractTemplatesView = lazy(() => import('./ContractTemplates')); // Added ContractTemplates
const ClientsView = lazy(() => import('./Clients').then(m => ({ default: m.Clients })));
const LoansView = lazy(() => import('./Loans').then(m => ({ default: m.Loans })));
const LocationsView = lazy(() => import('./Locations').then(m => ({ default: m.Locations })));
const EmployeesView = lazy(() => import('./Employees').then(m => ({ default: m.Employees })));
const DepartmentsView = lazy(() => import('./Departments').then(m => ({ default: m.Departments })));
const AttendanceView = lazy(() => import('./Attendance/AttendanceDashboard'));
const LeaveDashboardView = lazy(() => import('./Leaves/LeaveDashboard'));
const ChartOfAccountsView = lazy(() => import('./Finance/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const JournalEntriesView = lazy(() => import('./Finance/JournalEntries').then(m => ({ default: m.JournalEntries })));
const JournalEntryFormView = lazy(() => import('./Finance/JournalEntryForm').then(m => ({ default: m.JournalEntryForm })));
const GeneralLedgerView = lazy(() => import('./Finance/GeneralLedger').then(m => ({ default: m.GeneralLedger })));
const TrialBalanceView = lazy(() => import('./Finance/TrialBalance').then(m => ({ default: m.TrialBalance })));
const FinancialReportsView = lazy(() => import('./Finance/FinancialReports').then(m => ({ default: m.FinancialReports })));

// Placeholder for new Kledo-style views (to be created)
const CashBankView = lazy(() => import('./Finance/CashBank').then(m => ({ default: m.CashBank })));
const SalesOverviewView = lazy(() => import('./Finance/SalesOverview').then(m => ({ default: m.SalesOverview })));
const SalesInvoicesView = lazy(() => import('./Finance/SalesInvoices').then(m => ({ default: m.SalesInvoices })));
const SalesQuotesView = lazy(() => import('./Finance/SalesQuotes').then(m => ({ default: m.SalesQuotes })));
const SalesOrdersView = lazy(() => import('./Finance/SalesOrders').then(m => ({ default: m.SalesOrders })));
const SalesShipmentsView = lazy(() => import('./Finance/SalesShipments').then(module => ({ default: module.SalesShipments })));
const PurchaseOverviewView = lazy(() => import('./Finance/PurchaseOverview').then(module => ({ default: module.PurchaseOverview })));
const PurchaseQuotesView = lazy(() => import('./Finance/PurchaseQuotes').then(module => ({ default: module.PurchaseQuotes })));
const PurchaseOrdersView = lazy(() => import('./Finance/PurchaseOrders').then(module => ({ default: module.PurchaseOrders })));
const PurchaseShipmentsView = lazy(() => import('./Finance/PurchaseShipments').then(module => ({ default: module.PurchaseShipments })));
const PurchaseBillsView = lazy(() => import('./Finance/PurchaseBills').then(module => ({ default: module.PurchaseBills })));
const MaintenanceTemplatesView = lazy(() => import('./MaintenanceTemplates').then(m => ({ default: m.MaintenanceTemplates })));
const MaintenanceSchedulesView = lazy(() => import('./Maintenance/MaintenanceSchedules'));
const ApprovalWorkflowSettingsView = lazy(() => import('./ApprovalWorkflowSettings'));
const SettingsView = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const InventoryItemsView = lazy(() => import('./Inventory/InventoryItems').then(m => ({ default: m.InventoryItems })));
const InventoryCategoriesView = lazy(() => import('./Inventory/InventoryCategories').then(m => ({ default: m.InventoryCategories })));
const StockOpnameView = lazy(() => import('./Inventory/StockOpname'));
const TaxRenewalsView = lazy(() => import('./TaxRenewals/TaxRenewals').then(m => ({ default: m.TaxRenewals })));

const ExpensesView = lazy(() => import('./Finance/Expenses').then(m => ({ default: m.Expenses })));
const AnalyticsDashboardView = lazy(() => import('./AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

// Define the available tabs
type TabId =
    | 'dashboard'
    | 'assets'
    | 'categories'
    | 'inventory-categories' // New
    | 'inventory-items'      // New
    | 'stock-opname'         // New
    | 'locations'
    | 'work-orders'
    | 'rentals'
    | 'rental-form'
    | 'contracts'
    | 'contract-detail'
    | 'contract-analytics'
    | 'contract-templates'
    | 'clients'
    | 'loans'
    | 'fuel'
    | 'employees'
    | 'attendance'
    | 'leaves'
    | 'conversions'
    | 'approvals'
    | 'reports'
    | 'users'
    | 'roles'
    | 'audit'
    | 'system-audit'
    | 'departments'
    | 'finance'
    | 'journal-entries'
    | 'journal-form'
    | 'general-ledger'
    | 'trial-balance'
    | 'financial-reports'
    | 'cash-bank'
    | 'sales'
    | 'sales-overview'
    | 'approval-workflow-settings'
    | 'sales-quotes'
    | 'sales-orders'
    | 'sales-shipments'
    | 'sales-invoices'
    | 'purchases' // This now refers to the group
    | 'purchase-overview'
    | 'purchase-quotes'
    | 'purchase-orders'
    | 'purchase-shipments'
    | 'purchase-bills'
    | 'maintenance-templates'
    | 'maintenance-schedules'
    | 'tax-renewals'
    | 'expenses'
    | 'asset-lifecycle'
    | 'settings'
    | 'analytics'
    | 'profile';

interface NavItem {
    id: TabId;
    icon: any;
    label: string;
    adminOnly?: boolean;
    minLevel?: number; // 1=SuperAdmin, 2=Admin, 3=Manager, 4=Staff, 5=Viewer
    showBadge?: boolean;
    context?: string; // New: To link with Launchpad Card ID
}

interface NavGroup {
    id: string;
    label: string;
    icon: any;
    children: NavEntry[];
    minLevel?: number;
    showBadge?: boolean;
    context?: string; // New
}

interface NavHeader {
    type: 'header';
    label: string;
    minLevel?: number;
    context?: string; // New
}

type NavEntry = NavItem | NavGroup | NavHeader;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
    return 'children' in entry;
};

const isNavHeader = (entry: NavEntry): entry is NavHeader => {
    return 'type' in entry && entry.type === 'header';
};

// Navigation structure
const navItems: NavEntry[] = [
    { type: 'header', label: 'INSIGHTS & REPORTING', minLevel: 5, context: 'insights' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Overview', minLevel: 5, context: 'insights' },
    { id: 'analytics', icon: TrendingUp, label: 'Performance Analytics', minLevel: 3, context: 'insights' },
    { id: 'reports', icon: FileText, label: 'Management Reports', minLevel: 3, context: 'insights' },

    { type: 'header', label: 'OPERATIONS & ASSETS', minLevel: 5, context: 'operations' },
    {
        id: 'asset_operations',
        label: 'Asset Operations',
        icon: Package,
        minLevel: 5,
        context: 'operations',
        children: [
            { id: 'assets', icon: Package, label: 'Asset Registry', minLevel: 5 },
            { id: 'loans', icon: HandMetal, label: 'Internal Asset Loans', minLevel: 5 },
            { id: 'fuel', icon: Fuel, label: 'Fuel Usage (BBM)', minLevel: 5 },
            { id: 'tax-renewals', icon: FileText, label: 'Tax & Renewals', minLevel: 4 },
            { id: 'asset-lifecycle', icon: History, label: 'Life Cycle Log', minLevel: 3 },
        ]
    },
    {
        id: 'maintenance_group',
        label: 'Service & Maintenance',
        icon: Wrench,
        minLevel: 5, // Main group visible to all, children have specific levels
        context: 'operations',
        children: [
            { id: 'work-orders', icon: Wrench, label: 'Work Orders', minLevel: 4 },
            { id: 'maintenance-schedules', icon: CalendarIcon, label: 'PM Schedules', minLevel: 3 },
            { id: 'maintenance-templates', icon: ClipboardCheck, label: 'SOP Templates', minLevel: 3 },
        ]
    },

    { type: 'header', label: 'COMMERCIAL & REVENUE', minLevel: 4, context: 'commercial' },
    {
        id: 'commercial_group',
        label: 'Commercial & Rental',
        icon: Truck,
        minLevel: 4,
        context: 'commercial',
        children: [
            { id: 'rentals', icon: Truck, label: 'Rental Operations', minLevel: 4 },
            { id: 'contracts', icon: FileText, label: 'Service Contracts', minLevel: 4 },
            { id: 'contract-templates', icon: Settings, label: 'Contract Templates', minLevel: 3 },
            {
                id: 'sales_subgroup',
                label: 'Sales Management',
                icon: ShoppingCart,
                minLevel: 3,
                children: [
                    { id: 'sales-overview', icon: TrendingUp, label: 'Sales Performance' },
                    { id: 'sales-quotes', icon: Calculator, label: 'Sales Quotations' },
                    { id: 'sales-orders', icon: ShoppingCart, label: 'Sales Orders' },
                    { id: 'sales-shipments', icon: Truck, label: 'Delivery Slips' },
                    { id: 'sales-invoices', icon: FileText, label: 'Invoice Collection' },
                ]
            }
        ]
    },

    { type: 'header', label: 'PROCUREMENT & SUPPLY', minLevel: 3, context: 'procurement' },
    {
        id: 'supply_chain_group',
        label: 'Procurement & Supply',
        icon: ShoppingBag,
        minLevel: 3,
        context: 'procurement',
        children: [
            {
                id: 'purchase_subgroup',
                label: 'Purchasing',
                icon: ShoppingBag,
                minLevel: 3,
                children: [
                    { id: 'purchase-overview', icon: TrendingUp, label: 'Procurement Stats' },
                    { id: 'purchase-quotes', icon: Calculator, label: 'Purchase Requests' },
                    { id: 'purchase-orders', icon: ShoppingBag, label: 'Purchase Orders' },
                    { id: 'purchase-shipments', icon: Truck, label: 'Incoming Goods' },
                    { id: 'purchase-bills', icon: FileText, label: 'Vendor Bills' },
                ]
            },
            {
                id: 'inventory_subgroup',
                label: 'Inventory Control',
                icon: Layers,
                minLevel: 3,
                children: [
                    { id: 'inventory-items', icon: Package, label: 'Stock Items' },
                    { id: 'stock-opname', icon: ClipboardCheck, label: 'Stock Take' },
                    { id: 'inventory-categories', icon: FolderTree, label: 'Stock Categories' },
                ]
            }
        ]
    },

    { type: 'header', label: 'FINANCE & HR', minLevel: 3, context: 'finance' },
    {
        id: 'finance_group',
        label: 'Finance & Accounting',
        icon: FolderTree,
        minLevel: 3,
        context: 'finance',
        children: [
            { id: 'cash-bank', icon: Wallet, label: 'Cash & Bank', minLevel: 3 },
            { id: 'expenses', icon: Receipt, label: 'Expenditures', minLevel: 3 },
            {
                id: 'accounting_subgroup',
                label: 'General Ledger',
                icon: History,
                minLevel: 3,
                children: [
                    { id: 'finance', icon: FolderTree, label: 'Chart of Accounts' },
                    { id: 'journal-entries', icon: FileText, label: 'Journal Entries' },
                    { id: 'general-ledger', icon: ArrowLeftRight, label: 'Account Ledger' },
                    { id: 'trial-balance', icon: Scale, label: 'Trial Balance' },
                    { id: 'financial-reports', icon: TrendingUp, label: 'Financial Statements' },
                ]
            }
        ]
    },

    {
        id: 'hr_group',
        label: 'Human Resources',
        icon: Users,
        minLevel: 3,
        context: 'hr',
        children: [
            { id: 'employees', icon: Users, label: 'Employee Directory' },
            { id: 'attendance', icon: Clock, label: 'Work Attendance' },
            { id: 'leaves', icon: CalendarIcon, label: 'Leave Requests' },
        ]
    },

    { type: 'header', label: 'ADMINISTRATION', minLevel: 3, context: 'approval' }, // Approvals Grouped here for simplification or own group? User said "Approval" is a card. Let's make Approval context cover this.
    { id: 'approvals', icon: ClipboardCheck, label: 'Approval Center', minLevel: 3, showBadge: true, context: 'approval' },

    // Master Data -> Admin Context? Or split?
    // Let's explicitly put Master Data in 'admin' context.
    {
        id: 'master_data',
        label: 'Master Data',
        icon: Building2,
        minLevel: 3,
        context: 'admin',
        children: [
            { id: 'clients', icon: Building2, label: 'Business Partners' },
            { id: 'locations', icon: MapPin, label: 'Operational Areas' },
            { id: 'categories', icon: FolderTree, label: 'Asset Categories' },
            { id: 'departments', icon: Building2, label: 'Departments' },
        ]
    },
    {
        id: 'settings_group',
        label: 'System Settings',
        icon: Settings,
        minLevel: 5,
        context: 'global', // Explicitly global
        children: [
            { id: 'users', icon: Users, label: 'User Control', minLevel: 2 },
            { id: 'roles', icon: Shield, label: 'RBAC Permissions', minLevel: 2 },
            { id: 'approval-workflow-settings', icon: Layers, label: 'Workflow Engines', minLevel: 2 },
            { id: 'audit', icon: Scan, label: 'Audit Compliance', minLevel: 2 },
            { id: 'system-audit', icon: History, label: 'System Event Logs', minLevel: 2 },
            { id: 'settings', icon: Settings, label: 'App Configuration', minLevel: 2 },
            { id: 'profile', icon: UserCircle, label: 'My Profile', minLevel: 5 },
        ]
    },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        asset_operations: false,
        maintenance_group: false,
        hrd_group: false,
        master_data: false,
        rental_group: false,
        finance_group: false,
        inventory_group: true,
        settings_group: false
    });
    const [notifOpen, setNotifOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    // For sub-views that need parameters
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [assetViewMode, setAssetViewMode] = useState<'list' | 'lifecycle' | 'details'>('list');
    const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
    const [selectedContractId] = useState<string | null>(null);

    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Sync URL with State
    useEffect(() => {
        const path = location.pathname;

        // 1. Handle Deep Links (Priority)
        const lifecycleMatch = matchPath('/assets/:id/lifecycle', path);
        if (lifecycleMatch?.params.id) {
            setActiveTab('assets');
            setSelectedAssetId(lifecycleMatch.params.id);
            setAssetViewMode('lifecycle');
            setSelectedWorkOrderId(null);
            setOpenGroups(prev => ({ ...prev, asset_operations: true }));
            return;
        }

        const assetDetailMatch = matchPath('/assets/:id', path);
        if (assetDetailMatch?.params.id) {
            setActiveTab('assets');
            setSelectedAssetId(assetDetailMatch.params.id);
            setAssetViewMode('details');
            setSelectedWorkOrderId(null);
            setOpenGroups(prev => ({ ...prev, asset_operations: true }));
            return;
        }

        const rentalFormMatch = matchPath('/rentals/new', path);
        if (rentalFormMatch) {
            setActiveTab('rental-form');
            setSelectedRentalId(null);
            return;
        }

        const rentalDetailMatch = matchPath('/rentals/:id', path);
        if (rentalDetailMatch?.params.id) {
            setActiveTab('rentals');
            setSelectedRentalId(rentalDetailMatch.params.id);
            setSelectedWorkOrderId(null);
            setSelectedAssetId(null);
            return;
        }

        const woMatch = matchPath('/work-orders/:id', path);
        if (woMatch?.params.id) {
            setActiveTab('work-orders');
            setSelectedWorkOrderId(woMatch.params.id);
            setSelectedAssetId(null);
            setOpenGroups(prev => ({ ...prev, asset_operations: true }));
            return;
        }

        const contractsMatch = matchPath('/rentals/contracts', path);
        if (contractsMatch) {
            setActiveTab('contracts');
            setOpenGroups(prev => ({ ...prev, rental_group: true }));
            return;
        }

        const journalNewMatch = matchPath('/finance/journals/new', path);
        if (journalNewMatch) {
            setActiveTab('journal-form');
            setOpenGroups(prev => ({ ...prev, finance_group: true }));
            setSelectedAssetId(null);
            setSelectedWorkOrderId(null);
            return;
        }

        const journalListMatch = matchPath('/finance/journals', path);
        if (journalListMatch) {
            setActiveTab('journal-entries');
            setOpenGroups(prev => ({ ...prev, finance_group: true }));
            setSelectedAssetId(null);
            setSelectedWorkOrderId(null);
            return;
        }

        // 2. Handle Simple Tabs
        const segments = path.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];

        if (lastSegment) {
            const foundTab = lastSegment as TabId;
            setActiveTab(foundTab);

            // Auto-expand group if child is active
            // Recursive finder for nested groups
            const findParentGroup = (items: NavEntry[], targetId: TabId): NavGroup | undefined => {
                if (targetId === 'work-orders') {
                    return items.find(i => !isNavHeader(i) && i.id === 'asset_operations') as NavGroup;
                }

                for (const item of items) {
                    if (isNavHeader(item)) continue;
                    if (isNavGroup(item)) {
                        if (item.children.some(child => !isNavHeader(child) && child.id === targetId)) {
                            return item;
                        }
                        const foundInChild = findParentGroup(item.children, targetId);
                        if (foundInChild) return item;
                    } else if (item.id === targetId) {
                        return undefined; // At root
                    }
                }
                return undefined;
            };

            // Guard against UUIDs being interpreted as tabs (which causes Dashboard fallback)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(foundTab);

            if (!isUuid) {
                const foundGroup = findParentGroup(navItems, foundTab);
                if (foundGroup) {
                    setOpenGroups(prev => ({ ...prev, [foundGroup.id]: true }));
                } else if (foundTab === 'work-orders') {
                    // Explicit fallback for work-orders to ensure group opens
                    setOpenGroups(prev => ({ ...prev, asset_operations: true }));
                }

                // Only set active tab if it's not a UUID and seems to be a valid tab
                // (Though ideally we should validate against valid TabIds)
                setActiveTab(foundTab);
            }

            setSelectedAssetId(null);
            setAssetViewMode('list');
            setSelectedWorkOrderId(null);
            setSelectedRentalId(null);
        } else if (path === '/') {
            setActiveTab('dashboard');
            setSelectedAssetId(null);
            setAssetViewMode('list');
            setSelectedWorkOrderId(null);
            setSelectedRentalId(null);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        setLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        logout();
        navigate('/login');
        setLogoutModalOpen(false);
    };

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Helper to find context of current tab
    const findTabContext = (tabId: TabId, items: NavEntry[], parentContext?: string): string | undefined => {
        for (const item of items) {
            // Check headers/items/groups
            const currentContext = 'context' in item ? item.context : parentContext;

            if (isNavGroup(item)) {
                // Check direct children valid ids
                // Note: Group itself might not match tabId, but one of its children will
                const foundInChild = findTabContext(tabId, item.children, currentContext);
                if (foundInChild) return foundInChild;
            } else if (!isNavHeader(item)) {
                if (item.id === tabId) return currentContext;
            }
        }
        return undefined;
    };

    // Derived Context
    const activeContext = useMemo(() => {
        // Hardcode specific overrides if needed, or rely on recursion
        return findTabContext(activeTab, navItems);
    }, [activeTab]);

    // Filtered Nav Items based on Context
    const visibleNavItems = useMemo(() => {
        const isSuperAdmin = user?.role === 'super_admin' || user?.role_level === 1;
        if (isSuperAdmin) return navItems;

        // If no context found (e.g. initial load or weird state), maybe show all or nothing?
        // Default to showing Dashboard related if lost? Or just nothing?
        // Let's assume if no context, we show Insights (default) or everything?
        // Better: Show items where context matches OR context is 'global'

        if (!activeContext) return navItems; // Fallback to all if context lost

        return navItems.filter(item => {
            // Global items (Settings, Profile) always show
            if ('context' in item && item.context === 'global') return true;

            // Context matches
            if ('context' in item && item.context === activeContext) return true;

            // Admin context special handling? User said "System Settings" always visible. 
            // I tagged 'settings_group' as global.
            // Master Data is tagged 'admin'. Should it show?
            // "Menu Assets Operation dan System Settings (Selalu Tampil)".
            // User did NOT say Master Data.
            // So logic holds.

            return false;
        });
    }, [user, activeContext]);


    // Check if user is admin
    const isAdmin = (user?.role_level ?? 5) <= 2;

    // Render Section Header
    const renderNavHeader = (header: NavHeader) => {
        const userLevel = user?.role_level ?? 5;
        const requiredLevel = header.minLevel ?? 5;
        if (userLevel > requiredLevel) return null;

        if (!sidebarOpen) return <div className="h-px bg-border/10 my-4 mx-4" />;

        return (
            <div className="px-4 py-2 mt-4 text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase flex items-center gap-2 select-none">
                <span className="whitespace-nowrap">{header.label}</span>
                <div className="h-[1px] flex-1 bg-border/10" />
            </div>
        );
    };
    // Render Navigation Item
    const renderNavItem = (item: NavItem, isChild = false) => {
        // Permissions Check
        const userLevel = user?.role_level ?? 5;
        const requiredLevel = item.minLevel ?? 5; // Default to Viewer if not specified

        if (userLevel > requiredLevel) return null;

        // Backward compatibility for adminOnly flag
        if (item.adminOnly && !isAdmin) return null;

        return (
            <button
                key={item.id}
                onClick={() => {
                    navigate(`/${item.id}`);
                    if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                    }
                }}
                className={`w-full flex items-center gap-3 px-4 ${isChild ? 'py-2' : 'py-3'} rounded-lg transition-all duration-200 ${activeTab === item.id
                    ? 'bg-blue-600/20 text-blue-400 shadow-sm shadow-blue-500/10'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    } ${isChild ? 'text-sm' : ''}`}
            >
                <item.icon size={isChild ? 16 : 20} />
                {sidebarOpen && (
                    <>
                        <span className="font-medium flex-1 text-left">{item.label}</span>
                        {item.showBadge && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                !
                            </span>
                        )}
                    </>
                )}
            </button>
        );
    };

    // Render Navigation Group (Recursive)
    const renderNavGroup = (group: NavGroup) => {
        // Check if any child (deep check) is active
        const isChildActiveRecursive = (items: NavEntry[]): boolean => {
            return items.some(item => {
                if (isNavHeader(item)) return false;
                if (isNavGroup(item)) return isChildActiveRecursive(item.children);
                return (item as NavItem).id === activeTab;
            });
        };

        const isChildActive = isChildActiveRecursive(group.children);
        const isOpen = openGroups[group.id] || false;

        // Permissions Check for Group using minLevel
        const userLevel = user?.role_level ?? 5;
        const requiredLevel = group.minLevel ?? 5;

        if (userLevel > requiredLevel) return null;

        // Also ensure at least one child is visible
        const visibleChildren = group.children.filter(child => {
            if (isNavHeader(child)) return true; // Headers don't block visibility

            const childReqLevel = (child as NavItem | NavGroup).minLevel ?? 5;
            if (userLevel > childReqLevel) return false;

            // Type guard for adminOnly check
            if (!isNavGroup(child) && !isNavHeader(child) && (child as NavItem).adminOnly && !isAdmin) return false;

            return true;
        });

        if (visibleChildren.length === 0) return null;

        return (
            <div key={group.id}>
                <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isChildActive ? 'bg-blue-600/20 text-blue-400' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                >
                    <group.icon size={20} />
                    {sidebarOpen && (
                        <>
                            <span className="font-medium flex-1 text-left">{group.label}</span>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                    )}
                </button>

                {sidebarOpen && isOpen && (
                    <div className="mt-1 border-l border-border space-y-1 ml-4">
                        {group.children.map((child) => {
                            if (isNavHeader(child)) return renderNavHeader(child);
                            if (isNavGroup(child)) return renderNavGroup(child);
                            return renderNavItem(child as NavItem, true);
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Main Content Renderer
    const renderContent = () => {
        // Special case for deep views
        if (activeTab === 'assets' && selectedAssetId) {
            if (assetViewMode === 'lifecycle') {
                return <AssetLifecycleView assetId={selectedAssetId} />;
            } else if (assetViewMode === 'details') {
                return <AssetDetailsView assetId={selectedAssetId} />;
            }
        }
        if (activeTab === 'work-orders' && selectedWorkOrderId) {
            return <WorkOrderDetailsView workOrderId={selectedWorkOrderId} />;
        }

        switch (activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'assets': return <AssetsView />;
            case 'categories': return <CategoriesView />;
            case 'inventory-categories': return <InventoryCategoriesView />;
            case 'inventory-items': return <InventoryItemsView />;
            case 'stock-opname': return <StockOpnameView />;
            case 'locations': return <LocationsView />;
            case 'work-orders': return <WorkOrdersView />;
            case 'conversions': return <ConversionsView />;
            case 'rentals':
                if (selectedRentalId) return <RentalDetailView rentalId={selectedRentalId} />;
                return <RentalsView />;
            case 'rental-form':
                return <RentalFormView />;
            case 'contracts': // Added
                if (selectedContractId) return <ContractDetailView />;
                return <ContractListView />;
            case 'approval-workflow-settings':
                return <ApprovalWorkflowSettingsView />;
            case 'contract-detail':
                return <ContractDetailView />;
            case 'contract-analytics':
                return <ContractAnalyticsView />;
            case 'contract-templates':
                return <ContractTemplatesView />;
            case 'clients': return <ClientsView />;
            case 'loans': return <LoansView />;
            case 'fuel': return <FuelView />;
            case 'employees': return <EmployeesView />;
            case 'attendance': return <AttendanceView />;
            case 'leaves': return <LeaveDashboardView />;
            case 'approvals': return <ApprovalCenterView />;
            case 'reports': return <ReportsView />;
            case 'users': return <UsersView />;
            case 'roles': return <RolesView />;
            case 'audit': return <AuditModeView />;
            case 'system-audit': return <AuditLogsView />;
            case 'departments': return <DepartmentsView />;
            case 'finance': return <ChartOfAccountsView />;
            case 'journal-entries': return <JournalEntriesView />;
            case 'journal-form': return <JournalEntryFormView />;
            case 'general-ledger': return <GeneralLedgerView />;
            case 'trial-balance': return <TrialBalanceView />;
            case 'financial-reports': return <FinancialReportsView />;
            case 'cash-bank': return <CashBankView />;
            case 'sales': return <SalesOverviewView />;
            case 'sales-overview': return <SalesOverviewView />;
            case 'sales-quotes': return <SalesQuotesView />;
            case 'sales-orders': return <SalesOrdersView />;
            case 'sales-shipments': return <SalesShipmentsView />;
            case 'sales-invoices': return <SalesInvoicesView />;
            case 'purchase-overview':
                return <PurchaseOverviewView />;
            case 'purchase-quotes':
                return <PurchaseQuotesView />;
            case 'purchase-orders':
                return <PurchaseOrdersView />;
            case 'purchase-shipments':
                return <PurchaseShipmentsView />;
            case 'purchase-bills':
                return <PurchaseBillsView />;
            case 'maintenance-templates': return <MaintenanceTemplatesView />;
            case 'maintenance-schedules': return <MaintenanceSchedulesView />;
            case 'tax-renewals': return <TaxRenewalsView />;
            case 'purchases': // Fallback or remove if parent doesn't render content
                return <PurchaseOverviewView />; // Default to overview for the group
            case 'expenses': return <ExpensesView />;
            case 'asset-lifecycle': return <AssetLifecycleView />;
            case 'settings': return <SettingsView />;
            case 'analytics': return <AnalyticsDashboardView />;
            case 'profile': return <ProfileView />;
            default: return <DashboardView />;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
            fixed lg:static inset-y-0 left-0 z-50
            bg-card border-r border-border text-card-foreground 
            transition-all duration-300 ease-in-out flex flex-col
            ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-border gap-3">
                    <Logo collapsed={!sidebarOpen} />


                    {/* Desktop Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground hidden lg:block ml-auto transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white lg:hidden ml-auto transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 global-scrollbar">
                    {visibleNavItems.map((entry) => {
                        if (isNavHeader(entry)) return renderNavHeader(entry);
                        return isNavGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry as NavItem);
                    })}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-border">
                    {sidebarOpen && (
                        <div className="mb-4 px-2 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-border/50 shrink-0">
                                {user?.avatar_url ? (
                                    <img
                                        src={getImageUrl(user.avatar_url)}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=0D8ABC&color=fff`;
                                        }}
                                    />
                                ) : (
                                    user?.name?.charAt(0) || 'U'
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{user?.role}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-200"
                    >
                        <LogOut size={18} />
                        {sidebarOpen && <span className="font-medium text-sm">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content with Header */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 gap-4">

                    {/* Mobile Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground lg:hidden transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    <Logo className="lg:hidden" collapsed={false} />

                    {/* Back to Launchpad Button (For Non-Super Admin) */}
                    {user?.role !== 'super_admin' && (
                        <button
                            onClick={() => navigate('/launchpad')}
                            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            title="Back to Launchpad"
                        >
                            <LayoutDashboard size={18} />
                            <span>Menu Utama</span>
                        </button>
                    )}

                    <div className="flex-1" /> {/* Spacer */}

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="p-2 hover:bg-muted rounded-full relative transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <Bell size={22} />
                        </button>

                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-2xl border border-border z-50">
                                <div className="p-4 border-b border-border">
                                    <h3 className="font-semibold text-card-foreground">Notifikasi</h3>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-muted-foreground text-center">
                                        Tidak ada notifikasi baru
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <button
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-border/50">
                            {user?.avatar_url ? (
                                <img
                                    src={getImageUrl(user.avatar_url)}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=0D8ABC&color=fff`;
                                    }}
                                />
                            ) : (
                                user?.name?.charAt(0) || 'U'
                            )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-white leading-none mb-1">{user?.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none">
                                {user?.role}
                            </p>
                        </div>
                    </button>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-background p-6 global-scrollbar">
                    <Suspense fallback={<PageLoading />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Logout Modal */}
            {logoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Using Card for Modal consistency */}
                    <div className="bg-popover/50 backdrop-blur-xl border border-border p-6 rounded-2xl max-w-sm w-full shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-xl font-bold text-foreground mb-2">Konfirmasi Logout</h3>
                        <p className="text-muted-foreground mb-6">Apakah Anda yakin ingin keluar dari sistem?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors border border-border"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors"
                            >
                                Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
