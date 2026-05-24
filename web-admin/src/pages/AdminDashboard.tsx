// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, Package, FolderTree, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle, Clock,
    Calendar as CalendarIcon, ArrowLeftRight, TrendingUp,
    Wallet, ShoppingCart, Receipt, History, Wrench, Fuel, Shield, Layers,
    CheckSquare, Box, Sun, Moon
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import { PageLoading, Logo } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { useTheme } from '../contexts/ThemeContext';
import { AIChatWidget } from '../components/AI/AIChatWidget';

// Import all views
const DashboardView = lazy(() => import('./Dashboard'));
const AssetsView = lazy(() => import('./Assets/Assets'));
const AssetDetailsView = lazy(() => import('./Assets/AssetDetails'));
const CategoriesView = lazy(() => import('./Assets/Categories'));
const WorkOrdersView = lazy(() => import('./WorkOrders/WorkOrders'));
const WorkOrderDetailsView = lazy(() => import('./WorkOrders/WorkOrderDetails'));
const ApprovalCenterView = lazy(() => import('./ApprovalCenter'));
const UsersView = lazy(() => import('./Users'));
const RolesView = lazy(() => import('./Roles'));
const ProfileView = lazy(() => import('./Profile'));
const ReportsView = lazy(() => import('./Reports/ReportCenter'));
const AuditModeView = lazy(() => import('./AuditMode'));
const AuditLogsView = lazy(() => import('./AuditLogs'));
const AssetLifecycleView = lazy(() => import('./Assets/AssetLifecycle'));
const ConversionsView = lazy(() => import('./Assets/Conversions'));
const FuelView = lazy(() => import('./Fuel/FuelDashboard'));
const RentalsView = lazy(() => import('./rentals/Rentals'));
const RentalFormView = lazy(() => import('./rentals/RentalForm'));
const RentalDetailView = lazy(() => import('./rentals/RentalDetail'));
const ContractListView = lazy(() => import('./Contracts/Contracts')); // Added ContractList
const ContractDetailView = lazy(() => import('./Contracts/ContractDetail')); // Added ContractDetail
const ContractAnalyticsView = lazy(() => import('./Contracts/ContractAnalytics')); // Added ContractAnalytics
const ContractTemplatesView = lazy(() => import('./Contracts/ContractTemplates')); // Added ContractTemplates
const ClientsView = lazy(() => import('./Clients'));
const LoansView = lazy(() => import('./Loans'));
const LocationsView = lazy(() => import('./Assets/Locations'));
const EmployeesView = lazy(() => import('./HR/Employees'));
const DepartmentsView = lazy(() => import('./HR/Departments'));
const AttendanceView = lazy(() => import('./HR/Attendance/AttendanceDashboard'));
const LeaveDashboardView = lazy(() => import('./HR/Leaves/LeaveDashboard'));
const ChartOfAccountsView = lazy(() => import('./Finance/ChartOfAccounts'));
const JournalEntriesView = lazy(() => import('./Finance/JournalEntries'));
const JournalEntryFormView = lazy(() => import('./Finance/JournalEntryForm'));
const GeneralLedgerView = lazy(() => import('./Finance/GeneralLedger'));
const TrialBalanceView = lazy(() => import('./Finance/TrialBalance'));
const FinancialReportsView = lazy(() => import('./Finance/FinancialReports'));

// Placeholder for new Kledo-style views (to be created)
const CashBankView = lazy(() => import('./Finance/CashBank'));
const SalesOverviewView = lazy(() => import('./Finance/SalesOverview'));
const SalesInvoicesView = lazy(() => import('./Finance/SalesInvoices'));
const SalesQuotesView = lazy(() => import('./Finance/SalesQuotes'));
const SalesOrdersView = lazy(() => import('./Finance/SalesOrders'));
const SalesShipmentsView = lazy(() => import('./Finance/SalesShipments'));
const PurchaseOverviewView = lazy(() => import('./Finance/PurchaseOverview'));
const PurchaseQuotesView = lazy(() => import('./Finance/PurchaseQuotes'));
const PurchaseOrdersView = lazy(() => import('./Finance/PurchaseOrders'));
const PurchaseShipmentsView = lazy(() => import('./Finance/PurchaseShipments'));
const PurchaseBillsView = lazy(() => import('./Finance/PurchaseBills'));
const MaintenanceTemplatesView = lazy(() => import('./Maintenance/MaintenanceTemplates'));
const MaintenanceSchedulesView = lazy(() => import('./Maintenance/MaintenanceSchedules'));
const ApprovalWorkflowSettingsView = lazy(() => import('./ApprovalWorkflowSettings'));
const SettingsView = lazy(() => import('./Settings'));
const InventoryItemsView = lazy(() => import('./Inventory/InventoryItems'));
const InventoryDetailView = lazy(() => import('./Inventory/InventoryDetail'));
const InventoryCategoriesView = lazy(() => import('./Inventory/InventoryCategories'));
const StockOpnameView = lazy(() => import('./Inventory/StockOpname'));
const TaxRenewalsView = lazy(() => import('./TaxRenewals/TaxRenewals'));

const ExpensesView = lazy(() => import('./Finance/Expenses'));
const AnalyticsDashboardView = lazy(() => import('./AnalyticsDashboard'));

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
    | 'asset-audit'
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

    { type: 'header', label: 'ASSET MANAGEMENT', minLevel: 5, context: 'assets' },
    {
        id: 'asset_operations',
        label: 'Assets',
        icon: Box,
        minLevel: 5,
        context: 'assets',
        children: [
            { id: 'assets', icon: Box, label: 'All Assets', minLevel: 5 },
            { id: 'asset-lifecycle', icon: History, label: 'Asset Lifecycle', minLevel: 4 },
            { id: 'categories', icon: FolderTree, label: 'Categories', minLevel: 4 },
            { id: 'locations', icon: MapPin, label: 'Locations', minLevel: 4 },
            { id: 'asset-audit', icon: Scan, label: 'Asset Audit', minLevel: 4 },
        ]
    },
    {
        id: 'inventory_group',
        label: 'Inventory',
        icon: Package,
        minLevel: 4,
        context: 'ops',
        children: [
            { id: 'inventory-items', icon: Package, label: 'Items', minLevel: 4 },
            { id: 'inventory-categories', icon: FolderTree, label: 'Categories', minLevel: 4 },
            { id: 'stock-opname', icon: Scan, label: 'Stock Opname', minLevel: 3 },
        ]
    },

    { type: 'header', label: 'OPERATIONS', minLevel: 5, context: 'ops' },
    {
        id: 'maintenance_group',
        label: 'Field Operations',
        icon: Wrench,
        minLevel: 5,
        context: 'ops',
        children: [
            { id: 'work-orders', icon: ClipboardCheck, label: 'Work Orders', minLevel: 4 },
            { id: 'conversions', icon: ArrowLeftRight, label: 'Conversions', minLevel: 3 },
            { id: 'maintenance-schedules', icon: CalendarIcon, label: 'PM Schedules', minLevel: 3 },
            { id: 'maintenance-templates', icon: FileText, label: 'SOP Templates', minLevel: 3 },
            { id: 'fuel', icon: Fuel, label: 'Fuel Management', minLevel: 4 },
            { id: 'loans', icon: HandMetal, label: 'Internal Loans', minLevel: 5 },
            { id: 'tax-renewals', icon: Receipt, label: 'Tax & Documents', minLevel: 3 },
        ]
    },
    {
        id: 'rental_module',
        label: 'Rental & Contracts',
        icon: Truck,
        minLevel: 4,
        context: 'ops',
        children: [
            { id: 'rentals', icon: Truck, label: 'Rental Orders', minLevel: 4 },
            { id: 'contracts', icon: FileText, label: 'Contracts', minLevel: 4 },
            { id: 'contract-templates', icon: Settings, label: 'Templates', minLevel: 3 },
        ]
    },

    { type: 'header', label: 'FINANCE & ACCOUNTING', minLevel: 2, context: 'finance' },
    {
        id: 'finance_group',
        label: 'Finance',
        icon: Wallet,
        minLevel: 2,
        context: 'finance',
        children: [
            { id: 'finance', icon: FolderTree, label: 'Chart of Accounts', minLevel: 2 },
            { id: 'cash-bank', icon: Wallet, label: 'Cash & Bank', minLevel: 2 },
            { id: 'expenses', icon: Receipt, label: 'Expenses (Opex/Capex)', minLevel: 2 },
            { id: 'journal-entries', icon: FileText, label: 'Journal Entries', minLevel: 2 },
            { id: 'financial-reports', icon: TrendingUp, label: 'Reports', minLevel: 2 },
        ]
    },
    {
        id: 'commercial_group',
        label: 'Commercial In/Out',
        icon: ShoppingCart,
        minLevel: 3,
        context: 'finance',
        children: [
            { id: 'sales-invoices', icon: FileText, label: 'Sales Invoices', minLevel: 3 },
            { id: 'purchase-bills', icon: FileText, label: 'Vendor Bills', minLevel: 3 },
        ]
    },

    { type: 'header', label: 'ORGANIZATION', minLevel: 3, context: 'hr' },
    {
        id: 'hr_group',
        label: 'Human Resources',
        icon: Users,
        minLevel: 3,
        context: 'hr',
        children: [
            { id: 'employees', icon: Users, label: 'Employees', minLevel: 3 },
            { id: 'departments', icon: Building2, label: 'Departments', minLevel: 3 },
            { id: 'attendance', icon: Clock, label: 'Attendance', minLevel: 3 },
            { id: 'leaves', icon: CalendarIcon, label: 'Leaves', minLevel: 3 },
        ]
    },
    { id: 'clients', icon: Building2, label: 'Clients / Partners', minLevel: 4, context: 'hr' },

    { type: 'header', label: 'SYSTEM', minLevel: 3, context: 'system' },
    { id: 'approvals', icon: CheckSquare, label: 'Approval Center', minLevel: 3, showBadge: true, context: 'system' },

    {
        id: 'settings_group',
        label: 'Configuration',
        icon: Settings,
        minLevel: 2,
        context: 'system',
        children: [
            { id: 'users', icon: Users, label: 'User Operations', minLevel: 2 },
            { id: 'roles', icon: Shield, label: 'Access Rights', minLevel: 1 },
            { id: 'approval-workflow-settings', icon: Layers, label: 'Workflows', minLevel: 1 },
            { id: 'audit', icon: History, label: 'Audit Logs', minLevel: 2 },
            { id: 'settings', icon: Settings, label: 'App Settings', minLevel: 2 },
            { id: 'profile', icon: UserCircle, label: 'My Profile', minLevel: 5 },
        ]
    },
];

export default function AdminDashboard() {
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };
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
    const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
    const [assetViewMode, setAssetViewMode] = useState<'list' | 'lifecycle' | 'details'>('list');
    const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
    const [selectedContractId] = useState<string | null>(null);

    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch public settings for dynamic branding
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: settingsApi.getPublic
    });

    // Update document title dynamically
    useEffect(() => {
        if (publicSettings?.app_name) {
            document.title = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} | ${publicSettings.app_name}`;
        } else {
            document.title = 'Asset Management System';
        }
    }, [activeTab, publicSettings]);

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
            setSelectedInventoryId(null);
            setOpenGroups(prev => ({ ...prev, asset_operations: true }));
            return;
        }

        const invMatch = matchPath('/inventory-items/:id', path);
        if (invMatch?.params.id) {
            setActiveTab('inventory-items');
            setSelectedInventoryId(invMatch.params.id);
            setSelectedAssetId(null);
            setSelectedWorkOrderId(null);
            setOpenGroups(prev => ({ ...prev, inventory_group: true }));
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
            case 'inventory-items': 
                if (selectedInventoryId) return <InventoryDetailView itemId={selectedInventoryId} />;
                return <InventoryItemsView />;
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
            case 'audit': return <AuditLogsView />;
            case 'asset-audit': return <AuditModeView />;
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
            bg-card/80 backdrop-blur-xl border-r border-border text-card-foreground 
            transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
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
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                {/* Global Ambient Background for Glassmorphism Context */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[100px]" />
                    <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
                </div>

                {/* Header */}
                <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 gap-4 relative z-10 shadow-sm">

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

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl bg-card/40 border border-border/60 hover:bg-card hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-300 backdrop-blur-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

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
                            <p className="text-sm font-medium text-foreground leading-none mb-1">{user?.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">
                                {user?.role}
                            </p>
                        </div>
                    </button>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10 global-scrollbar">
                    <Suspense fallback={<PageLoading />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Logout Modal */}
            {logoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <div className="bg-card/85 backdrop-blur-2xl border border-border/80 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Visual flourish */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        <h3 className="text-xl font-bold text-foreground mb-2 relative z-10">Konfirmasi Logout</h3>
                        <p className="text-muted-foreground mb-6 relative z-10">Apakah Anda yakin ingin keluar dari sistem?</p>
                        <div className="flex gap-3 relative z-10">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-muted/80 transition-colors border border-border cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors cursor-pointer"
                            >
                                Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <AIChatWidget />
        </div>
    );
}
