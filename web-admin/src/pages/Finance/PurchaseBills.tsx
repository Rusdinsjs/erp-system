import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus,
    Search,
    Filter,
    Download,
    MoreVertical,
    ShoppingBag,
    AlertCircle,
    CheckSquare
} from 'lucide-react';

export function PurchaseBills() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: bills, isLoading } = useQuery({
        queryKey: ['finance', 'purchase-bills'],
        queryFn: financeApi.listPurchaseBills
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const totalPayable = bills?.reduce((acc: number, b: any) => acc + (b.total_amount - b.amount_paid), 0) || 0;

    const stats = [
        { label: 'Total Utang', value: formatCurrency(totalPayable), icon: ShoppingBag, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: 'Jatuh Tempo', value: formatCurrency(bills?.filter((b: any) => b.status === 'overdue').reduce((a: any, b: any) => a + b.total_amount, 0) || 0), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Lunas (Total)', value: formatCurrency(bills?.filter((b: any) => b.status === 'paid').reduce((a: any, b: any) => a + b.total_amount, 0) || 0), icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tagihan Pembelian</h1>
                    <p className="text-slate-400">Kelola tagihan supplier dan pembayaran</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button className="gap-2 bg-rose-600 hover:bg-rose-500">
                        <Plus size={18} />
                        Buat Tagihan
                    </Button>
                </div>
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

            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                placeholder="Cari tagihan, supplier..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="gap-2 border-slate-800 text-slate-400">
                            <Filter size={16} />
                            Filter
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nomor Tagihan</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Jatuh Tempo</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : bills && bills.length > 0 ? (
                                bills.map((b: any) => (
                                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-rose-400">{b.bill_number}</td>
                                        <td className="px-6 py-4 text-white">{b.vendor_id}</td> {/* TODO: Resolve vendor name */}
                                        <td className="px-6 py-4 font-mono">{b.date}</td>
                                        <td className="px-6 py-4 font-mono">{b.due_date}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(b.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={b.status === 'paid' ? 'success' : 'danger'} className={`${b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {b.status === 'paid' ? 'Lunas' : b.status === 'draft' ? 'Draft' : 'Belum Lunas'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                        Belum ada tagihan di periode ini
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
