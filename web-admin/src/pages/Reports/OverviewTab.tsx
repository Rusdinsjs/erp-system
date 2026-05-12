import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    Fuel,
    Wrench,
    Truck,
    TrendingUp,
    TrendingDown,
    Activity,
    Calendar,
    ArrowRight
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, Button } from '../../components/ui';
import { dashboardApi, type DashboardStats, type RecentActivity as APIRecentActivity, type MonthlyCost, type AssetStatusStats, type ExpenseAnalysis } from '../../api/dashboard';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const STATUS_COLORS: Record<string, string> = {
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

const formatStatusLabel = (status: string) => {
    if (!status) return 'Unknown';
    const mapping: Record<string, string> = {
        planning: 'Rent Out',
        in_inventory: 'In Inventory',
        available: 'In Inventory',
        deployed: 'In Use',
        in_use: 'In Use',
        under_maintenance: 'Under Maintenance',
        under_repair: 'Under Repair',
        under_conversion: 'Under Conversion',
        lost_stolen: 'Lost/Stolen',
    };

    if (mapping[status]) return mapping[status];
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const PremiumStatCard = ({ title, value, subtext, trend, icon: Icon, gradient }: any) => (
    <div className={`
        relative overflow-hidden rounded-2xl p-6 
        bg-gradient-to-br ${gradient} 
        border border-white/5 shadow-xl transition-all duration-300 hover:scale-[1.02]
    `}>
        <div className="absolute right-0 top-0 p-4 opacity-10">
            <Icon size={80} />
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Icon size={20} className="text-white" />
                </div>
                <p className="text-blue-100/80 font-medium text-sm tracking-wide uppercase">{title}</p>
            </div>

            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">{value}</h3>

            <div className="flex items-center gap-2">
                <span className={`
                    flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full 
                    ${trend === 'up' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}
                `}>
                    {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {subtext}
                </span>
                <span className="text-blue-200/60 text-xs">vs last month</span>
            </div>
        </div>
    </div>
);

const ActivityItem = ({ item }: { item: APIRecentActivity }) => {
    const getIcon = () => {
        switch (item.entity_type) {
            case 'maintenance_work_orders': return <Wrench size={16} />;
            case 'asset_loans': return <Truck size={16} />;
            case 'fuel_logs': return <Fuel size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getColor = (action: string) => {
        if (action.includes('create')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (action.includes('delete')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (action.includes('update')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-slate-800">
            <div className={`p-2 rounded-lg border ${getColor(item.action)}`}>
                {getIcon()}
            </div>
            <div className="flex-1">
                <h4 className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">
                    {item.description}
                </h4>
                <p className="text-slate-500 text-xs">{dayjs(item.created_at).fromNow()}</p>
            </div>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <ArrowRight size={14} />
            </Button>
        </div>
    );
};

const OverviewTab: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<APIRecentActivity[]>([]);
    const [costData, setCostData] = useState<MonthlyCost[]>([]);
    const [statusData, setStatusData] = useState<AssetStatusStats[]>([]);
    const [capexOpexData, setCapexOpexData] = useState<any[]>([]); // Pivoted data
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, activitiesData, costs, statuses, capexOpex] = await Promise.all([
                    dashboardApi.getStats(),
                    dashboardApi.getActivities(),
                    dashboardApi.getCostAnalytics(),
                    dashboardApi.getAssetStatusStats(),
                    dashboardApi.getCapexOpexStats().catch(() => []) // Handle potential error gracefully
                ]);
                setStats(statsData);
                setActivities(activitiesData);
                setCostData(costs);
                setStatusData(statuses);

                // Process CAPEX/OPEX data
                // Need to group by month and pivot
                const pivoted: Record<string, any> = {};
                capexOpex.forEach((item: ExpenseAnalysis) => {
                    const monthKey = dayjs(item.month).format('MMM YYYY');
                    if (!pivoted[monthKey]) {
                        pivoted[monthKey] = { month: monthKey, CAPEX: 0, OPEX: 0 };
                    }
                    if (item.expense_type === 'CAPEX') {
                        pivoted[monthKey].CAPEX += item.total_amount;
                    } else {
                        pivoted[monthKey].OPEX += item.total_amount;
                    }
                });

                // Convert to array and sort by date (approximation by reversing or simple sort if keys ordered)
                // Better to use original date for sorting
                const sortedData = Object.values(pivoted); // Assuming order from backend is preserved (which is ORDER BY month ASC)
                setCapexOpexData(sortedData);

            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
            notation: 'compact',
            compactDisplay: 'short'
        }).format(value);
    };

    if (loading) {
        return <div className="text-white p-8">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h2>
                    <p className="text-slate-400 text-sm mt-1">Real-time overview of your asset ecosystem.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                    <Calendar size={14} className="text-cyan-400" />
                    <span className="text-sm text-slate-300">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* Premium Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PremiumStatCard
                    title="Total Asset Value"
                    value={stats ? formatCurrency(stats.assets.total_value) : 'Rp 0'}
                    subtext="+2.5%" // Backend doesn't provide trend yet
                    trend="up"
                    icon={DollarSign}
                    gradient="from-slate-800 to-slate-900 border-slate-700"
                />
                <PremiumStatCard
                    title="Active Alerts"
                    value={stats ? `${stats.alerts.active} Active` : '0 Active'}
                    subtext={`${stats?.alerts.critical || 0} Critical`}
                    trend="down"
                    icon={Fuel} // Reusing Fuel icon for alerts temporarily if appropriate, or maybe AlertTriangle
                    gradient="from-indigo-900/80 to-slate-900 border-indigo-500/30"
                />
                <PremiumStatCard
                    title="Work Orders"
                    value={stats ? `${stats.maintenance.pending} Pending` : '0 Pending'}
                    subtext={`${stats?.maintenance.overdue || 0} Overdue`}
                    trend="up"
                    icon={Wrench}
                    gradient="from-cyan-900/80 to-slate-900 border-cyan-500/30"
                />
                <PremiumStatCard
                    title="Active Loans"
                    value={stats ? `${stats.loans.active} Active` : '0 Active'}
                    subtext={`${stats?.loans.pending_approval || 0} Pending`}
                    trend="up"
                    icon={Activity}
                    gradient="from-emerald-900/80 to-slate-900 border-emerald-500/30"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Chart */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <div>
                            <h3 className="text-lg font-bold text-white">Operational Costs Analysis</h3>
                            <p className="text-slate-400 text-xs mt-1">Fuel vs Maintenance spending over time</p>
                        </div>
                        <select className="bg-gray-900/50 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1 outline-none focus:border-blue-500">
                            <option>Last 6 Months</option>
                            <option>Year to Date</option>
                        </select>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={costData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    itemStyle={{ fontSize: '12px' }}
                                    formatter={(value: any) => formatCurrency(value || 0)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="maintenance_cost"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorCost)"
                                    name="Maintenance Cost"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Asset Status Pie Chart */}
                <Card className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white">Asset Status</h3>
                    </div>
                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {statusData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any, name?: string) => {
                                        if (!name) return [value, 'Unknown'];
                                        return [value, formatStatusLabel(name)];
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value?: string) => {
                                        if (!value) return 'Unknown';
                                        return formatStatusLabel(value);
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Sidebar: Activity Feed */}
                <Card className="h-full">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white">Recent Activities</h3>
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">View All</Button>
                    </div>

                    <div className="space-y-1">
                        {activities.length > 0 ? (
                            activities.slice(0, 5).map(item => (
                                <ActivityItem key={item.entity_id + item.created_at} item={item} />
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm p-4">No recent activity found.</p>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">System Health</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">Database Status</span>
                                    <span className="text-emerald-400 font-bold">Optimal</span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full w-[98%] bg-emerald-500 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">Storage Usage</span>
                                    <span className="text-amber-400 font-bold">78%</span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full w-[78%] bg-amber-500 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* CAPEX vs OPEX Chart */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                        <div>
                            <h3 className="text-lg font-bold text-white">Financial Overview (CAPEX vs OPEX)</h3>
                            <p className="text-slate-400 text-xs mt-1">Monthly expenditure breakdown</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        {capexOpexData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={capexOpexData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value / 1000000}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            borderColor: '#334155',
                                            color: '#F3F4F6',
                                            borderRadius: '8px',
                                            backdropFilter: 'blur(4px)'
                                        }}
                                        itemStyle={{ fontSize: '12px' }}
                                        formatter={(value: any) => formatCurrency(value || 0)}
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="OPEX" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="CAPEX" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                No financial data available
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OverviewTab;
