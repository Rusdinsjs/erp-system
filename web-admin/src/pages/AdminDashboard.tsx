// Admin Dashboard - Main Container with Dark Theme
import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    LayoutDashboard, Package, FolderTree, Wrench, Users, LogOut, Menu, X,
    FileText, Settings, Bell, ChevronDown, ChevronRight, ClipboardCheck,
    Truck, HandMetal, Building2, MapPin, Scan, UserCircle
} from 'lucide-react';

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
const ClientsView = lazy(() => import('./Clients').then(m => ({ default: m.Clients })));
const LoansView = lazy(() => import('./Loans').then(m => ({ default: m.Loans })));
const LocationsView = lazy(() => import('./Locations').then(m => ({ default: m.Locations })));
const EmployeesView = lazy(() => import('./Employees').then(m => ({ default: m.Employees })));
const DepartmentsView = lazy(() => import('./Departments').then(m => ({ default: m.Departments })));

// Define the available tabs
type TabId =
    | 'dashboard'
    | 'assets'
    | 'categories'
    | 'locations'
    | 'work-orders'
    | 'rentals'
    | 'clients'
    | 'loans'
    | 'employees'
    | 'conversions'
    | 'approvals'
    | 'reports'
    | 'users'
    | 'audit'
    | 'departments'
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
    children: NavItem[];
    showBadge?: boolean;
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
    return 'children' in entry;
};

// Navigation structure
const navItems: NavEntry[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'assets', icon: Package, label: 'Aset' },
    {
        id: 'operations',
        label: 'Operasional',
        icon: Wrench,
        children: [
            { id: 'work-orders', icon: Wrench, label: 'Work Orders' },
            { id: 'rentals', icon: Truck, label: 'Rental Aset' },
            { id: 'loans', icon: HandMetal, label: 'Peminjaman' },
        ]
    },
    {
        id: 'master_data',
        label: 'Master Data',
        icon: Building2,
        children: [
            { id: 'clients', icon: Building2, label: 'Klien' },
            { id: 'employees', icon: Users, label: 'Pegawai' },
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

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        operations: true,
        master_data: false,
        approval_group: true,
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
            return;
        }

        const woMatch = matchPath('/work-orders/:id', path);
        if (woMatch?.params.id) {
            setActiveTab('work-orders');
            setSelectedWorkOrderId(woMatch.params.id);
            setSelectedAssetId(null);
            setOpenGroups(prev => ({ ...prev, operations: true }));
            return;
        }

        // 2. Handle Standard Tabs
        const segment = path.split('/')[1] || 'dashboard';

        // Find matching tab and group
        let foundTab: TabId | null = null;
        let foundGroup: string | null = null;

        for (const item of navItems) {
            if (isNavGroup(item)) {
                const child = item.children.find(c => c.id === segment);
                if (child) {
                    foundTab = child.id;
                    foundGroup = item.id;
                    break;
                }
            } else {
                if (item.id === segment) {
                    foundTab = item.id;
                    break;
                }
            }
        }

        if (foundTab) {
            setActiveTab(foundTab);
            if (foundGroup) {
                setOpenGroups(prev => ({ ...prev, [foundGroup]: true }));
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

    // Render Navigation Group
    const renderNavGroup = (group: NavGroup) => {
        const isChildActive = group.children.some(child => activeTab === child.id);
        const isOpen = openGroups[group.id] || false;

        // Check if all children are admin-only and user is not admin
        const visibleChildren = group.children.filter(child => !child.adminOnly || isAdmin);
        if (visibleChildren.length === 0) return null;

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
                            <span className="flex-1 text-left font-medium">{group.label}</span>
                            {group.showBadge && (
                                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    !
                                </span>
                            )}
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </>
                    )}
                </button>
                {isOpen && sidebarOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                        {visibleChildren.map(child => renderNavItem(child, true))}
                    </div>
                )}
            </div>
        );
    };

    // Render Content based on Active Tab
    const renderContent = () => {
        // Handle sub-views with IDs
        if (selectedWorkOrderId) {
            return <WorkOrderDetailsView workOrderId={selectedWorkOrderId} />;
        }
        if (selectedAssetId) {
            return <AssetLifecycleView assetId={selectedAssetId} />;
        }

        switch (activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'assets': return <AssetsView />;
            case 'categories': return <CategoriesView />;
            case 'locations': return <LocationsView />;
            case 'work-orders': return <WorkOrdersView />;
            case 'rentals': return <RentalsView />;
            case 'clients': return <ClientsView />;
            case 'loans': return <LoansView />;
            case 'employees': return <EmployeesView />;
            case 'approvals': return <ApprovalCenterView />;
            case 'reports': return <ReportsView />;
            case 'users': return <UsersView />;
            case 'audit': return <AuditModeView />;
            case 'departments': return <DepartmentsView />;
            case 'profile': return <ProfileView />;
            default: return <DashboardView />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
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
                            Asset Manager
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

                    {/* User Info */}
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
                        <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-white">{user?.name}</p>
                            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                        </div>
                    </div>
                </header>

                {/* Main Content Pane */}
                <main className="flex-1 overflow-auto bg-slate-950 p-6">
                    <Suspense fallback={
                        <div className="flex h-full items-center justify-center text-slate-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mr-3"></div>
                            <span>Loading...</span>
                        </div>
                    }>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>

            {/* Logout Confirmation Modal */}
            {logoutModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-800">
                        <h3 className="text-xl font-semibold text-white mb-2">Konfirmasi Logout</h3>
                        <p className="text-slate-400 mb-6">
                            Apakah Anda yakin ingin keluar dari aplikasi?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutModalOpen(false)}
                                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
