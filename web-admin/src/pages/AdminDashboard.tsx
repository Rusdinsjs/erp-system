// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, Package, FolderTree, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle, Clock,
    Calendar as CalendarIcon, ArrowLeftRight, Scale, TrendingUp,
    Wallet, ShoppingCart, ShoppingBag, Receipt, History, Calculator, Wrench, Fuel, Shield, Layers
} from 'lucide-react';
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
const StockOpnameView = lazy(() => import('./Inventory/StockOpname')); // Added StockOpname import (default export)

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
}

interface NavGroup {
    id: string;
    label: string;
    icon: any;
    children: NavEntry[];
    minLevel?: number;
    showBadge?: boolean;
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
    return 'children' in entry;
};

// Navigation structure
const navItems: NavEntry[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', minLevel: 5 },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics', minLevel: 3 },
    {
        id: 'asset_management_group',
        label: 'Asset Management',
        icon: Package,
        minLevel: 5,
        children: [
            { id: 'assets', icon: Package, label: 'Daftar Aset', minLevel: 5 },
            { id: 'loans', icon: HandMetal, label: 'Peminjaman Internal', minLevel: 5 },
            { id: 'fuel', icon: Fuel, label: 'Fuel / BBM', minLevel: 5 },
            { id: 'work-orders', icon: Wrench, label: 'Work Orders', minLevel: 4 },
            { id: 'maintenance-schedules', icon: CalendarIcon, label: 'Jadwal Servis (PM)', minLevel: 3 },
            { id: 'maintenance-templates', icon: FileText, label: 'Maintenance Templates', minLevel: 3 },
            { id: 'asset-lifecycle', icon: History, label: 'Lifecycle (Audit)', minLevel: 3 },
        ]
    },
    {
        id: 'rental_group',
        label: 'Rental Management',
        icon: Truck,
        minLevel: 4,
        children: [
            { id: 'rentals', icon: Truck, label: 'Daftar Rental', minLevel: 4 },
            { id: 'contracts', icon: FileText, label: 'Kontrak', minLevel: 4 },
            { id: 'contract-templates', icon: Settings, label: 'Template Kontrak', minLevel: 3 },
        ]
    },
    {
        id: 'finance_group',
        label: 'Akuntansi',
        icon: FolderTree,
        minLevel: 3, // Managers/Admins only
        children: [
            { id: 'cash-bank', icon: Wallet, label: 'Kas & Bank', minLevel: 3 },
            {
                id: 'sales_group',
                label: 'Penjualan',
                icon: ShoppingCart,
                minLevel: 3,
                children: [
                    { id: 'sales-overview', icon: TrendingUp, label: 'Overview', minLevel: 3 },
                    { id: 'sales-invoices', icon: FileText, label: 'Tagihan Penjualan', minLevel: 3 },
                    { id: 'sales-shipments', icon: Truck, label: 'Pengiriman Penjualan', minLevel: 3 },
                    { id: 'sales-orders', icon: ShoppingCart, label: 'Pesanan Penjualan', minLevel: 3 },
                    { id: 'sales-quotes', icon: Calculator, label: 'Penawaran Penjualan', minLevel: 3 },
                ]
            },
            {
                id: 'purchases',
                label: 'Pembelian',
                icon: ShoppingBag,
                minLevel: 3,
                children: [
                    { id: 'purchase-overview', icon: TrendingUp, label: 'Overview' },
                    { id: 'purchase-bills', icon: FileText, label: 'Tagihan Pembelian' },
                    { id: 'purchase-shipments', icon: Truck, label: 'Pengiriman Pembelian' },
                    { id: 'purchase-orders', icon: ShoppingBag, label: 'Pesanan Pembelian' },
                    { id: 'purchase-quotes', icon: Calculator, label: 'Penawaran Pembelian' },
                ]
            },
            { id: 'expenses', icon: Receipt, label: 'Biaya', minLevel: 3 },
            {
                id: 'finance_group_continued',
                label: 'Akuntansi Lanjutan',
                icon: FolderTree,
                minLevel: 3, // Changed to 3 (Manager) to allow COA access
                children: [
                    { id: 'finance', icon: FolderTree, label: 'Daftar Akun' },
                    { id: 'journal-entries', icon: FileText, label: 'Jurnal Umum' },
                    { id: 'general-ledger', icon: ArrowLeftRight, label: 'Buku Besar' },
                    { id: 'trial-balance', icon: Scale, label: 'Neraca Saldo' },
                    { id: 'financial-reports', icon: TrendingUp, label: 'Laporan Keuangan' },
                ]
            }
        ]
    },
    {
        id: 'hrd_group',
        label: 'HR Management',
        icon: Users,
        minLevel: 3,
        children: [
            { id: 'employees', icon: Users, label: 'Karyawan' },
            { id: 'attendance', icon: Clock, label: 'Absensi' },
            { id: 'leaves', icon: CalendarIcon, label: 'Cuti / Izin' },
        ]
    },
    {
        id: 'inventory_group',
        label: 'Inventory',
        icon: ShoppingBag,
        minLevel: 4,
        children: [
            { id: 'inventory-items', icon: Package, label: 'Daftar Barang', minLevel: 4 },
            { id: 'stock-opname', icon: ClipboardCheck, label: 'Stock Opname', minLevel: 3 }, // Added Stock Opname
        ]
    },
    {
        id: 'master_data',
        label: 'Master Data',
        icon: Building2,
        minLevel: 3,
        children: [
            { id: 'clients', icon: Building2, label: 'Klien' },
            { id: 'locations', icon: MapPin, label: 'Lokasi' },
            { id: 'categories', icon: FolderTree, label: 'Kategori Aset' },
            { id: 'inventory-categories', icon: FolderTree, label: 'Kategori Inventori' },
            { id: 'departments', icon: Building2, label: 'Departemen' },
        ]
    },
    { id: 'approvals', icon: ClipboardCheck, label: 'Approval Center', minLevel: 3, showBadge: true },
    { id: 'reports', icon: FileText, label: 'Laporan', minLevel: 3 },
    {
        id: 'settings_group',
        label: 'Pengaturan',
        icon: Settings,
        minLevel: 5, // Profile is here, so group must be visible
        children: [
            { id: 'users', icon: Users, label: 'User Management', minLevel: 2 },
            { id: 'roles', icon: Shield, label: 'Role & Permissions', minLevel: 2 },
            { id: 'approval-workflow-settings', icon: Layers, label: 'Approval Workflows', minLevel: 2 },
            { id: 'audit', icon: Scan, label: 'Audit Mode', minLevel: 2 },
            { id: 'system-audit', icon: History, label: 'System Logs', minLevel: 2 },
            { id: 'settings', icon: Settings, label: 'General Settings', minLevel: 2 },
            { id: 'profile', icon: UserCircle, label: 'Profil', minLevel: 5 },
        ]
    },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        asset_management_group: false,
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
            setOpenGroups(prev => ({ ...prev, asset_management_group: true }));
            return;
        }

        const assetDetailMatch = matchPath('/assets/:id', path);
        if (assetDetailMatch?.params.id) {
            setActiveTab('assets');
            setSelectedAssetId(assetDetailMatch.params.id);
            setAssetViewMode('details');
            setSelectedWorkOrderId(null);
            setOpenGroups(prev => ({ ...prev, asset_management_group: true }));
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
            setOpenGroups(prev => ({ ...prev, asset_management_group: true }));
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
                    return items.find(i => i.id === 'asset_management_group') as NavGroup;
                }

                for (const item of items) {
                    if (isNavGroup(item)) {
                        // Check immediate children
                        if (item.children.some(child => child.id === targetId)) {
                            return item;
                        }
                        // Check nested children (recursion)
                        const foundInChild = findParentGroup(item.children, targetId);
                        if (foundInChild) return item; // Return this group as it is a parent (or ancestor)
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
                    setOpenGroups(prev => ({ ...prev, asset_management_group: true }));
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

    // Check if user is admin
    const isAdmin = (user?.role_level ?? 5) <= 2;

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
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
                if (item.id === activeTab) return true;
                if (isNavGroup(item)) return isChildActiveRecursive(item.children);
                return false;
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
            const childReqLevel = child.minLevel ?? 5;
            if (userLevel > childReqLevel) return false;

            // Type guard for adminOnly check
            if (!isNavGroup(child) && child.adminOnly && !isAdmin) return false;

            return true;
        });

        if (visibleChildren.length === 0) return null;

        return (
            <div key={group.id}>
                <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isChildActive ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
                    <div className="mt-1 border-l border-gray-800 space-y-1 ml-4">
                        {group.children.map(child =>
                            isNavGroup(child)
                                ? renderNavGroup(child)
                                : renderNavItem(child as NavItem, true)
                        )}
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
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
            fixed lg:static inset-y-0 left-0 z-50
            bg-gray-900 border-r border-gray-800 text-white 
            transition-all duration-300 ease-in-out flex flex-col
            ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-gray-800 gap-3">
                    <Logo collapsed={!sidebarOpen} />


                    {/* Desktop Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white hidden lg:block ml-auto transition-colors"
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
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto global-scrollbar">
                    {navItems.map((entry) =>
                        isNavGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry)
                    )}
                </nav>

                {/* User & Logout */}
                <div className="p-4 border-t border-gray-800">
                    {sidebarOpen && (
                        <div className="mb-3 px-2">
                            <p className="text-sm font-medium text-gray-200">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-all duration-200"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content with Header */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 gap-4">

                    {/* Mobile Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white lg:hidden transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    <Logo className="lg:hidden" collapsed={false} />

                    <div className="flex-1" /> {/* Spacer */}

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="p-2 hover:bg-gray-800 rounded-full relative transition-colors text-gray-400 hover:text-white"
                        >
                            <Bell size={22} />
                        </button>

                        {/* Notification Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 z-50">
                                <div className="p-4 border-b border-gray-800">
                                    <h3 className="font-semibold text-white">Notifikasi</h3>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-500 text-center">
                                        Tidak ada notifikasi baru
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <button
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {user?.name?.charAt(0) || 'U'}
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
                <main className="flex-1 overflow-y-auto bg-gray-900 p-6 global-scrollbar">
                    <Suspense fallback={<PageLoading />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Logout Modal */}
            {logoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Using Card for Modal consistency */}
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl max-w-sm w-full shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-xl font-bold text-white mb-2">Konfirmasi Logout</h3>
                        <p className="text-gray-400 mb-6">Apakah Anda yakin ingin keluar dari sistem?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors border border-gray-700"
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
