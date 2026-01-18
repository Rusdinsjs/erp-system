import React, { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
    RadialBarChart,
    RadialBar,
} from 'recharts';
import { Card, Button, DateInput } from '../../components/ui';
import { Download, Filter, Truck, Package, Clock, CalendarDays } from 'lucide-react';

const LoanRentalReportsTab: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    // Placeholder Data
    const loanByDept = [
        { name: 'IT Dept', value: 15, color: '#3B82F6' },
        { name: 'Marketing', value: 8, color: '#ec4899' },
        { name: 'Operations', value: 20, color: '#10B981' },
        { name: 'Finance', value: 5, color: '#F59E0B' },
    ];

    const rentalUtilization = [
        { name: 'Heavy Machinery', uv: 80, fill: '#8b5cf6' },
        { name: 'Vehicles', uv: 45, fill: '#3b82f6' },
        { name: 'Electronics', uv: 90, fill: '#10b981' },
        { name: 'Tools', uv: 60, fill: '#f59e0b' },
    ];

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
                    <Button variant="outline" leftIcon={<Filter size={16} />}>
                        Filter
                    </Button>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-lg shadow-purple-500/20" leftIcon={<Download size={16} />}>
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md">
                    <div className="mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white">Internal Loan Requests</h3>
                        <p className="text-slate-400 text-xs">Distribution by Department</p>
                    </div>
                    <div className="h-[350px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={loanByDept}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {loanByDept.map((entry, index) => (
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
                        <h3 className="text-lg font-bold text-white">Rental Utilization Rate</h3>
                        <p className="text-slate-400 text-xs">Percentage of stock currently rented out</p>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="40%"
                                cy="60%"
                                innerRadius="30%"
                                outerRadius="100%"
                                barSize={32}
                                data={rentalUtilization}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    label={{ position: 'insideStart', fill: '#fff', fontWeight: 'bold' }}
                                    background
                                    dataKey="uv"
                                    cornerRadius={30 / 2}
                                />
                                <Legend
                                    iconSize={12}
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    wrapperStyle={{ right: '10%' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: '#334155',
                                        color: '#F3F4F6',
                                        borderRadius: '8px'
                                    }}
                                    cursor={{ fill: 'transparent' }}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Active Loans Table */}
            <Card className="shadow-2xl shadow-black/40 border-slate-800/60 bg-slate-900/80 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-slate-800/60 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-white">Active Activity</h3>
                        <p className="text-slate-400 text-xs">Current ongoing loans and rentals</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">View All History</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-200 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {[1, 2, 3].map((i) => (
                                <tr key={i} className="group hover:bg-slate-800/40 transition-colors duration-150">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {i === 1 ? (
                                                <div className="p-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                                    <Truck size={14} />
                                                </div>
                                            ) : (
                                                <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                    <Package size={14} />
                                                </div>
                                            )}
                                            <span className={`font-bold text-xs ${i === 1 ? 'text-purple-400' : 'text-blue-400'}`}>
                                                {i === 1 ? 'RENTAL' : 'LOAN'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-white">Projector 4K - {i}</td>
                                    <td className="px-6 py-4">{i === 1 ? 'PT. Maju Mundur' : 'HR Dept'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-rose-400 font-medium">
                                            <CalendarDays size={14} /> 2024-01-2{i}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5">
                                            <Clock size={12} /> Overdue
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

export default LoanRentalReportsTab;
