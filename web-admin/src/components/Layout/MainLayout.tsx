// MainLayout - Pure Tailwind
import { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../../store/useNavigationStore';
import {
    LayoutGrid, LayoutDashboard, Box, Wrench, Wallet, Building2, Settings,
    LogOut, Menu, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { NotificationBell } from '../Header/NotificationBell';
import { AvatarUpload } from '../AvatarUpload';
import { AIChatWidget } from '../AI/AIChatWidget';

export function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState<string[]>(['/assets', '/ops', '/finance']);

    const toggleMenu = (path: string) => {
        setOpenMenus(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);
    const hasPermission = useAuthStore((state) => state.hasPermission);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const ROUTE_TO_RESOURCE: Record<string, string> = {
        '/assets': 'asset',
        '/assets/lifecycle': 'asset',
        '/categories': 'category',
        '/locations': 'location',
        '/conversions': 'conversion',
        '/work-orders': 'work_order',
        '/maintenance-templates': 'maintenance',
        '/fuel': 'fuel',
        '/rentals': 'rental',
        '/loans': 'loan',
        '/inventory': 'inventory',
        '/tax-renewals': 'tax_renewal',
        '/finance': 'finance',
        '/finance/expenses': 'finance',
        '/finance/invoices': 'finance',
        '/finance/bills': 'finance',
        '/finance/reports': 'finance',
        '/employees': 'employee',
        '/departments': 'department',
        '/clients': 'client',
        '/attendance': 'attendance',
        '/leaves': 'leave',
        '/approvals': 'approval',
        '/reports': 'report',
        '/users': 'user',
        '/roles': 'role',
        '/audit': 'audit',
        '/settings': 'setting',
    };

    const canAccessRoutePath = (path: string, minLevel: number = 5): boolean => {
        if (!user) return false;
        if (user.role_level <= 2) return true; // Admin/Super Admin bypass

        const resource = ROUTE_TO_RESOURCE[path];
        if (!resource) return user.role_level <= minLevel;

        if (path === '/users') {
            return hasPermission('user.create') || hasPermission('user.update') || hasPermission('user.delete') || hasPermission('user.*') || hasPermission('user.read') || hasPermission('user.view');
        }

        return (
            hasPermission(`${resource}.read`) ||
            hasPermission(`${resource}.view`) ||
            hasPermission(`${resource}.*`) ||
            user.role_level <= minLevel
        );
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/', minLevel: 5 },

        // MODUL ASSETS
        {
            label: 'Asset Management',
            icon: Box,
            path: '/assets-module',
            minLevel: 5,
            children: [
                { label: 'All Assets', path: '/assets', minLevel: 5 },
                { label: 'Lifecycle (Audit)', path: '/assets/lifecycle', minLevel: 4 },
                { label: 'Categories', path: '/categories', minLevel: 4 },
                { label: 'Locations', path: '/locations', minLevel: 4 },
                { label: 'Conversions', path: '/conversions', minLevel: 3 },
            ]
        },

        // MODUL OPERATIONS
        {
            label: 'Operations',
            icon: Wrench,
            path: '/ops-module',
            minLevel: 5,
            children: [
                { label: 'Work Orders', path: '/work-orders', minLevel: 5 },
                { label: 'Maint. Templates', path: '/maintenance-templates', minLevel: 3 },
                { label: 'Fuel Management', path: '/fuel', minLevel: 4 },
                { label: 'Rentals', path: '/rentals', minLevel: 4 },
                { label: 'Internal Loans', path: '/loans', minLevel: 5 },
                { label: 'Inventory / Parts', path: '/inventory', minLevel: 4 },
                { label: 'Tax & Documents', path: '/tax-renewals', minLevel: 3 },
            ]
        },

        // MODUL FINANCE
        {
            label: 'Finance',
            icon: Wallet,
            path: '/finance-module',
            minLevel: 2, // Finance usually restricted
            children: [
                { label: 'Overview', path: '/finance', minLevel: 2 },
                { label: 'Expenses (Opex/Capex)', path: '/finance/expenses', minLevel: 2 },
                { label: 'Sales Invoices', path: '/finance/invoices', minLevel: 2 },
                { label: 'Purchase Bills', path: '/finance/bills', minLevel: 2 },
                { label: 'Financial Reports', path: '/finance/reports', minLevel: 2 },
            ]
        },

        // MODUL HR / CORE
        {
            label: 'Organization',
            icon: Building2,
            path: '/hr-module',
            minLevel: 4,
            children: [
                { label: 'Employees', path: '/employees', minLevel: 4 },
                { label: 'Departments', path: '/departments', minLevel: 3 },
                { label: 'Clients', path: '/clients', minLevel: 4 },
                { label: 'Attendance', path: '/attendance', minLevel: 4 },
                { label: 'Leaves', path: '/leaves', minLevel: 4 },
            ]
        },

        // SYSTEM / ADMIN
        {
            label: 'System',
            icon: Settings,
            path: '/system-module',
            minLevel: 5,
            children: [
                { label: 'Approval Center', path: '/approvals', minLevel: 3 }, // Managers need this
                { label: 'Reports Center', path: '/reports', minLevel: 3 },
                { label: 'User Management', path: '/users', minLevel: 2 },
                { label: 'Access Rights (RBAC)', path: '/roles', minLevel: 1 },
                { label: 'Audit Logs', path: '/audit', minLevel: 2 },
                { label: 'Settings', path: '/settings', minLevel: 2 },
            ]
        },
    ];

    // Filter items based on granular permissions & asset group restrictions
    const filteredNavItems = navItems.filter(item => {
        if (item.children) {
            item.children = item.children.filter(child => {
                const childLevel = (child as any).minLevel ?? 5;
                const hasAssetRestriction = user && !!user.allowed_asset_group;

                if (hasAssetRestriction && ['/categories', '/locations'].includes(child.path)) {
                    return false;
                }

                return canAccessRoutePath(child.path, childLevel);
            });
            // Keep parent if at least one child is accessible
            return item.children.length > 0;
        }

        return canAccessRoutePath(item.path, item.minLevel ?? 5);
    });



    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar Desktop */}
            <aside
                className={`
                    hidden md:flex flex-col bg-card/60 backdrop-blur-xl border-r border-border/50 transition-all duration-300 shadow-xl
                    ${collapsed ? 'w-20' : 'w-72'}
                `}
            >
                <div className="h-16 flex items-center px-6 border-b border-border shrink-0 overflow-hidden whitespace-nowrap">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl shrink-0">
                            A
                        </div>
                        <span className={`font-bold text-lg text-foreground transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                            Management System
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {/* Back to Launchpad Button */}
                    <div className="mb-4 pb-4 border-b border-border/30">
                        <button
                            onClick={() => { useNavigationStore.getState().setActiveModule(null); navigate('/launchpad'); }}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-primary hover:bg-primary/10 transition-all duration-300 font-medium group
                                ${collapsed ? 'justify-center' : ''}
                            `}
                            title={collapsed ? 'Launchpad' : undefined}
                        >
                            <LayoutGrid size={20} strokeWidth={1.5} className="shrink-0 transition-transform group-hover:scale-110" />
                            <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                App Launcher
                            </span>
                        </button>
                    </div>
                    {filteredNavItems.map((item: any) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isMenuOpen = openMenus.includes(item.path);
                        const fullCurrentPath = location.pathname + location.search;
                        const active = location.pathname === item.path || (hasChildren && item.children.some((c: any) => fullCurrentPath === c.path || location.pathname.startsWith(c.path + '/')));

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
                                        w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-300 group
                                        ${active 
                                            ? 'bg-gradient-to-r from-primary/15 to-transparent text-primary shadow-sm border-l-2 border-primary -ml-0.5' 
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent -ml-0.5'
                                        }
                                        ${collapsed ? 'justify-center ml-0 border-none' : ''}
                                    `}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} strokeWidth={1.5} className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground transition-colors'} />
                                        <span className={`whitespace-nowrap font-medium transition-all duration-300 ${collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {hasChildren && !collapsed && (
                                        <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {hasChildren && isMenuOpen && !collapsed && (
                                    <div className="pl-11 space-y-1 my-1 overflow-hidden transition-all duration-300 animate-in slide-in-from-top-2">
                                        {item.children.map((child: any) => {
                                            const childActive = fullCurrentPath === child.path || location.pathname.startsWith(child.path + '/');
                                            return (
                                                <button
                                                    key={child.path}
                                                    onClick={() => navigate(child.path)}
                                                    className={`
                                                        w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200
                                                        ${childActive ? 'text-primary font-medium bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
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

                <div className="p-3 border-t border-border space-y-1">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors
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
                    fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 md:hidden flex flex-col
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                    <span className="font-bold text-lg text-foreground">Asset Manager</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                        <ChevronLeft size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* Back to Launchpad Button Mobile */}
                    <div className="mb-4 pb-4 border-b border-border/50">
                        <button
                            onClick={() => { useNavigationStore.getState().setActiveModule(null); navigate('/launchpad'); setMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-primary hover:bg-primary/10 transition-colors font-medium"
                        >
                            <LayoutGrid size={20} />
                            <span>App Launcher</span>
                        </button>
                    </div>
                    {filteredNavItems.map((item: any) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isMenuOpen = openMenus.includes(item.path);
                        const fullCurrentPath = location.pathname + location.search;
                        const active = location.pathname === item.path || (hasChildren && item.children.some((c: any) => fullCurrentPath === c.path || location.pathname.startsWith(c.path + '/')));

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
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted'
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
                                                        ${childActive ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-muted/50'}
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
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border/50 bg-card/60 backdrop-blur-xl shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden text-slate-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg font-semibold text-foreground md:hidden">Asset Manager</h2>
                        {/* Breadcrumbs or Page Title could go here */}
                    </div>

                    <div className="flex items-center gap-6">
                        <NotificationBell />

                        <div className="flex items-center gap-3 text-sm">
                            <div className="text-right hidden sm:block">
                                <p className="text-foreground font-medium">{user?.name}</p>
                                <p className="text-muted-foreground text-xs text-right capitalize">{(user as any)?.role_name || user?.role}</p>
                            </div>
                            <AvatarUpload size="sm" />
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <Outlet />
                </main>
                <AIChatWidget />
            </div>
        </div>
    );
}
