import React, { useEffect, useState } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { Card, Button, DateInput } from '../../components/ui';
import { Download, Filter, Wrench, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { workOrderApi, type WorkOrderAnalyticsData } from '../../api/work-order';
import { reportsApi } from '../../api/reports';
import { toast } from 'sonner';

const WorkOrderReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [analytics, setAnalytics] = useState<WorkOrderAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await workOrderApi.getAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch work order analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const handleExport = async (format: 'pdf' | 'csv') => {
        setExporting(true);
        try {
            const data = await reportsApi.exportWorkOrders(format);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `work_order_report_${new Date().getTime()}.${format}`);
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

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
    const totalWOs = analytics?.status_counts.reduce((acc, curr) => acc + curr.count, 0) || 0;

    const completedCount = analytics?.status_counts.find(s => s.status === 'completed')?.count || 0;
    const inProgressCount = analytics?.status_counts.find(s => s.status === 'in_progress')?.count || 0;
    const pendingCount = analytics?.status_counts.find(s => s.status === 'pending' || s.status === 'requested')?.count || 0;

    // Status data for Pie Chart
    const statusData = analytics?.status_counts.map((item, index) => ({
        name: item.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: item.count,
        color: COLORS[index % COLORS.length]
    })) || [];

    // Cost Trend Data
    const trendData = analytics?.cost_trend || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Wrench className="text-cyan-500" /> Work Order Analytics
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Maintenance performance and cost analysis.</p>
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
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-600 hover:to-blue-600 border-0 shadow-lg shadow-cyan-500/20"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Completed</p>
                        <h4 className="text-2xl font-bold text-white">{completedCount}</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><Clock size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">In Progress</p>
                        <h4 className="text-2xl font-bold text-white">{inProgressCount}</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pending</p>
                        <h4 className="text-2xl font-bold text-white">{pendingCount}</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400"><XCircle size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total Orders</p>
                        <h4 className="text-2xl font-bold text-white">{totalWOs}</h4>
                    </div>
                </div>
            </div>


            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Status Distribution</h3>
                    </div>
                    <div className="h-[300px] w-full flex justify-center relative">
                        {/* Centered Label for Donut */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-3xl font-bold text-white">{totalWOs}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-widest">Total WOs</p>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Monthly Cost Trend</h3>
                        <p className="text-slate-400 text-xs">Maintenance Spending (Last 6 Months)</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="total_cost" name="Total Cost" stroke="#10B981" fillOpacity={1} fill="url(#colorCost)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            {/* Note: List table removed as requested to keep it clean */}
        </div>
    );
};

export default WorkOrderReportsTab;
