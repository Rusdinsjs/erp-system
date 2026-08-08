// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigationStore } from '../store/useNavigationStore';
import {
    LayoutDashboard, Package, FolderTree, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle, Clock,
    Calendar as CalendarIcon, ArrowLeftRight, TrendingUp,
    Wallet, ShoppingCart, Receipt, History, Wrench, Fuel, Shield, Layers,
    CheckSquare, Box, Sun, Moon, ShieldAlert,
    Database, Mail
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import { PageLoading, Logo } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { useTheme } from '../contexts/ThemeContext';
import { AIChatWidget } from '../components/AI/AIChatWidget';
import type { MenuId, LaunchpadConfig } from '../config/launchpadConfig';
import { MENU_TO_RESOURCE, MENU_LABELS } from '../config/launchpadConfig';

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
const MaintenanceTeamsView = lazy(() => import('./Maintenance/MaintenanceTeams'));
const WorkflowBuilderView = lazy(() => import('./Settings/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));

const SettingsView = lazy(() => import('./Settings'));
const InventoryItemsView = lazy(() => import('./Inventory/InventoryItems'));
const InventoryDetailView = lazy(() => import('./Inventory/InventoryDetail'));
const InventoryCategoriesView = lazy(() => import('./Inventory/InventoryCategories'));
const StockOpnameView = lazy(() => import('./Inventory/StockOpname'));
const TaxRenewalsView = lazy(() => import('./TaxRenewals/TaxRenewals'));

const ExpensesView = lazy(() => import('./Finance/Expenses'));
const AnalyticsDashboardView = lazy(() => import('./AnalyticsDashboard'));
const MetadataEditorView = lazy(() => import('./Metadata/MetadataEditor'));
const CompanyManagementView = lazy(() => import('./Company/CompanyManagement').then(m => ({ default: m.CompanyManagement })));
const BranchView = lazy(() => import('./Organization/Branch'));
const EmailAccountView = lazy(() => import('./Organization/EmailAccount'));

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
    | 'companies'
    | 'company'
    | 'branch'
    | 'email-account'
    | 'metadata-editor'
    | 'analytics'
    | 'profile';

interface NavItem {
    id: TabId;
    icon: any;
    label: string;
    adminOnly?: boolean;
    minLevel?: number; // 1=SuperAdmin, 2=Admin, 3=Manager, 4=Staff, 5=Viewer
    showBadge?: boolean;
}

interface NavGroup {
    id: string;
    label: string;
    icon: any;
    children: NavEntry[];
    minLevel?: number;
    showBadge?: boolean;
}

interface NavHeader {
    type: 'header';
    label: string;
    minLevel?: number;
}

type NavEntry = NavItem | NavGroup | NavHeader;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
    return 'children' in entry;
};

const isNavHeader = (entry: NavEntry): entry is NavHeader => {
    return 'type' in entry && entry.type === 'header';
};

// Master registry of all navigation items in the application
const ALL_NAV_ITEMS: Record<string, NavItem> = {
    'dashboard': { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Overview', minLevel: 5 },
    'analytics': { id: 'analytics', icon: TrendingUp, label: 'Performance Analytics', minLevel: 3 },
    'reports': { id: 'reports', icon: FileText, label: 'Management Reports', minLevel: 3 },

    'assets': { id: 'assets', icon: Box, label: 'All Assets', minLevel: 5 },
    'asset-lifecycle': { id: 'asset-lifecycle', icon: History, label: 'Asset Lifecycle', minLevel: 4 },
    'categories': { id: 'categories', icon: FolderTree, label: 'Asset Categories', minLevel: 4 },
    'locations': { id: 'locations', icon: MapPin, label: 'Locations', minLevel: 4 },
    'asset-audit': { id: 'asset-audit', icon: Scan, label: 'Asset Audit', minLevel: 4 },

    'inventory-items': { id: 'inventory-items', icon: Package, label: 'Items', minLevel: 4 },
    'inventory-categories': { id: 'inventory-categories', icon: FolderTree, label: 'Inventory Categories', minLevel: 4 },
    'stock-opname': { id: 'stock-opname', icon: Scan, label: 'Stock Opname', minLevel: 3 },
    'conversions': { id: 'conversions', icon: ArrowLeftRight, label: 'Conversions', minLevel: 3 },

    'purchase-bills': { id: 'purchase-bills', icon: FileText, label: 'Vendor Bills', minLevel: 3 },

    'work-orders': { id: 'work-orders', icon: ClipboardCheck, label: 'Work Orders', minLevel: 4 },
    'maintenance-schedules': { id: 'maintenance-schedules', icon: CalendarIcon, label: 'PM Schedules', minLevel: 3 },
    'maintenance-templates': { id: 'maintenance-templates', icon: FileText, label: 'Maintenance SOP', minLevel: 3 },
    'maintenance-teams': { id: 'maintenance-teams', icon: Users, label: 'Maintenance Teams', minLevel: 3 },
    'fuel': { id: 'fuel', icon: Fuel, label: 'Fuel Management', minLevel: 4 },
    'tax-renewals': { id: 'tax-renewals', icon: Receipt, label: 'Tax & Documents', minLevel: 3 },

    'rentals': { id: 'rentals', icon: Truck, label: 'Rental Orders', minLevel: 4 },
    'contracts': { id: 'contracts', icon: FileText, label: 'Contracts', minLevel: 4 },
    'contract-templates': { id: 'contract-templates', icon: Settings, label: 'Templates', minLevel: 3 },
    'loans': { id: 'loans', icon: HandMetal, label: 'Internal Loans', minLevel: 5 },

    'sales-invoices': { id: 'sales-invoices', icon: FileText, label: 'Sales Invoices', minLevel: 3 },
    'clients': { id: 'clients', icon: Building2, label: 'Clients / Partners', minLevel: 4 },

    'finance': { id: 'finance', icon: FolderTree, label: 'Chart of Accounts', minLevel: 2 },
    'cash-bank': { id: 'cash-bank', icon: Wallet, label: 'Cash & Bank', minLevel: 2 },
    'expenses': { id: 'expenses', icon: Receipt, label: 'Expenses (Opex/Capex)', minLevel: 2 },
    'journal-entries': { id: 'journal-entries', icon: FileText, label: 'Journal Entries', minLevel: 2 },
    'financial-reports': { id: 'financial-reports', icon: TrendingUp, label: 'Reports', minLevel: 2 },

    'employees': { id: 'employees', icon: Users, label: 'Employees', minLevel: 3 },
    'departments': { id: 'departments', icon: Building2, label: 'Departments', minLevel: 3 },
    'attendance': { id: 'attendance', icon: Clock, label: 'Attendance', minLevel: 3 },
    'leaves': { id: 'leaves', icon: CalendarIcon, label: 'Leaves', minLevel: 3 },

    'approvals': { id: 'approvals', icon: CheckSquare, label: 'Approval Center', minLevel: 3, showBadge: true },

    'users': { id: 'users', icon: Users, label: 'User Operations', minLevel: 2 },
    'roles': { id: 'roles', icon: Shield, label: 'Access Rights', minLevel: 1 },
    'approval-workflow-settings': { id: 'approval-workflow-settings', icon: Layers, label: 'Workflows', minLevel: 1 },
    'audit': { id: 'audit', icon: History, label: 'Audit Logs', minLevel: 2 },
    'companies': { id: 'companies', icon: Building2, label: 'Companies (Entitas)', minLevel: 2 },
    'company': { id: 'company', icon: Building2, label: 'Company Management', minLevel: 2 },
    'branch': { id: 'branch', icon: Building2, label: 'Branch Management', minLevel: 2 },
    'email-account': { id: 'email-account', icon: Mail, label: 'Email Accounts', minLevel: 2 },
    'settings': { id: 'settings', icon: Settings, label: 'App Settings', minLevel: 2 },
    'metadata-editor': { id: 'metadata-editor', icon: Database, label: 'Metadata & Schema', minLevel: 1, adminOnly: true },
    'profile': { id: 'profile', icon: UserCircle, label: 'My Profile', minLevel: 5 },
};


export default function AdminDashboard() {
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const { activeModule, setActiveModule, getVisibleMenuIds, launchpadConfig, setLaunchpadConfig } = useNavigationStore();

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
        inventory_group: false,
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

    const { user, logout, hasPermission } = useAuthStore();
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

    // Sync backend launchpad_config with navigation store
    useEffect(() => {
        if (publicSettings?.launchpad_config) {
            try {
                const backendConfig = typeof publicSettings.launchpad_config === 'string'
                    ? JSON.parse(publicSettings.launchpad_config)
                    : publicSettings.launchpad_config;
                if (backendConfig && Array.isArray(backendConfig.modules)) {
                    if (!backendConfig.modules.some((m: any) => m.id === 'organization')) {
                        backendConfig.modules.unshift(DEFAULT_LAUNCHPAD_CONFIG.modules[0]);
                    }
                    backendConfig.modules = backendConfig.modules.map((m: any) => {
                        if (m.id === 'asset-management') {
                            const ids = m.menuIds || [];
                            if (!ids.includes('conversions')) ids.push('conversions');
                            return { ...m, menuIds: ids };
                        }
                        if (m.id === 'commercial') {
                            const ids = m.menuIds || [];
                            if (!ids.includes('purchase-bills')) ids.push('purchase-bills');
                            return { ...m, menuIds: ids };
                        }
                        if (m.id === 'supply-chain') {
                            const ids = (m.menuIds || []).filter((id: string) => id !== 'conversions' && id !== 'purchase-bills');
                            return { ...m, menuIds: ids };
                        }
                        return m;
                    });
                    setLaunchpadConfig(backendConfig as LaunchpadConfig);
                }
            } catch {
                // Ignore parse errors
            }
        }
    }, [publicSettings, setLaunchpadConfig]);

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

    // Auto-detect module from current tab when no module is set
    // (e.g., direct URL access without going through Launchpad)
    useEffect(() => {
        if (!activeModule && activeTab !== 'dashboard') {
            const menuId = activeTab as MenuId;
            const matchingModule = launchpadConfig.modules.find(m =>
                m.menuIds.includes(menuId)
            );
            if (matchingModule) {
                setActiveModule(matchingModule.id);
            }
        }
    }, [activeTab, activeModule, launchpadConfig, setActiveModule]);

    // Dynamically construct navItems structure based on launchpadConfig
    const navItems: NavEntry[] = useMemo(() => {
        const getModuleMenuIds = (moduleId: string): string[] => {
            const mod = launchpadConfig?.modules?.find(m => m.id === moduleId);
            return mod ? mod.menuIds : [];
        };

        const fieldOpsIds = getModuleMenuIds('field-operations');
        const rawCommercialIds = getModuleMenuIds('commercial');
        // Exclude items assigned to field-operations from commercialIds so they move exclusively
        const commercialIds = rawCommercialIds.filter(id => !fieldOpsIds.includes(id));
        const assetIds = getModuleMenuIds('asset-management');
        const supplyChainIds = getModuleMenuIds('supply-chain');
        const financeIds = getModuleMenuIds('finance');
        const hrIds = getModuleMenuIds('hr');
        const adminIds = getModuleMenuIds('admin');
        const insightsIds = getModuleMenuIds('insights');
        const organizationIds = getModuleMenuIds('organization');

        const getGroupItems = (moduleIds: string[], preferredOrder: string[], allowedFilter?: string[]) => {
            const result: NavItem[] = [];
            const activeIds = moduleIds.length > 0
                ? Array.from(new Set([...moduleIds, ...preferredOrder.filter(id => !allowedFilter || allowedFilter.includes(id))]))
                : preferredOrder;

            preferredOrder.forEach(id => {
                if (activeIds.includes(id) && ALL_NAV_ITEMS[id] && (!allowedFilter || allowedFilter.includes(id))) {
                    result.push(ALL_NAV_ITEMS[id]);
                }
            });
            activeIds.forEach(id => {
                if (!preferredOrder.includes(id) && ALL_NAV_ITEMS[id] && (!allowedFilter || allowedFilter.includes(id))) {
                    result.push(ALL_NAV_ITEMS[id]);
                }
            });
            return result;
        };

        return [
            ALL_NAV_ITEMS['dashboard'],
            ...(insightsIds.length === 0 || insightsIds.includes('analytics') ? [ALL_NAV_ITEMS['analytics']] : []),
            ...(insightsIds.length === 0 || insightsIds.includes('reports') ? [ALL_NAV_ITEMS['reports']] : []),
            {
                id: 'organization_group',
                label: 'Organization',
                icon: Building2,
                minLevel: 2,
                children: [
                    ...getGroupItems(organizationIds, ['company', 'branch', 'departments', 'users', 'roles', 'email-account', 'approval-workflow-settings'],
                        ['company', 'branch', 'departments', 'users', 'roles', 'email-account', 'approval-workflow-settings']),
                ],
            },
            {
                id: 'asset_operations',
                label: 'Assets',
                icon: Box,
                minLevel: 5,
                children: getGroupItems(assetIds, ['assets', 'categories', 'maintenance-templates', 'asset-lifecycle', 'asset-audit'], ['assets', 'categories', 'maintenance-templates', 'asset-lifecycle', 'asset-audit'])
            },
            {
                id: 'inventory_group',
                label: 'Inventory',
                icon: Package,
                minLevel: 4,
                children: getGroupItems(supplyChainIds, ['inventory-items', 'stock-opname'], ['inventory-items', 'stock-opname'])
            },
            {
                id: 'maintenance_group',
                label: 'Field Operations',
                icon: Wrench,
                minLevel: 5,
                children: getGroupItems(fieldOpsIds, ['work-orders', 'maintenance-schedules', 'maintenance-teams', 'fuel', 'tax-renewals', 'loans'], ['work-orders', 'maintenance-schedules', 'maintenance-teams', 'fuel', 'tax-renewals', 'loans'])
            },
            {
                id: 'rental_module',
                label: 'Rental & Contracts',
                icon: Truck,
                minLevel: 4,
                children: getGroupItems(commercialIds, ['rentals', 'contracts'], ['rentals', 'contracts'])
            },
            {
                id: 'procurement_group',
                label: 'Procurement',
                icon: ShoppingCart,
                minLevel: 3,
                children: getGroupItems(commercialIds, ['purchase-bills'], ['purchase-bills'])
            },
            {
                id: 'commercial_group',
                label: 'Commercial',
                icon: TrendingUp,
                minLevel: 3,
                children: getGroupItems(commercialIds, ['sales-invoices', 'clients'], ['sales-invoices', 'clients'])
            },
            {
                id: 'finance_group',
                label: 'Finance',
                icon: Wallet,
                minLevel: 2,
                children: getGroupItems(financeIds, ['finance', 'cash-bank', 'expenses', 'journal-entries', 'financial-reports'])
            },
            {
                id: 'hr_group',
                label: 'Human Resources',
                icon: Users,
                minLevel: 3,
                children: getGroupItems(hrIds, ['employees', 'attendance', 'leaves'])
            },
            {
                id: 'settings_group',
                label: 'Configuration',
                icon: Settings,
                minLevel: 2,
                children: [
                    { type: 'header', label: 'Master Data' },
                    ...getGroupItems(adminIds, ['inventory-categories', 'locations'], ['inventory-categories', 'locations']),
                    { type: 'header', label: 'Operational Templates' },
                    ...getGroupItems(adminIds, ['contract-templates'], ['contract-templates']),
                    { type: 'header', label: 'Approvals & Audit' },
                    ...getGroupItems(adminIds, ['approvals', 'audit', 'settings'], ['approvals', 'audit', 'settings']),
                ]
            },
        ];
    }, [launchpadConfig]);

    // Filtered Nav Items based on active Launchpad module
    const visibleNavItems = useMemo(() => {
        // Get visible menu IDs from the navigation store
        const visibleMenuIds = getVisibleMenuIds();

        // No module selected → show all menus (fallback)
        if (!activeModule) return navItems;

        // Helper: collect all leaf menu IDs from a nav entry
        const getLeafIds = (entry: NavEntry): string[] => {
            if (isNavHeader(entry)) return [];
            if (isNavGroup(entry)) {
                return entry.children.flatMap(getLeafIds);
            }
            return [(entry as NavItem).id];
        };

        // Filter: keep items/groups that have at least one visible menu ID
        return navItems.filter(item => {
            if (isNavHeader(item)) {
                // Show header if the next non-header item would be visible
                // (handled by rendering — headers without following content are harmless)
                return true;
            }

            const leafIds = getLeafIds(item);
            return leafIds.some(id => visibleMenuIds.includes(id as MenuId));
        });
    }, [user, activeModule, getVisibleMenuIds, navItems]);


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
        const menuId = item.id as MenuId;
        const resourceId = MENU_TO_RESOURCE[menuId] || menuId.replace(/-/g, '_');

        let hasAccess = hasPermission(`${resourceId}.read`) ||
            hasPermission(`${resourceId}.view`) ||
            hasPermission(`${resourceId}.*`);

        if (!hasAccess && resourceId === 'work_order') {
            hasAccess = hasPermission('maintenance.read') || hasPermission('maintenance.view') || hasPermission('maintenance.*');
        }
        if (!hasAccess && resourceId === 'approval_center') {
            hasAccess = hasPermission('approval_center.read') || hasPermission('approval_center.view') || hasPermission('approval_center.*') || hasPermission('maintenance.approve') || hasPermission('work_order.approve_cost');
        }

        if (!hasAccess) return null;

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

        // Also ensure at least one child is visible
        const visibleMenuIds = getVisibleMenuIds();

        const isItemVisible = (entry: NavEntry): boolean => {
            if (isNavHeader(entry)) return false;
            if (isNavGroup(entry)) {
                return entry.children.some(isItemVisible);
            }
            const item = entry as NavItem;
            const menuId = item.id as MenuId;
            const resourceId = MENU_TO_RESOURCE[menuId] || menuId.replace(/-/g, '_');

            // Check read, view, or wildcard permission
            let hasAccess = hasPermission(`${resourceId}.read`) ||
                hasPermission(`${resourceId}.view`) ||
                hasPermission(`${resourceId}.*`);

            // Fallback resource mapping
            if (!hasAccess && resourceId === 'work_order') {
                hasAccess = hasPermission('maintenance.read') || hasPermission('maintenance.view') || hasPermission('maintenance.*');
            }
            if (!hasAccess && resourceId === 'approval_center') {
                hasAccess = hasPermission('approval_center.read') || hasPermission('approval_center.view') || hasPermission('approval_center.*') || hasPermission('maintenance.approve') || hasPermission('work_order.approve_cost');
            }

            if (!hasAccess) {
                return false;
            }

            if (item.adminOnly && !isAdmin) {
                return false;
            }

            if (activeModule && !visibleMenuIds.includes(menuId)) {
                return false;
            }

            return true;
        };

        const visibleChildren = group.children.filter((child, idx, array) => {
            if (isNavHeader(child)) {
                const remaining = array.slice(idx + 1);
                const nextHeaderIdx = remaining.findIndex(isNavHeader);
                const sectionItems = nextHeaderIdx >= 0 ? remaining.slice(0, nextHeaderIdx) : remaining;
                return sectionItems.some(isItemVisible);
            }
            return isItemVisible(child);
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
                        {visibleChildren.map((child) => {
                            if (isNavHeader(child)) return renderNavHeader(child);
                            if (isNavGroup(child)) return renderNavGroup(child);
                            return renderNavItem(child as NavItem, true);
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Access Denied View
    const renderAccessDenied = () => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-card/40 backdrop-blur border border-border/40 rounded-2xl shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
                <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Akses Dibatasi (403 Forbidden)</h2>
            <p className="text-muted-foreground max-w-md text-sm mb-6">
                Peran atau hak akses akun Anda tidak memiliki izin untuk membuka modul ini. Silakan hubungi Administrator jika Anda memerlukan akses.
            </p>
            <button
                onClick={() => { setActiveTab('dashboard'); navigate('/dashboard'); }}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
                Kembali ke Dashboard
            </button>
        </div>
    );

    // Main Content Renderer
    const renderContent = () => {
        // Route Authorization Guard
        if (activeTab !== 'dashboard' && activeTab !== 'profile') {
            const menuId = activeTab as MenuId;
            const resourceId = MENU_TO_RESOURCE[menuId] || activeTab.replace(/-/g, '_');

            let hasAccess = hasPermission(`${resourceId}.read`) ||
                hasPermission(`${resourceId}.view`) ||
                hasPermission(`${resourceId}.*`);

            if (!hasAccess && resourceId === 'work_order') {
                hasAccess = hasPermission('maintenance.read') || hasPermission('maintenance.view') || hasPermission('maintenance.*');
            }
            if (!hasAccess && resourceId === 'approval_center') {
                hasAccess = hasPermission('approval_center.read') || hasPermission('approval_center.view') || hasPermission('approval_center.*') || hasPermission('maintenance.approve') || hasPermission('work_order.approve_cost');
            }

            if (!hasAccess) {
                return renderAccessDenied();
            }
        }

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
                return <WorkflowBuilderView />;
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
            case 'departments': return <DepartmentsView />;
            case 'companies': return <CompanyManagementView />;
            case 'company': return <CompanyManagementView />;
            case 'branch': return <BranchView />;
            case 'email-account': return <EmailAccountView />;
            case 'audit': return <AuditLogsView />;
            case 'asset-audit': return <AuditModeView />;
            case 'system-audit': return <AuditLogsView />;
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
            case 'metadata-editor':
                return <MetadataEditorView />;
            case 'maintenance-templates': return <MaintenanceTemplatesView />;
            case 'maintenance-schedules': return <MaintenanceSchedulesView />;
            case 'maintenance-teams': return <MaintenanceTeamsView />;
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
                className={`flex-none bg-card/80 backdrop-blur-xl border-r border-border transition-all duration-300 ease-in-out flex flex-col relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]
                ${sidebarOpen ? 'w-64' : 'w-20'} 
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
                absolute lg:relative h-full`}
            >
                {/* Brand / Logo & Toggle */}
                <div className="h-16 flex items-center px-4 border-b border-border gap-2">
                    <div
                        className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                        onClick={() => { setActiveModule(null); navigate('/launchpad'); }}
                        title="Kembali ke Launchpad"
                    >
                        <Logo collapsed={!sidebarOpen} />
                    </div>

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground hidden lg:block transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white lg:hidden transition-colors"
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
                        <button
                            onClick={() => { setActiveTab('profile'); navigate('/profile'); }}
                            className="mb-4 px-2 py-1.5 flex items-center gap-3 w-full text-left rounded-xl hover:bg-muted/80 transition-all border border-transparent hover:border-border cursor-pointer group"
                            title="Buka Profil Saya"
                        >
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-border/50 shrink-0 group-hover:scale-105 transition-transform">
                                {user?.avatar_url ? (
                                    <img
                                        src={getImageUrl(user.avatar_url)}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
                                            (e.target as HTMLImageElement).src = isAdmin ? '/avatar-admin.png' : '/avatar-user.png';
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={user?.role === 'admin' || user?.role === 'super_admin' ? '/avatar-admin.png' : '/avatar-user.png'}
                                        alt={user?.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{user?.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{user?.role}</p>
                            </div>
                        </button>
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

                    {/* Sidebar Toggle Button (Mobile Only) */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 -ml-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors lg:hidden"
                    >
                        <Menu size={24} />
                    </button>

                    <Logo className="lg:hidden" collapsed={false} />

                    {/* Back to Launchpad Button & Breadcrumb */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setActiveModule(null); navigate('/launchpad'); }}
                            className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            title="Kembali ke Menu Utama / Launchpad"
                        >
                            <LayoutDashboard size={18} />
                            <span className="hidden sm:inline">Menu Utama</span>
                        </button>

                        {activeTab !== 'dashboard' && MENU_LABELS[activeTab as MenuId] && (
                            <>
                                <span className="text-muted-foreground/40 text-xs hidden sm:inline">/</span>
                                <span className="text-xs font-semibold text-foreground/80 bg-muted/50 px-2.5 py-1 rounded-md hidden sm:inline border border-border/50">
                                    {MENU_LABELS[activeTab as MenuId]}
                                </span>
                            </>
                        )}
                    </div>

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
                        onClick={() => { setActiveTab('profile'); navigate('/profile'); }}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer group"
                        title="Buka Profil Saya"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-border/50">
                            {user?.avatar_url ? (
                                <img
                                    src={getImageUrl(user.avatar_url)}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
                                        (e.target as HTMLImageElement).src = isAdmin ? '/avatar-admin.png' : '/avatar-user.png';
                                    }}
                                />
                            ) : (
                                <img
                                    src={user?.role === 'admin' || user?.role === 'super_admin' ? '/avatar-admin.png' : '/avatar-user.png'}
                                    alt={user?.name}
                                    className="w-full h-full object-cover"
                                />
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
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative z-10 global-scrollbar p-6 lg:p-8">
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
