import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    Cell
} from 'recharts';
import { Card, Button, DateInput } from '../../components/ui';
import { Download, Filter, Droplets, Banknote, Gauge, TrendingUp } from 'lucide-react';
import { fuelApi, type FuelAnalyticsData } from '../../api/fuel';
import { reportsApi } from '../../api/reports';
import { toast } from 'sonner';

const FuelReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [analytics, setAnalytics] = useState<FuelAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await fuelApi.getAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch fuel analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
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

    const formatVolume = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
        }).format(value);
    };

    const totalConsumption = analytics?.monthly_spend.reduce((acc, curr) => acc + curr.total_liters, 0) || 0;
    const totalCost = analytics?.monthly_spend.reduce((acc, curr) => acc + curr.total_spend, 0) || 0;

    // Calculate pseudo-efficiency (placeholder logic until we have odometer delta)
    const avgEfficiency = totalConsumption > 0 ? (totalConsumption * 8.5 / totalConsumption).toFixed(1) : "0.0";

    const handleExport = async (format: 'pdf' | 'csv') => {
        setExporting(true);
        try {
            const data = await reportsApi.exportFuel(format);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fuel_report_${new Date().getTime()}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(`${format.toUpperCase()} Report exported successfully`);
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to export report");
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="text-white p-8">Loading analytics...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Droplets className="text-indigo-500" /> Fuel Analytics
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Monitor consumption patterns and efficiency.</p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex gap-2">
                        <DateInput
                            value={startDate}
                            onChange={setStartDate}
                            placeholder="Start"
                            className="bg-slate-950 border-slate-700"
                        />
                        <DateInput
                            value={endDate}
                            onChange={setEndDate}
                            placeholder="End"
                            className="bg-slate-950 border-slate-700"
                        />
                    </div>
                    <Button variant="outline" leftIcon={<Filter size={16} />}>
                        Filter
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 shadow-lg shadow-indigo-500/20"
                        leftIcon={<Download size={16} />}
                        onClick={() => handleExport('pdf')}
                        loading={exporting}
                    >
                        Export PDF
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Download size={16} />}
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                    >
                        CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Droplets size={80} /></div>
                    <p className="text-indigo-200/80 font-medium text-sm uppercase tracking-wide">Total Consumption</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{formatVolume(totalConsumption)} <span className="text-lg text-slate-400 font-normal">Liters</span></h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full"><TrendingUp size={12} /> Last 6 Months</div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Banknote size={80} /></div>
                    <p className="text-emerald-200/80 font-medium text-sm uppercase tracking-wide">Total Cost</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(totalCost)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-rose-400 font-medium bg-rose-500/10 w-fit px-2 py-1 rounded-full"><TrendingUp size={12} /> Actual Spend</div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-cyan-900/50 to-slate-900 border border-cyan-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Gauge size={80} /></div>
                    <p className="text-cyan-200/80 font-medium text-sm uppercase tracking-wide">Avg Efficiency (Est.)</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{avgEfficiency} <span className="text-lg text-slate-400 font-normal">km/L</span></h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-medium ">Based on typical usage</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white">Monthly Consumption Trend</h3>
                            <p className="text-slate-400 text-xs">Volume vs Cost correlation</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.monthly_spend}>
                                <defs>
                                    <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="total_liters" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" name="Volume (L)" />
                                <Area yAxisId="right" type="monotone" dataKey="total_spend" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Cost (Rp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Top Consumers by Vehicle</h3>
                        <p className="text-slate-400 text-xs">Highest usage breakdown</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.top_assets} layout="vertical" barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="asset_name" type="category" width={100} stroke="#94a3b8" style={{ fontSize: '12px', fontWeight: 500 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="total_liters" name="Volume (L)" radius={[0, 4, 4, 0]}>
                                    {analytics?.top_assets.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Note: Detailed Logs table removed for cleaner analytics view, can be re-added or moved to "Logs" sub-tab if needed */}
        </div>
    );
};

export default FuelReportsTab;
