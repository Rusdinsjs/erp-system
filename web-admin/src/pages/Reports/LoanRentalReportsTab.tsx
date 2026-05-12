import React, { useEffect, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { Card, Button, DateInput } from '../../components/ui';
import { Download, Filter, Truck, Package, Clock, ArrowRightLeft } from 'lucide-react';
import { loanApi, type LoanAnalyticsData } from '../../api/loan';
import { reportsApi } from '../../api/reports';
import { toast } from 'sonner';

const LoanRentalReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [analytics, setAnalytics] = useState<LoanAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await loanApi.getAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error("Failed to fetch loan analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const handleExport = async (format: 'pdf' | 'csv') => {
        setExporting(true);
        try {
            const data = await reportsApi.exportLoans(format);
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `loan_report_${new Date().getTime()}.${format}`);
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

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    // Pie Chart Data: Status Distribution
    const statusData = analytics?.status_counts.map((item, index) => ({
        name: item.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: item.count,
        color: COLORS[index % COLORS.length]
    })) || [];

    // Bar Chart Data: Top Borrowed Assets
    const topAssetsData = analytics?.most_borrowed.map(item => ({
        name: item.asset_name,
        value: item.loan_count
    })) || [];

    const totalLoans = analytics?.status_counts.reduce((acc, curr) => acc + curr.count, 0) || 0;
    const activeLoans = analytics?.active_loans || 0;
    const overdueLoans = analytics?.overdue_loans || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Truck className="text-purple-500" /> Loan & Rental Analytics
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Asset circulation and utilization storage.</p>
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
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-lg shadow-purple-500/20"
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
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><ArrowRightLeft size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Active Loans</p>
                        <h4 className="text-2xl font-bold text-white">{activeLoans}</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400"><Clock size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Overdue Items</p>
                        <h4 className="text-2xl font-bold text-white">{overdueLoans}</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Package size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total Transactions</p>
                        <h4 className="text-2xl font-bold text-white">{totalLoans}</h4>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Loan Status Distribution</h3>
                        <p className="text-slate-400 text-xs">Overview of all loan statuses</p>
                    </div>
                    <div className="h-[350px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Top Borrowed Assets</h3>
                        <p className="text-slate-400 text-xs">Most frequently requested items</p>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topAssetsData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default LoanRentalReportsTab;
