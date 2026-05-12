import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { contractApi } from '../../api/contract';
import type { Contract } from '../../types/contract';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    ArrowLeft,
    TrendingUp,
    FileText,
    DollarSign,
    AlertCircle,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

const ContractAnalytics: React.FC = () => {
    const navigate = useNavigate();

    // Fetch contracts
    const { data: contracts = [], isLoading } = useQuery({
        queryKey: ['contracts'],
        queryFn: () => contractApi.list(),
    });

    // Calculate analytics data
    const analytics = useMemo(() => {
        const contractList = contracts as Contract[];
        const today = new Date();

        // Total contracts
        const totalContracts = contractList.length;

        // Total value (estimate dari jumlah kontrak * avg value)
        // Note: Jika ada field contract_value, gunakan itu
        const totalValue = contractList.length * 50000000; // Mock: 50jt per contract

        // Average revenue
        const avgRevenue = totalContracts > 0 ? totalValue / totalContracts : 0;

        // Status distribution
        const statusCount: Record<string, number> = {};
        contractList.forEach((c) => {
            statusCount[c.status] = (statusCount[c.status] || 0) + 1;
        });

        const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
            name: status.replace('_', ' ').toUpperCase(),
            value: count,
            percentage: ((count / totalContracts) * 100).toFixed(1),
        }));

        // Revenue by status (mock data - bisa diganti dengan real revenue)
        const revenueByStatus = Object.entries(statusCount).map(([status, count]) => ({
            status: status.replace('_', ' ').toUpperCase(),
            revenue: count * 50000000, // Mock
        }));

        // Expiring contracts (30, 60, 90 days)
        const expiringIn30 = contractList.filter(
            (c) => differenceInDays(new Date(c.end_date), today) <= 30 && differenceInDays(new Date(c.end_date), today) > 0
        );
        const expiringIn60 = contractList.filter(
            (c) => differenceInDays(new Date(c.end_date), today) <= 60 && differenceInDays(new Date(c.end_date), today) > 30
        );
        const expiringIn90 = contractList.filter(
            (c) => differenceInDays(new Date(c.end_date), today) <= 90 && differenceInDays(new Date(c.end_date), today) > 60
        );

        const expiringTimeline = [
            { period: '0-30 Days', count: expiringIn30.length },
            { period: '31-60 Days', count: expiringIn60.length },
            { period: '61-90 Days', count: expiringIn90.length },
        ];

        return {
            totalContracts,
            totalValue,
            avgRevenue,
            statusDistribution,
            revenueByStatus,
            expiringTimeline,
            activeContracts: statusCount['active'] || 0,
        };
    }, [contracts]);

    // Chart colors
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/contracts')}
                        className="p-2 hover:bg-gray-800/50 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Contract Analytics</h1>
                        <p className="text-gray-400 mt-1">Comprehensive insights and performance metrics</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Value */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-400">Total Contract Value</span>
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <DollarSign size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">
                        Rp {(analytics.totalValue / 1000000).toFixed(0)}M
                    </h3>
                    <div className="flex items-center text-sm text-green-400">
                        <TrendingUp size={14} className="mr-1" />
                        <span>12.5% from last month</span>
                    </div>
                </div>

                {/* Total Contracts */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-400">Total Contracts</span>
                        <div className="p-2 bg-green-500/10 rounded-xl">
                            <FileText size={20} className="text-green-400" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">{analytics.totalContracts}</h3>
                    <div className="text-sm text-gray-400">
                        {analytics.activeContracts} active contracts
                    </div>
                </div>

                {/* Average Revenue */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-400">Avg Revenue/Contract</span>
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                            <TrendingUp size={20} className="text-purple-400" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">
                        Rp {(analytics.avgRevenue / 1000000).toFixed(1)}M
                    </h3>
                    <div className="text-sm text-gray-400">Per contract average</div>
                </div>

                {/* Expiring Soon */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-400">Expiring (30 days)</span>
                        <div className="p-2 bg-yellow-500/10 rounded-xl">
                            <AlertCircle size={20} className="text-yellow-400" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">
                        {analytics.expiringTimeline[0].count}
                    </h3>
                    <div className="text-sm text-yellow-400">Requires attention</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Status Distribution Pie Chart */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-6">Contract Status Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics.statusDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111827',
                                        borderColor: '#ffffff10',
                                        borderRadius: '12px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue by Status Bar Chart */}
                <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-6">Revenue by Status</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.revenueByStatus}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="status"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(val) => `${val / 1000000}M`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111827',
                                        borderColor: '#ffffff10',
                                        borderRadius: '12px',
                                    }}
                                    formatter={(value: any) => `Rp ${(value / 1000000).toFixed(1)}M`}
                                />
                                <Bar dataKey="revenue" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Expiring Contracts Timeline */}
            <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-6">Expiring Contracts Timeline</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.expiringTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#111827',
                                    borderColor: '#ffffff10',
                                    borderRadius: '12px',
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Contracts Expiring"
                                stroke="#F59E0B"
                                strokeWidth={3}
                                dot={{ stroke: '#F59E0B', strokeWidth: 2, r: 6, fill: '#111827' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ContractAnalytics;
