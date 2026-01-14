// AssetROI - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import {
    DollarSign, Wrench, Clock, ChartLine,
    ArrowUpRight, ArrowDownRight, Activity, Wallet
} from 'lucide-react';
import { analyticsApi } from '../../api/analytics';
import { Card, LoadingOverlay, Badge } from '../ui';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AssetROIProps {
    assetId: string;
}

export function AssetROI({ assetId }: AssetROIProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['asset-roi', assetId],
        queryFn: () => analyticsApi.getAssetROI(assetId)
    });

    if (isLoading) return <div className="h-64 relative"><LoadingOverlay visible /></div>;
    if (error || !data) return <div className="text-red-500 p-4">Failed to load ROI data</div>;

    const isProfitable = data.net_profit > 0;
    const roi = Math.min(Math.max(data.roi_percentage, 0), 100);
    const roiData = [
        { name: 'ROI', value: roi },
        { name: 'Remaining', value: 100 - roi }
    ];
    const roiColors = [isProfitable ? '#10b981' : '#3b82f6', '#1e293b'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-sm text-slate-400 font-medium">Total Return Analysis</span>
                    <h3 className="text-xl font-bold text-white">{data.asset_name} ({data.asset_code})</h3>
                </div>
                <Badge variant={isProfitable ? 'success' : 'warning'}>
                    {isProfitable ? 'Profitable' : 'Payback phase'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 h-full">
                    <Card padding="lg" className="h-full flex flex-col items-center justify-center text-center">
                        <div className="relative w-40 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={roiData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={70}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={5}
                                    >
                                        {roiData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={roiColors[index]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {data.roi_percentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <span className="text-sm text-slate-500 mt-2">Asset ROI</span>
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-xl font-bold text-white">Rp {data.net_profit.toLocaleString()}</span>
                            {isProfitable ? <ArrowUpRight size={20} className="text-emerald-500" /> : <ArrowDownRight size={20} className="text-orange-500" />}
                        </div>
                        <span className="text-xs text-slate-500">Net Profit</span>
                    </Card>
                </div>

                <div className="md:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card padding="md" className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Total Revenue</p>
                                <p className="text-lg font-bold text-white">Rp {data.total_rental_revenue.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">{data.billing_count} Invoices</p>
                            </div>
                        </Card>

                        <Card padding="md" className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
                                <Wrench size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Maintenance Cost</p>
                                <p className="text-lg font-bold text-white">Rp {(data.maintenance_cost + data.parts_cost).toLocaleString()}</p>
                                <p className="text-xs text-slate-500">{data.work_order_count} Work Orders</p>
                            </div>
                        </Card>

                        <Card padding="md" className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Utilization</p>
                                <p className="text-lg font-bold text-white">{data.utilization_days} Days</p>
                                <p className="text-xs text-slate-500">Physical time rented</p>
                            </div>
                        </Card>

                        <Card padding="md" className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400">
                                <ChartLine size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Acc. Depreciation</p>
                                <p className="text-lg font-bold text-white">Rp {data.accumulated_depreciation.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">Book Val: Rp {data.book_value.toLocaleString()}</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-950 text-slate-500">Cost Breakdown</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card padding="md" className="bg-slate-900/50">
                    <h5 className="font-medium text-white mb-4 flex items-center gap-2">
                        <Wallet size={18} className="text-slate-400" /> Initial Investment
                    </h5>
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Purchase Price:</span>
                            <span className="font-medium">Rp {data.purchase_price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Purchase Date:</span>
                            <span className="font-medium">{data.purchase_date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Current Book Val:</span>
                            <span className="font-medium">Rp {data.book_value.toLocaleString()}</span>
                        </div>
                    </div>
                </Card>

                <Card padding="md" className="bg-slate-900/50">
                    <h5 className="font-medium text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-slate-400" /> Performance Stats
                    </h5>
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Avg Rev / Bill:</span>
                            <span className="font-medium">
                                Rp {(data.billing_count > 0 ? data.total_rental_revenue / data.billing_count : 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Avg Maint / WO:</span>
                            <span className="font-medium">
                                Rp {(data.work_order_count > 0 ? (data.maintenance_cost + data.parts_cost) / data.work_order_count : 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Maint-to-Rev Ratio:</span>
                            <span className="font-medium">
                                {data.total_rental_revenue > 0 ? ((data.maintenance_cost + data.parts_cost) / data.total_rental_revenue * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
