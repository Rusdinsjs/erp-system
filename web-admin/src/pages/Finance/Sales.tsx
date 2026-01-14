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
    TrendingUp,
    Clock,
    CheckCircle2
} from 'lucide-react';

export function Sales() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['finance', 'sales-invoices'],
        queryFn: financeApi.listSalesInvoices
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const totalReceivable = invoices?.reduce((acc: number, inv: any) => acc + (inv.total_amount - inv.amount_paid), 0) || 0;
    const unpaidCount = invoices?.filter((inv: any) => inv.status !== 'paid').length || 0;

    const stats = [
        { label: 'Total Piutang', value: formatCurrency(totalReceivable), icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Belum Dibayar', value: unpaidCount.toString() + ' Invoice', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Lunas (Total)', value: formatCurrency(invoices?.filter((i: any) => i.status === 'paid').reduce((a: any, b: any) => a + b.total_amount, 0) || 0), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Penjualan</h1>
                    <p className="text-slate-400">Kelola invoice dan penawaran pelanggan Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button className="gap-2 bg-cyan-600 hover:bg-cyan-500">
                        <Plus size={18} />
                        Buat Invoice
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
                                placeholder="Cari invoice, pelanggan..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all"
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
                                <th className="px-6 py-4">Nomor</th>
                                <th className="px-6 py-4">Pelanggan</th>
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
                            ) : invoices && invoices.length > 0 ? (
                                invoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-cyan-400">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 text-white">{inv.client_id}</td> {/* TODO: Resolve client name */}
                                        <td className="px-6 py-4 font-mono">{inv.date}</td>
                                        <td className="px-6 py-4 font-mono">{inv.due_date}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={inv.status === 'paid' ? 'success' : 'warning'} className={`${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {inv.status === 'paid' ? 'Lunas' : 'Belum Lunas'}
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
                                        Belum ada invoice di periode ini
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

