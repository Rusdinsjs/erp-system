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
import { Card, PageLoading } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { showToast } from '../components/ui/Toast';
import { PendingApprovalsWidget } from '../components/dashboard/PendingApprovalsWidget';
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
        blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
        green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
        orange: 'from-amber-500 to-amber-600 shadow-amber-500/20',
        red: 'from-red-500 to-red-600 shadow-red-500/20',
        purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
    };

    return (
        <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
                    <Icon size={22} className="text-white" />
                </div>
            </div>
            <p className="text-2xl font-bold text-card-foreground mb-1">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {description && (
                <p className="text-xs text-muted-foreground/80 mt-2">{description}</p>
            )}
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-secondary-foreground rounded-lg transition-colors border border-border"
                >
                    <DollarSign size={16} />
                    {isExporting ? 'Generating PDF...' : 'Export Summary (PDF)'}
                </button>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statItems.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
                <PendingApprovalsWidget />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Maintenance Trend Chart */}
                    <Card padding="lg">
                        <div className="flex items-center gap-2 mb-6 text-foreground font-semibold">
                            <TrendingUp size={20} className="text-cyan-400" />
                            <h2>Maintenance Cost Trends</h2>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
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
                                    />
                                    <YAxis
                                        tickFormatter={(val) => `Rp ${val / 1000000}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }}
                                        formatter={(val: number | undefined) => [formatCurrency(val ?? 0), 'Total Cost']}
                                    />
                                    <Area type="monotone" dataKey="total_cost" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Financial Snapshot & Recent Activity Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {showFinancials && (
                            <Card padding="lg">
                                <h2 className="text-lg font-semibold text-foreground mb-4">Financial Snapshot</h2>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Book Value</p>
                                        <p className="text-2xl font-bold text-cyan-400">
                                            {formatCurrency(financials?.total_book_value || 0)}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Orig. Cost</p>
                                            <p className="text-sm font-bold text-foreground">
                                                {formatCurrency(financials?.total_original_cost || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Deprec.</p>
                                            <p className="text-sm font-bold text-red-500">
                                                -{formatCurrency(financials?.total_accumulated_depreciation || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        <LiveActivityFeed />
                    </div>
                </div>



                {/* Right Column (1/3) */}
                <div className="space-y-6">
                    {/* Vehicle Legality Widget */}
                    <VehicleLegalityWidget />

                    {/* Asset Availability & Condition Distribution */}
                    <Card padding="lg">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-foreground">Asset Status Distribution</h2>
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
                                        contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-foreground)' }}
                                        formatter={(value: any, name: any) => {
                                            const formattedName = name === 'planning' ? 'Rent Out' : name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                            return [value, formattedName];
                                        }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        formatter={(value) => value === 'planning' ? 'Rent Out' : value.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Asset Availability Ring */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-foreground mb-6">Availability Rate</h2>
                        <div className="flex justify-center">
                            <RingProgress percentage={availablePercentage} />
                        </div>
                    </Card>

                    {/* Operational Stats */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Operational Status</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <ClipboardCheck size={18} className="text-purple-400" />
                                </div>
                                <span className="flex-1 text-sm text-muted-foreground">Pending Loans</span>
                                <span className="font-bold text-foreground">{stats?.loans?.pending_approval || 0}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Clock size={18} className="text-amber-400" />
                                </div>
                                <span className="flex-1 text-sm text-muted-foreground">Overdue Loans</span>
                                <span className="font-bold text-amber-500">{stats?.loans?.overdue || 0}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <Wrench size={18} className="text-red-400" />
                                </div>
                                <span className="flex-1 text-sm text-muted-foreground">Repair Needs</span>
                                <span className="font-bold text-red-500">{stats?.maintenance?.overdue || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

