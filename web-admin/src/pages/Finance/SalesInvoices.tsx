import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import type { Client } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus,
    Search,
    Filter,
    Download,
    MoreVertical,
    TrendingUp,
    Clock,
    CheckCircle2,
    X
} from 'lucide-react';
import { toast } from 'sonner';

export function SalesInvoices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: invoices, isLoading } = useQuery({
        queryKey: ['finance', 'sales-invoices'],
        queryFn: financeApi.listSalesInvoices
    });

    const { data: clientsResponse } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const clients = clientsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createSalesInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-invoices'] });
            setIsModalOpen(false);
            toast.success('Invoice berhasil dibuat dan dijurnal otomatis');
        },
        onError: (error: any) => {
            toast.error('Gagal membuat invoice: ' + error.message);
        }
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            invoice_number: formData.get('invoice_number'),
            client_id: formData.get('client_id'),
            date: formData.get('date'),
            due_date: formData.get('due_date'),
            subject: formData.get('subject'),
            items: [
                {
                    description: formData.get('item_description'),
                    quantity: parseFloat(formData.get('quantity') as string),
                    unit_price: parseFloat(formData.get('unit_price') as string)
                }
            ]
        };
        createMutation.mutate(data);
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
                    <h1 className="text-2xl font-bold text-white">Faktur Penjualan (Invoice)</h1>
                    <p className="text-slate-400">Kelola tagihan dan pembayaran pelanggan</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-cyan-600 hover:bg-cyan-500"
                    >
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
                                        <td className="px-6 py-4 text-white">
                                            {clients.find(c => c.id === inv.client_id)?.name || inv.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={inv.status === 'paid' ? 'success' : 'warning'} className={`${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                inv.status === 'posted' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {inv.status === 'paid' ? 'Lunas' : inv.status === 'posted' ? 'Terposting' : 'Draf'}
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

            {/* Modal Buat Invoice */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Buat Invoice Baru</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Nomor Invoice</label>
                                    <input
                                        name="invoice_number"
                                        required
                                        placeholder="INV/2024/001"
                                        defaultValue={`INV/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Pelanggan</label>
                                    <select
                                        name="client_id"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    >
                                        <option value="">Pilih Pelanggan</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Jatuh Tempo</label>
                                    <input
                                        name="due_date"
                                        type="date"
                                        required
                                        defaultValue={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Subjek/Keterangan</label>
                                <input
                                    name="subject"
                                    placeholder="Deskripsi singkat invoice..."
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>

                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Item Penjualan</h3>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Deskripsi</label>
                                        <input
                                            name="item_description"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Qty</label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            defaultValue="1"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Harga Satuan</label>
                                        <input
                                            name="unit_price"
                                            type="number"
                                            placeholder="0"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 border-slate-800 text-slate-400"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                                >
                                    {createMutation.isPending ? 'Menyimpan...' : 'Buat Invoice'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
