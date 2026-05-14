// Launchpad Page - Premium Full-Screen Navigation Hub
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
    BarChart3,
    Package,
    TrendingUp,
    ShoppingBag,
    Wallet,
    Users,
    ClipboardCheck,
    Settings,
    ChevronRight,
    LogOut
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { Logo } from '../components/ui';

interface DomainCard {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    gradient: string;
    iconBg: string;
    route: string;
    minLevel: number;
    features: string[];
}

const domainCards: DomainCard[] = [
    {
        id: 'insights',
        title: 'Insights & Reporting',
        subtitle: 'Business Intelligence',
        icon: BarChart3,
        gradient: 'from-blue-500/20 to-cyan-500/20',
        iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        route: '/dashboard',
        minLevel: 5,
        features: ['Dashboard Overview', 'Analytics', 'Reports']
    },
    {
        id: 'operations',
        title: 'Operations & Assets',
        subtitle: 'Asset Management',
        icon: Package,
        gradient: 'from-emerald-500/20 to-teal-500/20',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        route: '/assets',
        minLevel: 5,
        features: ['Asset Registry', 'Work Orders', 'Maintenance']
    },
    {
        id: 'commercial',
        title: 'Commercial & Revenue',
        subtitle: 'Sales & Rentals',
        icon: TrendingUp,
        gradient: 'from-violet-500/20 to-purple-500/20',
        iconBg: 'bg-gradient-to-br from-violet-500 to-purple-500',
        route: '/rentals',
        minLevel: 4,
        features: ['Rental Operations', 'Contracts', 'Sales Management']
    },
    {
        id: 'procurement',
        title: 'Procurement & Supply',
        subtitle: 'Supply Chain',
        icon: ShoppingBag,
        gradient: 'from-orange-500/20 to-amber-500/20',
        iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500',
        route: '/purchase-overview',
        minLevel: 3,
        features: ['Purchasing', 'Inventory Control', 'Stock Management']
    },
    {
        id: 'finance',
        title: 'Finance & Accounting',
        subtitle: 'Financial Management',
        icon: Wallet,
        gradient: 'from-green-500/20 to-emerald-500/20',
        iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
        route: '/cash-bank',
        minLevel: 3,
        features: ['Cash & Bank', 'Expenses', 'General Ledger']
    },
    {
        id: 'hr',
        title: 'Human Resources',
        subtitle: 'People Management',
        icon: Users,
        gradient: 'from-pink-500/20 to-rose-500/20',
        iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
        route: '/employees',
        minLevel: 3,
        features: ['Employees', 'Attendance', 'Leave Management']
    },
    {
        id: 'approval',
        title: 'Approval Center',
        subtitle: 'Pending Approvals',
        icon: ClipboardCheck,
        gradient: 'from-yellow-500/20 to-orange-500/20',
        iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        route: '/approvals',
        minLevel: 3,
        features: ['Work Orders', 'Leave Requests', 'Purchases']
    },
    {
        id: 'admin',
        title: 'Administration',
        subtitle: 'System Settings',
        icon: Settings,
        gradient: 'from-slate-500/20 to-gray-500/20',
        iconBg: 'bg-gradient-to-br from-slate-500 to-gray-500',
        route: '/users',
        minLevel: 2,
        features: ['Users & Roles', 'Workflows', 'Configuration']
    }
];

export default function Launchpad() {
    const navigate = useNavigate();
    const { user, logout, hasRoleLevel } = useAuthStore();

    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: settingsApi.getPublic
    });

    const appName = publicSettings?.app_name || 'Management System';

    const visibleCards = domainCards.filter(card => hasRoleLevel(card.minLevel));

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-500" />

                {/* Grid Pattern Overlay */}
                <div
                    className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `
                            linear-gradient(currentColor 1px, transparent 1px),
                            linear-gradient(90deg, currentColor 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo collapsed={false} />
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/50 hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-all text-sm"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Keluar</span>
                    </button>
                </header>

                {/* Hero Section */}
                <div className="px-6 py-8 md:py-12 text-center">
                    <div className="flex justify-center mb-4">
                        {user?.avatar_url ? (
                            <img
                                src={getImageUrl(user.avatar_url)}
                                alt="Avatar"
                                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/20 shadow-xl"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center ring-4 ring-primary/20 shadow-xl">
                                <span className="text-3xl font-bold text-white">
                                    {user?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Pilih modul untuk memulai
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="flex-1 px-6 pb-12 flex items-start justify-center">
                    <div className={clsx(
                        "grid gap-4 md:gap-6 w-full",
                        visibleCards.length === 1 ? "max-w-md grid-cols-1" :
                        visibleCards.length === 2 ? "max-w-3xl grid-cols-1 sm:grid-cols-2" :
                        visibleCards.length === 3 ? "max-w-5xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                        "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    )}>
                        {visibleCards.map((card, index) => (
                            <button
                                key={card.id}
                                onClick={() => navigate(card.route)}
                                className={clsx(
                                    "group relative p-6 rounded-2xl text-left transition-all duration-300",
                                    "bg-card/50 hover:bg-card",
                                    "border border-border hover:border-primary/30",
                                    "backdrop-blur-xl",
                                    "hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/5",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                                )}
                                style={{
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                {/* Gradient Overlay on Hover */}
                                <div className={clsx(
                                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br",
                                    card.gradient
                                )} />

                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={clsx(
                                        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110",
                                        card.iconBg
                                    )}>
                                        <card.icon className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-foreground mb-1 transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {card.subtitle}
                                    </p>

                                    {/* Features */}
                                    <div className="space-y-1.5 mb-4">
                                        {card.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1">
                                        <span>Buka Modul</span>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 border-t border-border/50">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                        <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                        <p className="flex items-center gap-1">
                            Logged in as <span className="text-foreground font-medium">{user?.email}</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-accent text-accent-foreground">{user?.role}</span>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}


