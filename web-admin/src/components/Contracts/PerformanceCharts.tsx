import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Line,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PerformanceChartsProps {
    performance: {
        ma: number;
        pa: number;
        ua: number;
        eu: number;
    };
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ performance }) => {
    // Current metrics
    const metrics = [
        { label: 'MA', value: performance.ma, color: '#3B82F6', description: 'Mechanical Availability' },
        { label: 'PA', value: performance.pa, color: '#10B981', description: 'Physical Availability' },
        { label: 'UA', value: performance.ua, color: '#F59E0B', description: 'Utilization Availability' },
        { label: 'EU', value: performance.eu, color: '#8B5CF6', description: 'Effective Utilization' },
    ];

    // Mock trend data (last 6 months)
    const generateMockHistory = () => {
        const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
        return months.map((month, idx) => {
            const factor = 1 + (Math.random() * 0.1 - 0.05); // +/- 5% variation
            return {
                name: month,
                ma: Math.min(100, (performance.ma * factor) + (idx * 0.5)),
                pa: Math.min(100, (performance.pa * factor) - (idx * 0.2)),
                ua: Math.min(100, (performance.ua * factor) + (idx * 0.8)),
                eu: Math.min(100, (performance.eu * factor) + (idx * 0.3)),
            };
        });
    };

    const historyData = generateMockHistory();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Trend Chart */}
            <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl shadow-black/20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <TrendingUp size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Performance Trend Analysis</h3>
                            <p className="text-sm text-gray-400">Historical view of key availability & utilization metrics</p>
                        </div>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                            <defs>
                                <linearGradient id="colorMa" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPa" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                domain={[0, 100]}
                                tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#111827',
                                    borderColor: '#ffffff10',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                }}
                                itemStyle={{ fontSize: 12 }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Area
                                type="monotone"
                                dataKey="ma"
                                name="MA"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorMa)"
                            />
                            <Area
                                type="monotone"
                                dataKey="pa"
                                name="PA"
                                stroke="#10B981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPa)"
                            />
                            <Line
                                type="monotone"
                                dataKey="ua"
                                name="UA"
                                stroke="#F59E0B"
                                strokeWidth={3}
                                dot={{ stroke: '#F59E0B', strokeWidth: 2, r: 4, fill: '#111827' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="eu"
                                name="EU"
                                stroke="#8B5CF6"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Individual Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {metrics.map((m) => (
                    <div key={m.label} className="bg-gray-800/40 border border-white/5 rounded-2xl p-5 backdrop-blur-sm group hover:border-white/10 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">{m.description}</span>
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${m.color}15`, color: m.color }}
                            >
                                <span className="text-sm font-bold">{m.label}</span>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <h4 className="text-3xl font-bold text-white tracking-tight">{m.value.toFixed(1)}%</h4>
                            <div className="flex items-center text-green-400 text-xs font-semibold mb-1.5">
                                <TrendingUp size={12} className="mr-0.5" />
                                2.3%
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${m.value}%`, backgroundColor: m.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PerformanceCharts;
