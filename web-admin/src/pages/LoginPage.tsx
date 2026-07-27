// Login Page with Dark Theme
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/http';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import { getImageUrl } from '../utils/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const { data: publicSettings } = useQuery({
        queryKey: ['public-settings'],
        queryFn: settingsApi.getPublic
    });

    const appName = publicSettings?.app_name || 'Management System';
    const companyName = publicSettings?.company_name || appName;
    const companyLogo = publicSettings?.company_logo;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        // Validation
        if (!email || !/^\S+@\S+$/.test(email)) {
            setError('Email tidak valid');
            return;
        }
        if (password.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password }, { headers: { 'X-Suppress-Toast': 'true' } });
            const { token, user } = response.data;
            login(token, user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login gagal. Periksa kembali email dan password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02]" />
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Branding */}
                <div className="text-center mb-10 space-y-6">
                    <div className="relative group inline-block">
                        <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl opacity-25 group-hover:opacity-50 transition duration-700"></div>
                        <div className="relative inline-flex items-center justify-center w-24 h-24 bg-white border border-border/50 rounded-full shadow-2xl p-2 transform group-hover:scale-110 transition duration-500 ease-out overflow-hidden">
                            {companyLogo && companyLogo !== 'null' ? (
                                <img
                                    src={getImageUrl(companyLogo)}
                                    alt={companyName}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo-sjs.png';
                                    }}
                                />
                            ) : (
                                <img
                                    src="/logo-sjs.png"
                                    alt={companyName}
                                    className="w-full h-full object-contain"
                                />
                            )}
                        </div>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="text-4xl font-black text-foreground tracking-tighter mb-1">
                            {companyName}
                        </h1>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px w-8 bg-blue-500/50" />
                            <p className="text-blue-500 font-bold text-xs uppercase tracking-[0.3em] whitespace-nowrap">
                                {appName}
                            </p>
                            <div className="h-px w-8 bg-blue-500/50" />
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-border ring-1 ring-white/10">
                    <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
                        Masuk ke Dashboard
                    </h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition text-foreground placeholder-muted-foreground/50 focus:bg-background"
                                placeholder="nama@perusahaan.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-muted-foreground">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition text-foreground placeholder-muted-foreground/50 focus:bg-background"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition p-1 hover:bg-muted rounded-lg"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] ring-1 ring-white/10"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-8 font-light">
                        Protected by robust authentication
                    </p>
                </div>
            </div>
        </div>
    );
}


