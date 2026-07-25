import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigationStore } from '../store/useNavigationStore';
import { useTheme } from '../contexts/ThemeContext';
import {
    BarChart3,
    Box,
    Package,
    TrendingUp,
    ShoppingBag,
    Wallet,
    Users,
    ClipboardCheck,
    Settings,
    Wrench,
    ChevronRight,
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { getImageUrl } from '../utils/image';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { Logo } from '../components/ui';
import { AIChatWidget } from '../components/AI/AIChatWidget';
import type { LaunchpadModuleConfig, LaunchpadConfig, MenuId } from '../config/launchpadConfig';
import { DEFAULT_LAUNCHPAD_CONFIG, MENU_LABELS } from '../config/launchpadConfig';

// ─── Icon Registry ───────────────────────────────────────────────────────────
// Maps icon string names (stored in config) to actual Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
    BarChart3,
    Box,
    Package,
    TrendingUp,
    ShoppingBag,
    Wallet,
    Users,
    ClipboardCheck,
    Settings,
    Wrench,
    Moon,
    Sun,
};

function resolveIcon(iconName: string): React.ElementType {
    return ICON_MAP[iconName] || Package;
}

export default function Launchpad() {
    const navigate = useNavigate();
    const { user, logout, hasRoleLevel } = useAuthStore();
    const { theme, setTheme } = useTheme();
    const { setActiveModule, setLaunchpadConfig, launchpadConfig } = useNavigationStore();

    // Fetch public settings (includes launchpad_config if stored in backend)
    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: settingsApi.getPublic
    });

    const appName = publicSettings?.app_name || 'Management System';

    // Load launchpad config from backend settings, fallback to default
    useEffect(() => {
        if (publicSettings?.launchpad_config) {
            try {
                const backendConfig = typeof publicSettings.launchpad_config === 'string'
                    ? JSON.parse(publicSettings.launchpad_config)
                    : publicSettings.launchpad_config;

                // Validate shape: must have modules array
                if (backendConfig && Array.isArray(backendConfig.modules)) {
                    setLaunchpadConfig(backendConfig as LaunchpadConfig);
                } else {
                    setLaunchpadConfig(DEFAULT_LAUNCHPAD_CONFIG);
                }
            } catch {
                console.warn('Invalid launchpad_config in settings, using defaults');
                setLaunchpadConfig(DEFAULT_LAUNCHPAD_CONFIG);
            }
        } else {
            setLaunchpadConfig(DEFAULT_LAUNCHPAD_CONFIG);
        }
    }, [publicSettings, setLaunchpadConfig]);

    // Get visible cards based on user role level, sorted by order
    const visibleCards = launchpadConfig.modules
        .filter(card => card.enabled && hasRoleLevel(card.minLevel))
        .sort((a, b) => a.order - b.order);

    const handleCardClick = (card: LaunchpadModuleConfig) => {
        // Set the active module context in the navigation store
        setActiveModule(card.id);
        // Navigate to the module's default route
        navigate((card as any).route || card.defaultRoute);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
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

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-card/40 border border-border/60 hover:bg-card hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-300 backdrop-blur-md shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/50 hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-all text-sm cursor-pointer"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Keluar</span>
                        </button>
                    </div>
                </header>

                {/* Hero Section */}
                <div className="px-6 py-8 md:py-12 text-center">
                    <div className="flex justify-center mb-4">
                        {user?.avatar_url ? (
                            <img
                                src={getImageUrl(user.avatar_url)}
                                alt="Avatar"
                                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/20 shadow-xl"
                                onError={(e) => {
                                    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
                                    (e.target as HTMLImageElement).src = isAdmin ? '/avatar-admin.png' : '/avatar-user.png';
                                }}
                            />
                        ) : (
                            <img
                                src={user?.role === 'admin' || user?.role === 'super_admin' ? '/avatar-admin.png' : '/avatar-user.png'}
                                alt="Avatar"
                                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/20 shadow-xl"
                            />
                        )}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                        {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Pilih modul untuk memulai
                    </p>
                </div>

                {/* Cards Grid — Driven by Config */}
                <div className="flex-1 px-6 pb-12 flex items-start justify-center">
                    <div className={clsx(
                        "grid gap-4 md:gap-6 w-full",
                        visibleCards.length === 1 ? "max-w-md grid-cols-1" :
                        visibleCards.length === 2 ? "max-w-3xl grid-cols-1 sm:grid-cols-2" :
                        visibleCards.length === 3 ? "max-w-5xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3" :
                        "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    )}>
                        {visibleCards.map((card, index) => {
                            const IconComponent = resolveIcon(card.icon);
                            return (
                                <button
                                    key={card.id}
                                    onClick={() => handleCardClick(card)}
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
                                            <IconComponent className="w-6 h-6 text-white" />
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-semibold text-foreground mb-1 transition-colors">
                                            {card.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {card.subtitle}
                                        </p>

                                        {/* Dynamic Menu Features */}
                                        <div className="space-y-1.5 mb-4 min-h-[60px]">
                                            {card.menuIds.slice(0, 3).map((menuId, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                                    <div className="w-1 h-1 rounded-full bg-border shrink-0" />
                                                    <span className="truncate">{MENU_LABELS[menuId as MenuId] || menuId}</span>
                                                </div>
                                            ))}
                                            {card.menuIds.length > 3 && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground/50 italic">
                                                    <div className="w-1 h-1 rounded-full bg-transparent shrink-0" />
                                                    <span>+{card.menuIds.length - 3} menu lainnya...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1">
                                            <span>Buka Modul</span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
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
            <AIChatWidget />
        </div>
    );
}
