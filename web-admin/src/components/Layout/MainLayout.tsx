// MainLayout - Pure Tailwind
import { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Box, MapPin, FolderTree, Truck,
    Users, CheckSquare, BarChart3,
    ScanLine, User, LogOut, Menu, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { NotificationBell } from '../Header/NotificationBell';
import { AvatarUpload } from '../AvatarUpload';

export function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState<string[]>(['/assets']);

    const toggleMenu = (path: string) => {
        setOpenMenus(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/', minLevel: 5 },
        {
            label: 'Asset Tetap',
            icon: Box,
            path: '/assets',
            minLevel: 5,
            children: [
                { label: 'Semua Asset', path: '/assets', minLevel: 5 },
                { label: 'Under Maintenance', path: '/assets?status=under_maintenance', minLevel: 4 },
                { label: 'Under Repair', path: '/assets?status=under_repair', minLevel: 4 },
                { label: 'Work Orders', path: '/work-orders', minLevel: 4 },
                { label: 'Conversions', path: '/conversions', minLevel: 3 },
                { label: 'Internal Loans', path: '/loans', minLevel: 5 },
            ]
        },
        { label: 'Locations', icon: MapPin, path: '/locations', minLevel: 3 },
        { label: 'Categories', icon: FolderTree, path: '/categories', minLevel: 3 },
        { label: 'Rentals', icon: Truck, path: '/rentals', minLevel: 4 },
        { label: 'Clients', icon: Users, path: '/clients', minLevel: 4 },
        { label: 'Pegawai', icon: Users, path: '/employees', minLevel: 3 },
        { label: 'Approvals', icon: CheckSquare, path: '/approvals', minLevel: 3 },
        { label: 'Reports', icon: BarChart3, path: '/reports', minLevel: 3 },
        { label: 'Users', icon: Users, path: '/users', minLevel: 2 }, // Admin/Super Admin only
        { label: 'Audit', icon: ScanLine, path: '/audit', minLevel: 2 },
        { label: 'Profile', icon: User, path: '/profile', minLevel: 5 },
    ];

    // Filter items based on role
    const filteredNavItems = navItems.filter(item => {
        const userLevel = user?.role_level ?? 5;
        const requiredLevel = item.minLevel ?? 5;

        // If user level is higher (numerically) than required, strictly deny.
        // (Remember: Level 1 is highest, 5 is lowest)
        if (userLevel > requiredLevel) {
            return false;
        }

        // If item has children, filter them too
        if (item.children) {
            item.children = item.children.filter(child => {
                const childLevel = (child as any).minLevel ?? 5;
                return userLevel <= childLevel;
            });
            // If all children are filtered out and the parent itself doesn't have a direct useful link 
            // (or if we want to hide parents with empty children), logic can be added here.
            // For now, we keep the parent if it passes the level check.
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
                            Management System
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {filteredNavItems.map((item: any) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isMenuOpen = openMenus.includes(item.path);
                        const fullCurrentPath = location.pathname + location.search;
                        const active = location.pathname === item.path || (hasChildren && item.children.some((c: any) => fullCurrentPath === c.path));

                        return (
                            <div key={item.path} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren && !collapsed) {
                                            toggleMenu(item.path);
                                        } else {
                                            navigate(item.path);
                                        }
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                                        ${active && !hasChildren
                                            ? 'bg-cyan-500/10 text-cyan-400'
                                            : active && hasChildren ? 'text-cyan-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                        }
                                        ${collapsed ? 'justify-center' : ''}
                                    `}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} strokeWidth={1.5} className="shrink-0" />
                                        <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {hasChildren && !collapsed && (
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {hasChildren && isMenuOpen && !collapsed && (
                                    <div className="pl-9 space-y-1">
                                        {item.children.map((child: any) => {
                                            const childActive = fullCurrentPath === child.path;
                                            return (
                                                <button
                                                    key={child.path}
                                                    onClick={() => navigate(child.path)}
                                                    className={`
                                                        w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                                                        ${childActive ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
                                                    `}
                                                >
                                                    {child.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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
                    {filteredNavItems.map((item: any) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isMenuOpen = openMenus.includes(item.path);
                        const fullCurrentPath = location.pathname + location.search;
                        const active = location.pathname === item.path || (hasChildren && item.children.some((c: any) => fullCurrentPath === c.path));

                        return (
                            <div key={item.path} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleMenu(item.path);
                                        } else {
                                            navigate(item.path);
                                            setMobileMenuOpen(false);
                                        }
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors
                                        ${active
                                            ? 'bg-cyan-500/10 text-cyan-400'
                                            : 'text-slate-400 hover:bg-slate-800'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} />
                                        <span>{item.label}</span>
                                    </div>
                                    {hasChildren && (
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {hasChildren && isMenuOpen && (
                                    <div className="pl-9 space-y-1">
                                        {item.children.map((child: any) => {
                                            const childActive = fullCurrentPath === child.path;
                                            return (
                                                <button
                                                    key={child.path}
                                                    onClick={() => {
                                                        navigate(child.path);
                                                        setMobileMenuOpen(false);
                                                    }}
                                                    className={`
                                                        w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors
                                                        ${childActive ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-500 hover:bg-slate-800/50'}
                                                    `}
                                                >
                                                    {child.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                            <AvatarUpload size="sm" />
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
