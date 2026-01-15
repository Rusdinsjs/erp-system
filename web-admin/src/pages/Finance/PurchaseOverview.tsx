import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card } from '../../components/ui';
import {
    ShoppingBag,
    TrendingUp,
    Clock,
    AlertCircle,
    CheckCircle2,
    Truck,
    FileText
} from 'lucide-react';

export function PurchaseOverview() {
    // Queries to fetch data for stats
    const { data: quotes } = useQuery({ queryKey: ['finance', 'purchase-quotes'], queryFn: financeApi.listPurchaseQuotes });
    const { data: orders } = useQuery({ queryKey: ['finance', 'purchase-orders'], queryFn: financeApi.listPurchaseOrders });
    const { data: shipments } = useQuery({ queryKey: ['finance', 'purchase-shipments'], queryFn: financeApi.listPurchaseShipments });

    // Calculate stats
    const totalOrders = orders?.data?.length || 0;
    const pendingOrders = orders?.data?.filter((o: any) => o.status === 'draft' || o.status === 'sent').length || 0;
    const activeShipments = shipments?.data?.filter((s: any) => s.status !== 'completed').length || 0;
    const recentQuotes = quotes?.data?.slice(0, 5) || [];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const stats = [
        { label: 'Total Pesanan', value: totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Pesanan Pending', value: pendingOrders.toString(), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Pengiriman Aktif', value: activeShipments.toString(), icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Overview Pembelian</h1>
                <p className="text-slate-400">Ringkasan aktivitas pembelian dan pengadaan</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="bg-slate-900/50 border-slate-800">
                        <div className="p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                                <p className="text-lg font-bold text-white">{stat.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card className="bg-slate-900/50 border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <ShoppingBag size={18} className="text-blue-400" />
                            Pesanan Terbaru
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {orders?.data?.slice(0, 5).map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                                <div>
                                    <p className="font-medium text-white">{order.order_number}</p>
                                    <p className="text-xs text-slate-400">{new Date(order.date).toLocaleDateString('id-ID')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-blue-400">{formatCurrency(order.total_amount)}</p>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!orders?.data || orders?.data.length === 0) && (
                            <p className="text-center text-slate-500 py-4">Belum ada pesanan terbaru</p>
                        )}
                    </div>
                </Card>

                {/* Recent Quotes */}
                <Card className="bg-slate-900/50 border-slate-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <FileText size={18} className="text-purple-400" />
                            Penawaran Terbaru
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {recentQuotes.map((quote: any) => (
                            <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                                <div>
                                    <p className="font-medium text-white">{quote.quote_number}</p>
                                    <p className="text-xs text-slate-400">{quote.subject || '-'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-purple-400">{formatCurrency(quote.total_amount)}</p>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                                        {quote.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!recentQuotes || recentQuotes.length === 0) && (
                            <p className="text-center text-slate-500 py-4">Belum ada penawaran terbaru</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
