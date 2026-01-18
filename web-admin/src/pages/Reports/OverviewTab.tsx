import React from 'react';
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
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, Button } from '../../components/ui';

// Mock Data for Charts
const costTrendData = [
    { name: 'Jan', total: 45, fuel: 20, maintenance: 25 },
    { name: 'Feb', total: 52, fuel: 22, maintenance: 30 },
    { name: 'Mar', total: 48, fuel: 25, maintenance: 23 },
    { name: 'Apr', total: 61, fuel: 28, maintenance: 33 },
    { name: 'May', total: 55, fuel: 24, maintenance: 31 },
    { name: 'Jun', total: 67, fuel: 30, maintenance: 37 },
    { name: 'Jul', total: 72, fuel: 35, maintenance: 37 },
];

const activityData = [
    { id: 1, type: 'maintenance', title: 'Hilux B 1234 Service Completed', time: '2h ago', status: 'success' },
    { id: 2, type: 'loan', title: 'Projector Loan Overdue', time: '4h ago', status: 'warning' },
    { id: 3, type: 'fuel', title: 'High Fuel Consumption Alert', time: '5h ago', status: 'danger' },
    { id: 4, type: 'system', title: 'Monthly Report Generated', time: '1d ago', status: 'info' },
];

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

const ActivityItem = ({ item }: any) => {
    const getIcon = () => {
        switch (item.type) {
            case 'maintenance': return <Wrench size={16} />;
            case 'loan': return <Truck size={16} />;
            case 'fuel': return <Fuel size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getColor = () => {
        switch (item.status) {
            case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'danger': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-slate-800">
            <div className={`p-2 rounded-lg border ${getColor()}`}>
                {getIcon()}
            </div>
            <div className="flex-1">
                <h4 className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">
                    {item.title}
                </h4>
                <p className="text-slate-500 text-xs">{item.time}</p>
            </div>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <ArrowRight size={14} />
            </Button>
        </div>
    );
};

const OverviewTab: React.FC = () => {
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
                    value="Rp 4.2B"
                    subtext="+2.5%"
                    trend="up"
                    icon={DollarSign}
                    gradient="from-slate-800 to-slate-900 border-slate-700" // Fallback style, can be customized
                />
                <PremiumStatCard
                    title="Fuel Efficiency"
                    value="8.4 km/L"
                    subtext="-1.2%"
                    trend="down"
                    icon={Fuel}
                    gradient="from-indigo-900/80 to-slate-900 border-indigo-500/30"
                />
                <PremiumStatCard
                    title="Work Orders"
                    value="24 Active"
                    subtext="+5 New"
                    trend="up"
                    icon={Wrench}
                    gradient="from-cyan-900/80 to-slate-900 border-cyan-500/30"
                />
                <PremiumStatCard
                    title="Asset Utilization"
                    value="92%"
                    subtext="+4.1%"
                    trend="up"
                    icon={Activity}
                    gradient="from-emerald-900/80 to-slate-900 border-emerald-500/30"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Chart */}
                <Card className="lg:col-span-2 shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-lg font-bold text-white">Operational Costs Analysis</h3>
                            <p className="text-slate-400 text-xs mt-1">Fuel vs Maintenance spending over time</p>
                        </div>
                        <select className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1 outline-none focus:border-cyan-500">
                            <option>Last 6 Months</option>
                            <option>Year to Date</option>
                        </select>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={costTrendData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="name"
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
                                    tickFormatter={(value) => `${value}M`}
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
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    name="Total Cost"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="fuel"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorFuel)"
                                    name="Fuel Spend"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Sidebar: Activity Feed */}
                <Card className="h-full shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Recent Alerts</h3>
                        <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">View All</Button>
                    </div>

                    <div className="space-y-1">
                        {activityData.map(item => (
                            <ActivityItem key={item.id} item={item} />
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <h4 className="text-sm font-medium text-slate-400 mb-4">System Health</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">Database Status</span>
                                    <span className="text-emerald-400 font-bold">Optimal</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full w-[98%] bg-emerald-500 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300">Storage Usage</span>
                                    <span className="text-amber-400 font-bold">78%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full w-[78%] bg-amber-500 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OverviewTab;
