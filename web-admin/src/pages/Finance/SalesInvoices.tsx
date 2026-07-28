import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { clientApi } from '../../api/client-management';
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
    X,
    Eye,
    Edit,
    Trash2,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesInvoices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [viewInvoice, setViewInvoice] = useState<any | null>(null);
    const [editInvoice, setEditInvoice] = useState<any | null>(null);

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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.updateSalesInvoice(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-invoices'] });
            setEditInvoice(null);
            toast.success('Invoice berhasil diperbarui');
        },
        onError: (error: any) => {
            toast.error('Gagal memperbarui invoice: ' + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: financeApi.deleteSalesInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-invoices'] });
            toast.success('Invoice berhasil dihapus');
        },
        onError: (error: any) => {
            toast.error('Gagal menghapus invoice: ' + error.message);
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

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editInvoice) return;
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
        updateMutation.mutate({ id: editInvoice.id, data });
    };

    const handleDelete = (inv: any) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus invoice "${inv.invoice_number}"?`)) {
            deleteMutation.mutate(inv.id);
        }
    };

    const filteredInvoices = invoices?.filter((inv: any) => {
        if (!searchTerm) return true;
        const clientName = clients.find((c: any) => c.id === inv.client_id)?.name || '';
        return (
            inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.subject?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

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
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : filteredInvoices && filteredInvoices.length > 0 ? (
                                filteredInvoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-cyan-400 font-mono">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 text-white">
                                            {clients.find((c: any) => c.id === inv.client_id)?.name || inv.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white font-mono">
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
                                        <td className="px-6 py-4 text-center relative">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === inv.id ? null : inv.id);
                                                }}
                                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
                                                title="Opsi Invoice"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeMenuId === inv.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setActiveMenuId(null)}
                                                    />
                                                    <div className="absolute right-6 top-12 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden py-1 text-left">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setViewInvoice(inv);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                                                        >
                                                            <Eye size={14} className="text-cyan-400" />
                                                            Lihat Detail
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditInvoice(inv);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                                                        >
                                                            <Edit size={14} className="text-amber-400" />
                                                            Edit Invoice
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleDelete(inv);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={14} className="text-rose-400" />
                                                            Hapus Invoice
                                                        </button>
                                                    </div>
                                                </>
                                            )}
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

            {/* Modal View Invoice */}
            {viewInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-xl bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <FileText className="text-cyan-400" size={24} />
                                <div>
                                    <h2 className="text-xl font-bold text-white font-mono">{viewInvoice.invoice_number}</h2>
                                    <p className="text-xs text-slate-400">Faktur Penjualan Detail</p>
                                </div>
                            </div>
                            <button onClick={() => setViewInvoice(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Pelanggan</p>
                                    <p className="text-sm font-semibold text-white">
                                        {clients.find((c: any) => c.id === viewInvoice.client_id)?.name || viewInvoice.client_id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Status</p>
                                    <Badge variant={viewInvoice.status === 'paid' ? 'success' : 'warning'} className="mt-1">
                                        {viewInvoice.status === 'paid' ? 'Lunas' : viewInvoice.status === 'posted' ? 'Terposting' : 'Draf'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Tanggal Faktur</p>
                                    <p className="text-sm font-mono text-slate-300">{new Date(viewInvoice.date).toLocaleDateString('id-ID')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Jatuh Tempo</p>
                                    <p className="text-sm font-mono text-slate-300">{viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString('id-ID') : '-'}</p>
                                </div>
                            </div>

                            {viewInvoice.subject && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase mb-1">Subjek / Keterangan</p>
                                    <p className="text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">{viewInvoice.subject}</p>
                                </div>
                            )}

                            <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-cyan-400 uppercase font-semibold">Total Tagihan</p>
                                    <p className="text-2xl font-bold text-white font-mono mt-0.5">{formatCurrency(viewInvoice.total_amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase">Sudah Dibayar</p>
                                    <p className="text-sm font-mono text-emerald-400 font-bold">{formatCurrency(viewInvoice.amount_paid || 0)}</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setViewInvoice(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-white"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal Edit Invoice */}
            {editInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Edit Invoice #{editInvoice.invoice_number}</h2>
                            <button onClick={() => setEditInvoice(null)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Nomor Invoice</label>
                                    <input
                                        name="invoice_number"
                                        required
                                        defaultValue={editInvoice.invoice_number}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Pelanggan</label>
                                    <select
                                        name="client_id"
                                        required
                                        defaultValue={editInvoice.client_id}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    >
                                        <option value="">Pilih Pelanggan</option>
                                        {clients.map((client: any) => (
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
                                        defaultValue={editInvoice.date ? new Date(editInvoice.date).toISOString().split('T')[0] : ''}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Jatuh Tempo</label>
                                    <input
                                        name="due_date"
                                        type="date"
                                        required
                                        defaultValue={editInvoice.due_date ? new Date(editInvoice.due_date).toISOString().split('T')[0] : ''}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Subjek/Keterangan</label>
                                <input
                                    name="subject"
                                    defaultValue={editInvoice.subject || ''}
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
                                            defaultValue={editInvoice.subject || 'Penjualan'}
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
                                            defaultValue={editInvoice.total_amount || 0}
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
                                    onClick={() => setEditInvoice(null)}
                                    className="flex-1 border-slate-800 text-slate-400"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateMutation.isPending}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                                >
                                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

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
                                        {clients.map((client: any) => (
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all font-mono"
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
