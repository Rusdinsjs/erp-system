// Dashboard Page - Pure Tailwind
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, DollarSign, Wrench, AlertTriangle, Clock, ClipboardCheck, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { api } from '../api/http';
import { PageLoading } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { showToast } from '../components/ui/Toast';
import { LiveActivityFeed } from '../components/dashboard/LiveActivityFeed';
import { VehicleLegalityWidget } from '../components/dashboard/VehicleLegalityWidget';


// Stat Card Component
interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
    description?: string;
}

function StatCard({ label, value, icon: Icon, color, description }: StatCardProps) {
    const colors = {
        blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20 text-blue-500',
        green: 'from-emerald-400 to-teal-500 shadow-emerald-500/20 text-emerald-500',
        orange: 'from-amber-400 to-orange-500 shadow-amber-500/20 text-amber-500',
        red: 'from-rose-400 to-red-500 shadow-red-500/20 text-red-500',
        purple: 'from-purple-500 to-indigo-500 shadow-purple-500/20 text-purple-500',
    };

    return (
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-6 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 shadow-xl group relative overflow-hidden">
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${colors[color]} shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-3xl font-black text-foreground mb-1 tracking-tight font-mono">
                    {value}
                </p>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground truncate mb-1" title={label}>{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground/80 truncate font-medium bg-muted/50 inline-block px-2 py-0.5 rounded-md mt-2" title={description}>{description}</p>
                )}
            </div>
        </div>
    );
}

// Ring Progress for Asset Availability
function RingProgress({ percentage }: { percentage: number }) {
    const circumference = 2 * Math.PI * 80;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-muted/20"
                />
                {/* Progress circle */}
                <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-cyan-500 transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{percentage}%</span>
                <span className="text-sm text-muted-foreground">Available</span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [isExporting, setIsExporting] = React.useState(false);

    // 1. Fetch Main Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
    });


    // 3. Fetch Depreciation/Financials
    const { data: financials, isLoading: financialsLoading } = useQuery({
        queryKey: ['dashboard-depreciation'],
        queryFn: async () => {
            const res = await api.get('/dashboard/depreciation');
            return res.data;
        },
    });

    // 4. Fetch Maintenance Trends
    const { data: trends, isLoading: trendsLoading } = useQuery({
        queryKey: ['analytics-trends'],
        queryFn: async () => {
            const res = await api.get('/analytics/maintenance-trends');
            return res.data;
        },
    });

    // 5. Fetch Condition Distribution
    const { data: statusDist, isLoading: statusLoading } = useQuery({
        queryKey: ['analytics-status'],
        queryFn: async () => {
            const res = await api.get('/analytics/status');
            return res.data;
        },
    });

    // 6. Fetch Pending Contracts Count
    const { data: pendingContracts } = useQuery({
        queryKey: ['contracts', 'pending-count'],
        queryFn: async () => {
            const res = await api.get('/contracts/pending-count');
            return res.data;
        },
        refetchInterval: 30000,
    });

    const handleExportPDF = async () => {
        try {
            setIsExporting(true);
            showToast('Generating PDF report...', 'info');

            const response = await api.get('/dashboard/export-pdf', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Dashboard_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast('PDF exported successfully', 'success');
        } catch (error: any) {
            console.error('Export failed', error);
            const message = error.response?.data?.message || 'Failed to export PDF';
            showToast(message, 'error', 'Export Error');
        } finally {
            setIsExporting(false);
        }
    };

    const { hasRoleLevel } = useAuthStore();
    const showFinancials = hasRoleLevel(3); // Level 3 (Manager) or higher

    const isLoading = statsLoading || financialsLoading || trendsLoading || statusLoading;

    if (isLoading) return <PageLoading />;

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    // Calculate Asset Availability
    const totalAssets = stats?.assets?.total || 1;
    const availableAssets = stats?.assets?.by_status?.find((s: any) => s.status === 'available')?.count || 0;
    const availablePercentage = Math.round((availableAssets / totalAssets) * 100);

    // Stat items
    const statItems = [
        {
            label: 'Total Assets',
            value: stats?.assets?.total || 0,
            icon: Package,
            color: 'blue' as const,
            description: `${stats?.assets?.by_status?.find((s: any) => s.status === 'available')?.count || 0} Available`
        },
        ...(showFinancials ? [{
            label: 'Total Value',
            value: formatCurrency(stats?.assets?.total_value || 0),
            icon: DollarSign,
            color: 'green' as const,
            description: 'Asset Purchase Value'
        }] : []),
        {
            label: 'Active Work Orders',
            value: stats?.maintenance?.pending || 0,
            icon: Wrench,
            color: 'orange' as const,
            description: `${stats?.maintenance?.overdue || 0} Overdue`
        },
        {
            label: 'Critical Alerts',
            value: stats?.alerts?.critical || 0,
            icon: AlertTriangle,
            color: 'red' as const,
            description: `${stats?.alerts?.active || 0} Active Alerts`
        },
    ];



    return (
        <div className="p-8 space-y-8 relative">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex justify-between items-end relative z-10">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tighter">Executive Dashboard</h1>
                    <p className="text-muted-foreground mt-2 text-sm font-medium">Real-time overview of assets, maintenance, and financials.</p>
                </div>
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-6 py-3 bg-card/60 backdrop-blur-xl hover:bg-muted disabled:opacity-50 text-foreground rounded-2xl transition-all border border-border font-bold uppercase tracking-widest text-xs hover:-translate-y-1 shadow-lg"
                >
                    <DollarSign size={16} className="text-emerald-500" />
                    {isExporting ? 'Generating PDF...' : 'Export Summary'}
                </button>
            </div>

            {/* Top Stats Row */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${statItems.length} gap-4`}>
                {statItems.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Maintenance Trend Chart */}
                    <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                        <div className="flex items-center gap-3 mb-8 text-foreground font-black uppercase tracking-widest text-sm relative z-10">
                            <TrendingUp size={20} className="text-cyan-400" />
                            <h2>Maintenance Cost Trends</h2>
                        </div>
                        <div className="h-80 w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => {
                                            const parts = val.split('-');
                                            const m = parts[1];
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            return months[parseInt(m) - 1];
                                        }}
                                        dy={10}
                                    />
                                    <YAxis
                                        tickFormatter={(val) => `Rp ${val / 1000000}M`}
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-foreground)', backdropFilter: 'blur(12px)', fontWeight: 'bold' }}
                                        formatter={(val: number | undefined) => [formatCurrency(val ?? 0), 'Total Cost']}
                                    />
                                    <Area type="monotone" dataKey="total_cost" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Financial Snapshot & Recent Activity Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {showFinancials && (
                            <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">Financial Snapshot</h2>
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Book Value</p>
                                        <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                                            {formatCurrency(financials?.total_book_value || 0)}
                                        </p>
                                    </div>
                                    <div className="pt-6 border-t border-border grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Orig. Cost</p>
                                            <p className="text-sm font-black text-foreground font-mono">
                                                {formatCurrency(financials?.total_original_cost || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Deprec.</p>
                                            <p className="text-sm font-black text-rose-500 font-mono">
                                                -{formatCurrency(financials?.total_accumulated_depreciation || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <LiveActivityFeed />
                    </div>
                </div>



                {/* Right Column (1/3) */}
                <div className="space-y-8">
                    {/* Vehicle Legality Widget */}
                    <VehicleLegalityWidget />

                    {/* Asset Availability & Condition Distribution */}
                    <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Status Distribution</h2>
                            <PieChartIcon size={18} className="text-cyan-400" />
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusDist}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="status"
                                        stroke="none"
                                    >
                                        {statusDist?.map((entry: any, index: number) => {
                                            const colors: Record<string, string> = {
                                                planning: '#94a3b8',
                                                procurement: '#3b82f6',
                                                received: '#06b6d4',
                                                in_inventory: '#10b981',
                                                available: '#10b981',
                                                deployed: '#059669',
                                                in_use: '#059669',
                                                rented_out: '#f59e0b',
                                                under_maintenance: '#eab308',
                                                under_repair: '#d97706',
                                                under_conversion: '#8b5cf6',
                                                retired: '#475569',
                                                disposed: '#737373',
                                                sold: '#84cc16',
                                                lost_stolen: '#ef4444',
                                            };
                                            return (
                                                <Cell key={`cell-${index}`} fill={colors[entry.status] || '#64748b'} />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '16px', color: 'var(--color-foreground)', backdropFilter: 'blur(12px)', fontWeight: 'bold' }}
                                        formatter={(value: any, name: any) => {
                                            const formattedName = name === 'planning' ? 'Rent Out' : name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                            return [value, formattedName];
                                        }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold' }}
                                        formatter={(value) => value === 'planning' ? 'Rent Out' : value.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Asset Availability Ring */}
                    <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-foreground mb-8 relative z-10">Availability Rate</h2>
                        <div className="flex justify-center relative z-10">
                            <RingProgress percentage={availablePercentage} />
                        </div>
                    </div>

                    {/* Operational Stats */}
                    <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-sm font-black uppercase tracking-widest text-foreground mb-6">Operational Status</h2>
                        <div className="space-y-5">
                            {showFinancials && (
                                <div className="flex items-center gap-4 group">
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                        <ClipboardCheck size={20} className="text-indigo-400" />
                                    </div>
                                    <span className="flex-1 text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">Pending Approvals</span>
                                    <span className="font-black text-xl text-foreground font-mono bg-muted/50 px-3 py-1 rounded-lg">{pendingContracts?.count || 0}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                    <ClipboardCheck size={20} className="text-purple-400" />
                                </div>
                                <span className="flex-1 text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">Pending Loans</span>
                                <span className="font-black text-xl text-foreground font-mono bg-muted/50 px-3 py-1 rounded-lg">{stats?.loans?.pending_approval || 0}</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                    <Clock size={20} className="text-amber-400" />
                                </div>
                                <span className="flex-1 text-sm font-bold text-muted-foreground group-hover:text-amber-500 transition-colors">Overdue Loans</span>
                                <span className="font-black text-xl text-amber-500 font-mono bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">{stats?.loans?.overdue || 0}</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                    <Wrench size={20} className="text-rose-400" />
                                </div>
                                <span className="flex-1 text-sm font-bold text-muted-foreground group-hover:text-rose-500 transition-colors">Repair Needs</span>
                                <span className="font-black text-xl text-rose-500 font-mono bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">{stats?.maintenance?.overdue || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

