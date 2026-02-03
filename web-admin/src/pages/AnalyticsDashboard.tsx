import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { api } from '../api/http';
import { Card, LoadingSpinner } from '../components/ui';
import { DollarSign, PieChart as PieIcon, TrendingUp } from 'lucide-react';

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
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Status Distribution */}
                <Card className="min-h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <PieIcon className="text-cyan-400" size={20} />
                        <h3 className="font-bold text-lg text-white">Asset Status Distribution</h3>
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
                                        return formatStatusLabel(value);
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Financial Performance */}
                <Card className="min-h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-emerald-400" size={20} />
                        <h3 className="font-bold text-lg text-white">Financial Performance (YTD)</h3>
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
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Bar Chart for Net Profit */}
                <Card className="min-h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                        <DollarSign className="text-amber-400" size={20} />
                        <h3 className="font-bold text-lg text-white">Net Profit Analysis</h3>
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
                                <Bar dataKey="net_profit" name="Net Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
