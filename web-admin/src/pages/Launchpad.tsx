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
    Sparkles,
    LogOut
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import clsx from 'clsx';

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

export function Launchpad() {
    const navigate = useNavigate();
    const { user, logout, hasRoleLevel } = useAuthStore();

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
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-500" />

                {/* Grid Pattern Overlay */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">Management System</h1>
                            <p className="text-xs text-slate-400">Enterprise Resource Platform</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-sm"
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
                                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/10"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center ring-4 ring-white/10">
                                <span className="text-3xl font-bold text-white">
                                    {user?.name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Pilih modul untuk memulai
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="flex-1 px-6 pb-12">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {visibleCards.map((card, index) => (
                            <button
                                key={card.id}
                                onClick={() => navigate(card.route)}
                                className={clsx(
                                    "group relative p-6 rounded-2xl text-left transition-all duration-300",
                                    "bg-white/[0.03] hover:bg-white/[0.08]",
                                    "border border-white/[0.08] hover:border-white/20",
                                    "backdrop-blur-xl",
                                    "hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                                )}
                                style={{
                                    animationDelay: `${index * 50}ms`
                                }}
                            >
                                {/* Gradient Overlay on Hover */}
                                <div className={clsx(
                                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br",
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
                                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-white transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        {card.subtitle}
                                    </p>

                                    {/* Features */}
                                    <div className="space-y-1.5 mb-4">
                                        {card.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-1 h-1 rounded-full bg-slate-600" />
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
                <footer className="px-6 py-4 border-t border-white/5">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                        <p>© 2024 Management System. All rights reserved.</p>
                        <p className="flex items-center gap-1">
                            Logged in as <span className="text-slate-400 font-medium">{user?.email}</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-white/5 text-slate-400">{user?.role}</span>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default Launchpad;
