// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, Package, FolderTree, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle, Clock,
    Calendar as CalendarIcon, ArrowLeftRight, Scale, TrendingUp,
    Wallet, ShoppingCart, ShoppingBag, Receipt, History, Calculator
} from 'lucide-react';
import { PageLoading } from '../components/ui';

// Import all views
const DashboardView = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const AssetsView = lazy(() => import('./Assets').then(m => ({ default: m.Assets })));
const CategoriesView = lazy(() => import('./Categories').then(m => ({ default: m.Categories })));
const WorkOrdersView = lazy(() => import('./WorkOrders').then(m => ({ default: m.WorkOrders })));
const WorkOrderDetailsView = lazy(() => import('./WorkOrderDetails').then(m => ({ default: m.WorkOrderDetails })));
const ApprovalCenterView = lazy(() => import('./ApprovalCenter').then(m => ({ default: m.ApprovalCenter })));
const UsersView = lazy(() => import('./Users').then(m => ({ default: m.Users })));
const ProfileView = lazy(() => import('./Profile').then(m => ({ default: m.Profile })));
const ReportsView = lazy(() => import('./Reports'));
const AuditModeView = lazy(() => import('./AuditMode').then(m => ({ default: m.AuditMode })));
const AssetLifecycleView = lazy(() => import('./AssetLifecycle').then(m => ({ default: m.AssetLifecycle })));
const RentalsView = lazy(() => import('./rentals/Rentals').then(m => ({ default: m.Rentals })));
const RentalFormView = lazy(() => import('./rentals/RentalForm').then(m => ({ default: m.RentalForm })));
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

const ExpensesView = lazy(() => import('./Finance/Expenses').then(m => ({ default: m.Expenses })));

// Define the available tabs
type TabId =
    | 'dashboard'
    | 'assets'
    | 'categories'
    | 'locations'
    | 'work-orders'
    | 'rentals'
    | 'rental-form'
    | 'clients'
    | 'loans'
    | 'employees'
    | 'attendance'
    | 'leaves'
    | 'conversions'
    | 'approvals'
    | 'reports'
    | 'users'
    | 'audit'
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
    | 'expenses'
    | 'asset-lifecycle'
    | 'profile';

interface NavItem {
    id: TabId;
    icon: any;
    label: string;
    adminOnly?: boolean;
    showBadge?: boolean;
}

interface NavGroup {
    id: string;
    label: string;
    icon: any;
    children: NavEntry[];
    showBadge?: boolean;
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
    return 'children' in entry;
};

// Navigation structure
const navItems: NavEntry[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
        id: 'asset_management_group',
        label: 'Aset Tetap',
        icon: Package,
        children: [
            { id: 'assets', icon: Package, label: 'Daftar Aset' },
            { id: 'asset-lifecycle', icon: History, label: 'Lifecycle (Audit)' },
            { id: 'loans', icon: HandMetal, label: 'Peminjaman Internal' },
        ]
    },
    { id: 'rentals', icon: Truck, label: 'Rental Management' },
    {
        id: 'finance_group',
        label: 'Akuntansi',
        icon: FolderTree,
        children: [
            { id: 'cash-bank', icon: Wallet, label: 'Kas & Bank' },
            {
                id: 'sales_group',
                label: 'Penjualan',
                icon: ShoppingCart,
                children: [
                    { id: 'sales-overview', icon: TrendingUp, label: 'Overview' },
                    { id: 'sales-invoices', icon: FileText, label: 'Tagihan Penjualan' },
                    { id: 'sales-shipments', icon: Truck, label: 'Pengiriman Penjualan' },
                    { id: 'sales-orders', icon: ShoppingCart, label: 'Pesanan Penjualan' },
                    { id: 'sales-quotes', icon: Calculator, label: 'Penawaran Penjualan' },
                ]
            },
            {
                id: 'purchases',
                label: 'Pembelian',
                icon: ShoppingBag,
                children: [
                    { id: 'purchase-overview', icon: TrendingUp, label: 'Overview' },
                    { id: 'purchase-bills', icon: FileText, label: 'Tagihan Pembelian' },
                    { id: 'purchase-shipments', icon: Truck, label: 'Pengiriman Pembelian' },
                    { id: 'purchase-orders', icon: ShoppingBag, label: 'Pesanan Pembelian' },
                    { id: 'purchase-quotes', icon: Calculator, label: 'Penawaran Pembelian' },
                ]
            },
            { id: 'expenses', icon: Receipt, label: 'Biaya' },
            {
                id: 'finance_group_continued',
                label: 'Akuntansi Lanjutan',
                icon: FolderTree,
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
        label: 'HRD',
        icon: Users,
        children: [
            { id: 'employees', icon: Users, label: 'Karyawan' },
            { id: 'attendance', icon: Clock, label: 'Absensi' },
            { id: 'leaves', icon: CalendarIcon, label: 'Cuti / Izin' },
        ]
    },
    {
        id: 'master_data',
        label: 'Master Data',
        icon: Building2,
        children: [
            { id: 'clients', icon: Building2, label: 'Klien' },
            { id: 'locations', icon: MapPin, label: 'Lokasi' },
            { id: 'categories', icon: FolderTree, label: 'Kategori' },
            { id: 'departments', icon: Building2, label: 'Departemen' },
        ]
    },
    { id: 'approvals', icon: ClipboardCheck, label: 'Approval Center', showBadge: true },
    { id: 'reports', icon: FileText, label: 'Laporan' },
    {
        id: 'settings_group',
        label: 'Pengaturan',
        icon: Settings,
        children: [
            { id: 'users', icon: Users, label: 'User Management', adminOnly: true },
            { id: 'audit', icon: Scan, label: 'Audit Mode' },
            { id: 'profile', icon: UserCircle, label: 'Profil' },
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
        finance_group: true,
        sales_group: true, // Added for the new sales group
        purchases: true, // Added for the new purchases group
        finance_group_continued: true, // Added for the continued finance group
        settings_group: false
    });
    const [notifOpen, setNotifOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    // For sub-views that need parameters
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

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
            setSelectedWorkOrderId(null);
            setOpenGroups(prev => ({ ...prev, asset_management_group: true }));
            return;
        }

        const rentalFormMatch = matchPath('/rentals/new', path);
        if (rentalFormMatch) {
            setActiveTab('rental-form');
            return;
        }

        const woMatch = matchPath('/work-orders/:id', path);
        if (woMatch?.params.id) {
            setActiveTab('work-orders');
            setSelectedWorkOrderId(woMatch.params.id);
            setSelectedAssetId(null);
            setOpenGroups(prev => ({ ...prev, maintenance_group: true }));
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

            const foundGroup = findParentGroup(navItems, foundTab);

            if (foundGroup) {
                setOpenGroups(prev => ({ ...prev, [foundGroup.id]: true }));
            }
            setSelectedAssetId(null);
            setSelectedWorkOrderId(null);
        } else if (path === '/') {
            setActiveTab('dashboard');
            setSelectedAssetId(null);
            setSelectedWorkOrderId(null);
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
        // Hide admin-only items from non-admins
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
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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

        // Check visibility (admin only) - simplified
        if (!isAdmin) {
            // Logic placeholder
        }

        return (
            <div key={group.id}>
                <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isChildActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
                    <div className="mt-1 border-l border-slate-800 space-y-1 ml-4">
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
            return <AssetLifecycleView assetId={selectedAssetId} />;
        }
        if (activeTab === 'work-orders' && selectedWorkOrderId) {
            return <WorkOrderDetailsView workOrderId={selectedWorkOrderId} />;
        }

        switch (activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'assets': return <AssetsView />;
            case 'categories': return <CategoriesView />;
            case 'locations': return <LocationsView />;
            case 'work-orders': return <WorkOrdersView />;
            case 'rentals':
                return <RentalsView />;
            case 'rental-form':
                return <RentalFormView />;
            case 'clients': return <ClientsView />;
            case 'loans': return <LoansView />;
            case 'employees': return <EmployeesView />;
            case 'attendance': return <AttendanceView />;
            case 'leaves': return <LeaveDashboardView />;
            case 'approvals': return <ApprovalCenterView />;
            case 'reports': return <ReportsView />;
            case 'users': return <UsersView />;
            case 'audit': return <AuditModeView />;
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
            case 'purchases': // Fallback or remove if parent doesn't render content
                return <PurchaseOverviewView />; // Default to overview for the group
            case 'expenses': return <ExpensesView />;
            case 'asset-lifecycle': return <AssetLifecycleView />;
            case 'profile': return <ProfileView />;
            default: return <DashboardView />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
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
            bg-slate-900 border-r border-slate-800 text-white 
            transition-all duration-300 ease-in-out flex flex-col
            ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                    {sidebarOpen && (
                        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Management System
                        </span>
                    )}

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white hidden lg:block ml-auto transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white lg:hidden ml-auto transition-colors"
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
                <div className="p-4 border-t border-slate-800">
                    {sidebarOpen && (
                        <div className="mb-3 px-2">
                            <p className="text-sm font-medium text-slate-200">{user?.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-all duration-200"
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span className="font-medium">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content with Header */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 gap-4">

                    {/* Mobile Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white lg:hidden transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1" /> {/* Spacer */}

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="p-2 hover:bg-slate-800 rounded-full relative transition-colors text-slate-400 hover:text-white"
                        >
                            <Bell size={22} />
                        </button>

                        {/* Notification Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 z-50">
                                <div className="p-4 border-b border-slate-800">
                                    <h3 className="font-semibold text-white">Notifikasi</h3>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-slate-500 text-center">
                                        Tidak ada notifikasi baru
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <button
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                    >
                        <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-white leading-none mb-1">{user?.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-none">
                                {user?.role}
                            </p>
                        </div>
                    </button>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-950 p-6 global-scrollbar">
                    <Suspense fallback={<PageLoading />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Logout Modal */}
            {logoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Konfirmasi Logout</h3>
                        <p className="text-slate-400 mb-6">Apakah Anda yakin ingin keluar dari sistem?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors"
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
