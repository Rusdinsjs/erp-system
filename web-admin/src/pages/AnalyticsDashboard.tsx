import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { api } from '../api/http';
import { LoadingSpinner } from '../components/ui';
import { DollarSign, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { getAssetStatusColor, getAssetStatusLabel } from '../config/assetStatusConfig';

const STATUS_COLORS: Record<string, string> = new Proxy({}, {
    get: (_, prop: string) => getAssetStatusColor(prop)
});

const formatStatusLabel = (status: string) => {
    return getAssetStatusLabel(status);
};

export default function AnalyticsDashboard() {
    // Fetch Status Distribution
    const { data: statusData, isLoading: statusLoading } = useQuery({
        queryKey: ['analytics-status'],
        queryFn: async () => {
            const res = await api.get('/analytics/status');
            return res.data;
        }
    });

    // Fetch Cost Analytics
    const { data: costData, isLoading: costLoading } = useQuery({
        queryKey: ['analytics-costs'],
        queryFn: async () => {
            const res = await api.get('/analytics/costs');
            return res.data;
        }
    });

    const processedStatusData = useMemo(() => {
        if (!statusData) return [];
        const map = new Map<string, any>();

        statusData.forEach((item: any) => {
            const label = formatStatusLabel(item.status);
            if (!map.has(label)) {
                map.set(label, { ...item }); // Keep the first item's status for color mapping
            } else {
                const existing = map.get(label);
                existing.count = Number(existing.count) + Number(item.count);
            }
        });

        return Array.from(map.values());
    }, [statusData]);

    if (statusLoading || costLoading) {
        return <div className="h-64 flex items-center justify-center"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-8 relative p-8">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                {/* Asset Status Distribution */}
                <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-8 text-foreground font-black uppercase tracking-widest text-sm relative z-10">
                        <PieIcon className="text-cyan-400" size={24} />
                        <h3>Asset Status Distribution</h3>
                    </div>
                    <div className="flex-1 w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={processedStatusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ status, percent }: { status?: string, percent?: number }) => {
                                        if (!status) return '';
                                        return `${formatStatusLabel(status)} ${((percent || 0) * 100).toFixed(0)}%`;
                                    }}
                                    nameKey="status"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {processedStatusData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
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
                                            return <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{formatStatusLabel(value)}</span>;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                {/* Financial Performance */}
                <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-8 text-foreground font-black uppercase tracking-widest text-sm relative z-10">
                        <TrendingUp className="text-emerald-400" size={24} />
                        <h3>Financial Performance (YTD)</h3>
                    </div>
                    <div className="flex-1 w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={costData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="rental_income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="maintenance_cost" name="Maintenance" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 relative z-10">
                {/* Bar Chart for Net Profit */}
                <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[400px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-8 text-foreground font-black uppercase tracking-widest text-sm relative z-10">
                        <DollarSign className="text-amber-400" size={24} />
                        <h3>Net Profit Analysis</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={costData?.map((d: any) => ({
                                    ...d,
                                    net_profit: (d.rental_income || 0) - (d.maintenance_cost || 0)
                                }))}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="net_profit" name="Net Profit" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
