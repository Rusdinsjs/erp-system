// MainLayout - Pure Tailwind
import { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Box, MapPin, FolderTree, Wrench, Truck,
    Users, Hand, ArrowLeftRight, CheckSquare, BarChart3,
    ScanLine, User, LogOut, Menu, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { NotificationBell } from '../Header/NotificationBell';

export function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { label: 'Assets', icon: Box, path: '/assets' },
        { label: 'Locations', icon: MapPin, path: '/locations' },
        { label: 'Categories', icon: FolderTree, path: '/categories' },
        { label: 'Work Orders', icon: Wrench, path: '/work-orders' },
        { label: 'Rentals', icon: Truck, path: '/rentals' },
        { label: 'Clients', icon: Users, path: '/clients' },
        { label: 'Loans', icon: Hand, path: '/loans' },
        { label: 'Pegawai', icon: Users, path: '/employees' },
        { label: 'Conversions', icon: ArrowLeftRight, path: '/conversions' },
        { label: 'Approvals', icon: CheckSquare, path: '/approvals' },
        { label: 'Reports', icon: BarChart3, path: '/reports' },
        { label: 'Users', icon: Users, path: '/users' },
        { label: 'Audit', icon: ScanLine, path: '/audit' },
        { label: 'Profile', icon: User, path: '/profile' },
    ];

    // Filter items based on role
    const filteredNavItems = navItems.filter(item => {
        if (item.path === '/users' && (user?.role_level ?? 5) > 2) {
            return false;
        }
        return true;
    });

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
            {/* Sidebar Desktop */}
            <aside
                className={`
                    hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300
                    ${collapsed ? 'w-20' : 'w-72'}
                `}
            >
                <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl shrink-0">
                            A
                        </div>
                        <span className={`font-bold text-lg transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                            Asset Manager
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {filteredNavItems.map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                                    ${active
                                        ? 'bg-cyan-500/10 text-cyan-400'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                    }
                                    ${collapsed ? 'justify-center' : ''}
                                `}
                                title={collapsed ? item.label : undefined}
                            >
                                <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
                                <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-slate-800 space-y-1">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors
                            ${collapsed ? 'justify-center' : ''}
                        `}
                    >
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                            Collapse
                        </span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors
                            ${collapsed ? 'justify-center' : ''}
                        `}
                    >
                        <LogOut size={20} strokeWidth={1.5} className="shrink-0" />
                        <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 md:hidden flex flex-col
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                    <span className="font-bold text-lg text-white">Asset Manager</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {filteredNavItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                navigate(item.path);
                                setMobileMenuOpen(false);
                            }}
                            className={`
                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                                ${location.pathname === item.path
                                    ? 'bg-cyan-500/10 text-cyan-400'
                                    : 'text-slate-400 hover:bg-slate-800'
                                }
                            `}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-900/20 mt-4"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-slate-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg font-semibold text-white md:hidden">Asset Manager</h2>
                        {/* Breadcrumbs or Page Title could go here */}
                    </div>

                    <div className="flex items-center gap-6">
                        <NotificationBell />

                        <div className="flex items-center gap-3 text-sm">
                            <div className="text-right hidden sm:block">
                                <p className="text-white font-medium">{user?.name}</p>
                                <p className="text-slate-500 text-xs text-right capitalize">{(user as any)?.role_name || user?.role}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                <User size={16} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
