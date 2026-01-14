// Dashboard Page - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Package, DollarSign, Wrench, AlertTriangle, Clock, ClipboardCheck } from 'lucide-react';
import { api } from '../api/client';
import { Card } from '../components/ui';
import { PageLoading } from '../components/ui';

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
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
                    <Icon size={22} className="text-white" />
                </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-slate-400">{label}</p>
            {description && (
                <p className="text-xs text-slate-500 mt-2">{description}</p>
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
                    className="text-slate-800"
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
                <span className="text-3xl font-bold text-white">{percentage}%</span>
                <span className="text-sm text-slate-400">Available</span>
            </div>
        </div>
    );
}

export function Dashboard() {
    // 1. Fetch Main Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
    });

    // 2. Fetch Recent Activity
    const { data: activities, isLoading: activityLoading } = useQuery({
        queryKey: ['dashboard-activity'],
        queryFn: async () => {
            const res = await api.get('/dashboard/activity');
            return res.data as any[];
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

    const isLoading = statsLoading || activityLoading || financialsLoading;

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
        {
            label: 'Total Value',
            value: formatCurrency(stats?.assets?.total_value || 0),
            icon: DollarSign,
            color: 'green' as const,
            description: 'Asset Purchase Value'
        },
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
            <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statItems.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area - Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Financial Snapshot */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-white mb-4">Financial Snapshot</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Original Cost</p>
                                <p className="text-xl font-bold text-white">
                                    {formatCurrency(financials?.total_original_cost || 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Est. Depreciation</p>
                                <p className="text-xl font-bold text-red-400">
                                    -{formatCurrency(financials?.total_accumulated_depreciation || 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Book Value</p>
                                <p className="text-xl font-bold text-cyan-400">
                                    {formatCurrency(financials?.total_book_value || 0)}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
                        {activities && activities.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {activities.slice(0, 10).map((activity: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{activity.action}</p>
                                            <p className="text-xs text-slate-500">{activity.entity_type}</p>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(activity.created_at).toLocaleDateString('id-ID')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
                        )}
                    </Card>
                </div>

                {/* Sidebar - Right Column (1/3) */}
                <div className="space-y-6">
                    {/* Asset Availability */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-white mb-6">Asset Availability</h2>
                        <div className="flex justify-center">
                            <RingProgress percentage={availablePercentage} />
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                                <span className="text-sm text-slate-400">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-700" />
                                <span className="text-sm text-slate-400">In Use / Others</span>
                            </div>
                        </div>
                    </Card>

                    {/* Operational Stats */}
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-white mb-4">Operational Needs</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <ClipboardCheck size={18} className="text-purple-400" />
                                </div>
                                <span className="flex-1 text-sm text-slate-300">Pending Loan Approvals</span>
                                <span className="font-bold text-white">{stats?.loans?.pending_approval || 0}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Clock size={18} className="text-amber-400" />
                                </div>
                                <span className="flex-1 text-sm text-slate-300">Overdue Loans</span>
                                <span className="font-bold text-amber-400">{stats?.loans?.overdue || 0}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <Wrench size={18} className="text-red-400" />
                                </div>
                                <span className="flex-1 text-sm text-slate-300">Overdue Maintenance</span>
                                <span className="font-bold text-red-400">{stats?.maintenance?.overdue || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
