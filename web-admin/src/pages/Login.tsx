// Login Page - Pure Tailwind
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Input, Card, useToast } from '../components/ui';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const { success, error: showError } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            login(token, user);
            success(`Logged in as ${user.name}`, 'Welcome back!'); // Note: User might not have name if typed weakly, but assuming it does.
            navigate('/');
        } catch (err: any) {
            showError(err.response?.data?.error || 'Invalid credentials', 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-white mb-8">Asset Management</h1>
                <Card padding="lg" className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Your password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button fullWidth type="submit" loading={loading} size="lg" className="bg-cyan-600 hover:bg-cyan-500">
                            Sign in
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
