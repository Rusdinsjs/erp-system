// DashboardCharts - Pure Tailwind with Recharts
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { Card } from '../ui';

interface CategoryDistribution {
    category: string;
    count: number;
    value: number;
}

interface StatusCount {
    status: string;
    count: number;
}

interface DashboardChartsProps {
    categoryDistribution?: CategoryDistribution[];
    statusDistribution?: StatusCount[];
}

const COLORS = ['#6366f1', '#eab308', '#14b8a6', '#d946ef', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899'];

export function DashboardCharts({ categoryDistribution, statusDistribution }: DashboardChartsProps) {
    const categoryData = categoryDistribution?.map((item) => ({
        name: item.category,
        value: parseFloat(item.value.toString()),
    })) || [];

    const statusData = statusDistribution?.map((item) => ({
        status: item.status,
        count: item.count,
    })) || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card padding="md" className="h-[400px]">
                <h3 className="text-lg font-bold text-white mb-4">Assets by Category (Value)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {categoryData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </Card>

            <Card padding="md" className="h-[400px]">
                <h3 className="text-lg font-bold text-white mb-4">Assets by Status</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={statusData}
                        margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="status" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: '#334155', opacity: 0.2 }}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
}
