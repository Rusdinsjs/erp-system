import React, { useState } from 'react';
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
import { Download, Filter, Droplets, Banknote, Gauge, TrendingUp, Truck } from 'lucide-react';

const FuelReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    // Placeholder Data
    const trendData = [
        { name: 'Jan', consumption: 4000, cost: 24 },
        { name: 'Feb', consumption: 3000, cost: 13 },
        { name: 'Mar', consumption: 2000, cost: 98 },
        { name: 'Apr', consumption: 2780, cost: 39 },
        { name: 'May', consumption: 1890, cost: 48 },
        { name: 'Jun', consumption: 2390, cost: 38 },
        { name: 'Jul', consumption: 3490, cost: 43 },
    ];

    const vehicleData = [
        { name: 'Hilux B 1234', usage: 450, cost: 5000000 },
        { name: 'Avanza B 5678', usage: 300, cost: 3200000 },
        { name: 'Truck Hino', usage: 800, cost: 12000000 },
        { name: 'Genset 01', usage: 1200, cost: 15000000 },
        { name: 'Innova B 9999', usage: 200, cost: 2500000 },
    ];

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
                    <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 shadow-lg shadow-indigo-500/20" leftIcon={<Download size={16} />}>
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Droplets size={80} /></div>
                    <p className="text-indigo-200/80 font-medium text-sm uppercase tracking-wide">Total Consumption</p>
                    <h3 className="text-3xl font-bold text-white mt-1">19,550 <span className="text-lg text-slate-400 font-normal">Liters</span></h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 w-fit px-2 py-1 rounded-full"><TrendingUp size={12} /> +5.2% vs last month</div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Banknote size={80} /></div>
                    <p className="text-emerald-200/80 font-medium text-sm uppercase tracking-wide">Total Cost</p>
                    <h3 className="text-3xl font-bold text-white mt-1">Rp 305.2M</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-rose-400 font-medium bg-rose-500/10 w-fit px-2 py-1 rounded-full"><TrendingUp size={12} /> +8.1% vs last month</div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-cyan-900/50 to-slate-900 border border-cyan-500/20 shadow-lg">
                    <div className="absolute right-0 top-0 p-4 opacity-10"><Gauge size={80} /></div>
                    <p className="text-cyan-200/80 font-medium text-sm uppercase tracking-wide">Avg Efficiency</p>
                    <h3 className="text-3xl font-bold text-white mt-1">8.5 <span className="text-lg text-slate-400 font-normal">km/L</span></h3>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-medium ">Stable</div>
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
                            <AreaChart data={trendData}>
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
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
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
                                <Area yAxisId="left" type="monotone" dataKey="consumption" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" name="Volume (L)" />
                                <Area yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Cost (M)" />
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
                            <BarChart data={vehicleData} layout="vertical" barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" style={{ fontSize: '12px', fontWeight: 500 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="usage" name="Usage (L)" radius={[0, 4, 4, 0]}>
                                    {vehicleData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][index % 5]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Premium Table */}
            <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-slate-800/60">
                    <h3 className="text-lg font-bold text-white">Recent Fuel Logs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-200 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Driver</th>
                                <th className="px-6 py-4 text-right">Volume</th>
                                <th className="px-6 py-4 text-right">Cost</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="group hover:bg-slate-800/40 transition-colors duration-150">
                                    <td className="px-6 py-4 font-mono text-slate-500 group-hover:text-slate-300">2024-01-0{i}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                <Truck size={14} className="text-indigo-400" />
                                            </div>
                                            <span className="font-medium text-slate-200 group-hover:text-white">Hilux B {1230 + i}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">Driver {i}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-300">45.0 L</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-300">Rp 450,000</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Approved
                                        </span>
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

export default FuelReportsTab;
