// Login Page with Dark Theme
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Package } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

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
            const response = await api.post('/auth/login', { email, password });
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02]" />
            <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Branding */}
                <div className="text-center mb-8 space-y-4">
                    <div className="relative group inline-block">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden transform group-hover:scale-105 transition duration-300">
                            <Package size={36} className="text-cyan-500" />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Asset Manager
                        </h1>
                        <p className="text-slate-400 mt-3 font-medium text-sm uppercase tracking-wider">
                            Admin Dashboard
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/5 ring-1 ring-white/10">
                    <h2 className="text-xl font-semibold text-white mb-6 text-center">
                        Masuk ke Dashboard
                    </h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition text-white placeholder-slate-600 focus:bg-slate-950"
                                placeholder="nama@perusahaan.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition text-white placeholder-slate-600 focus:bg-slate-950"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition p-1 hover:bg-slate-800 rounded-lg"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-cyan-900/20 active:scale-[0.98] ring-1 ring-white/10"
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

                    <p className="text-center text-xs text-slate-500 mt-8 font-light">
                        Protected by robust authentication
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
