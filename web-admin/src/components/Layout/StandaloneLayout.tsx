// Standalone Page Layout - Dark Theme wrapper for pages accessed via direct URL
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, Bell, Package, ArrowLeft } from 'lucide-react';

interface StandaloneLayoutProps {
    children: ReactNode;
    title?: string;
    onBack?: () => void;
    backTo?: string;
}

export function StandaloneLayout({ children, title, onBack, backTo = '/' }: StandaloneLayoutProps) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(backTo);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 gap-4 flex-shrink-0">
                {/* Back button and title */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Kembali</span>
                    </button>

                    {title && (
                        <h1 className="text-lg font-semibold text-white">{title}</h1>
                    )}
                </div>

                {/* Right section */}
                <div className="flex items-center gap-4">
                    {/* Logo/Brand */}
                    <div className="hidden lg:flex items-center gap-2">
                        <Package size={24} className="text-cyan-500" />
                        <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Asset Manager
                        </span>
                    </div>

                    <div className="h-8 w-px bg-slate-800 hidden lg:block" />

                    {/* Notification Bell */}
                    <button
                        className="p-2 hover:bg-slate-800 rounded-full relative transition-colors text-slate-400 hover:text-white"
                    >
                        <Bell size={22} />
                    </button>

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

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-red-900/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-950 p-6">
                {children}
            </main>
        </div>
    );
}
