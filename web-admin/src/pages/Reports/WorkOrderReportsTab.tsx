import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Card, Button, DateInput } from '../../components/ui';
import { Download, Filter, Wrench, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

const WorkOrderReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    // Placeholder Data
    const statusData = [
        { name: 'Completed', value: 45, color: '#10B981' },
        { name: 'In Progress', value: 12, color: '#3B82F6' },
        { name: 'Pending', value: 8, color: '#F59E0B' },
        { name: 'Cancelled', value: 3, color: '#EF4444' },
    ];

    const costData = [
        { name: 'Jan', labor: 1500, parts: 2400 },
        { name: 'Feb', labor: 1200, parts: 1398 },
        { name: 'Mar', labor: 2800, parts: 9800 },
        { name: 'Apr', labor: 2100, parts: 3908 },
        { name: 'May', labor: 1600, parts: 4800 },
        { name: 'Jun', labor: 1900, parts: 3800 },
    ];

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
                    <Button variant="outline" leftIcon={<Filter size={16} />}>
                        Filter
                    </Button>
                    <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0 shadow-lg shadow-cyan-500/20" leftIcon={<Download size={16} />}>
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Completed</p>
                        <h4 className="text-2xl font-bold text-white">45</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><Clock size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">In Progress</p>
                        <h4 className="text-2xl font-bold text-white">12</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pending</p>
                        <h4 className="text-2xl font-bold text-white">8</h4>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 shadow-lg hover:border-slate-700 transition-colors">
                    <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400"><XCircle size={24} /></div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Avg Time</p>
                        <h4 className="text-2xl font-bold text-white">2.5 <span className="text-sm font-normal text-slate-400">Days</span></h4>
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
                            <p className="text-3xl font-bold text-white">68</p>
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
                        <h3 className="text-lg font-bold text-white">Cost Breakdown</h3>
                        <p className="text-slate-400 text-xs">Labor vs Parts Spending</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costData} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
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
                                <Bar dataKey="labor" name="Labor Cost" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="parts" name="Parts Cost" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Top Spenders (Bad Actors) */}
            <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-slate-800/60">
                    <h3 className="text-lg font-bold text-white">Recent Work Orders</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-200 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-lg">WO #</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4">Issue</th>
                                <th className="px-6 py-4 text-right">Total Cost</th>
                                <th className="px-6 py-4 rounded-tr-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="group hover:bg-slate-800/40 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono text-cyan-400 group-hover:text-cyan-300">WO-2024-{100 + i}</td>
                                    <td className="px-6 py-4">2024-03-1{i}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                                <Wrench size={14} className="text-slate-400" />
                                            </div>
                                            <span className="font-medium text-slate-200 group-hover:text-white">Air Conditioner {i}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">Leaking water unit</td>
                                    <td className="px-6 py-4 text-right font-medium text-white">Rp {(150 + i * 10).toLocaleString()}k</td>
                                    <td className="px-6 py-4">
                                        {i % 2 === 0 ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle2 size={12} /> Completed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                <Clock size={12} /> In Progress
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default WorkOrderReportsTab;
