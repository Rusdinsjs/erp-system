import { Card } from '../../components/ui';
import { TrendingUp, ShoppingCart, Truck, AlertCircle } from 'lucide-react';

export default function SalesOverview() {
    // Queries to fetch stats would go here
    // For now, we mock or use basic stats

    const stats = [
        { label: 'Total Penjualan Bulan Ini', value: 'Rp 150.000.000', change: '+12%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Invoice Belum Dibayar', value: 'Rp 45.000.000', change: '5 Invoice', icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: 'Pesanan Baru', value: '12', change: 'Hari ini', icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Dalam Pengiriman', value: '8', change: 'Sedang jalan', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Overview Penjualan</h1>
                <p className="text-muted-foreground">Ringkasan aktivitas penjualan Anda</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="bg-card border-border p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={stat.color} size={20} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-card border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Grafik Penjualan</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground">Area Grafik (Coming Soon)</p>
                    </div>
                </Card>

                <Card className="bg-card border-border p-6">
                    <h3 className="text-lg font-bold text-foreground mb-4">Aktivitas Terbaru</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                <div className="flex-1">
                                    <p className="text-sm text-foreground">Invoice <span className="text-cyan-400">#INV-00{i}</span> dibuat</p>
                                    <p className="text-xs text-muted-foreground">2 jam yang lalu</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
