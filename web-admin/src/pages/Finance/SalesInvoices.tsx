import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type SalesInvoice, type CreateSalesInvoiceRequest, type UpdateSalesInvoiceRequest, type CreateInvoiceItemRequest } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import { deriveInvoiceStates, calculateInvoiceTotal } from '../../utils/decimal';
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
    FileText,
    PlusCircle,
    Trash
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesInvoices() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [viewInvoice, setViewInvoice] = useState<SalesInvoice | null>(null);
    const [editInvoice, setEditInvoice] = useState<SalesInvoice | null>(null);

    // Dynamic line items state for create/edit modal
    const [createItems, setCreateItems] = useState<CreateInvoiceItemRequest[]>([
        { description: '', quantity: 1, unit_price: 0 }
    ]);
    const [editItems, setEditItems] = useState<CreateInvoiceItemRequest[]>([
        { description: '', quantity: 1, unit_price: 0 }
    ]);

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
            setCreateItems([{ description: '', quantity: 1, unit_price: 0 }]);
            toast.success('Invoice berhasil dibuat dan dijurnal otomatis');
        },
        onError: (error: any) => {
            toast.error('Gagal membuat invoice: ' + error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSalesInvoiceRequest }) =>
            financeApi.updateSalesInvoice(id, data),
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

    const formatCurrency = (value: number | string) => {
        const val = typeof value === 'number' ? value : parseFloat(value || '0') || 0;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: CreateSalesInvoiceRequest = {
            invoice_number: formData.get('invoice_number') as string,
            client_id: formData.get('client_id') as string,
            date: formData.get('date') as string,
            due_date: (formData.get('due_date') as string) || undefined,
            subject: (formData.get('subject') as string) || undefined,
            items: createItems.map(item => ({
                description: item.description,
                quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 1,
                unit_price: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0
            }))
        };
        createMutation.mutate(data);
    };

    const handleOpenEdit = async (inv: SalesInvoice) => {
        try {
            // Load full invoice details including persisted line items (QARC-011)
            const detail = await financeApi.getSalesInvoice(inv.id);
            setEditInvoice(detail);
            if (detail.items && detail.items.length > 0) {
                setEditItems(
                    detail.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        account_id: item.account_id
                    }))
                );
            } else {
                setEditItems([{ description: detail.subject || 'Penjualan', quantity: 1, unit_price: detail.total_amount }]);
            }
        } catch {
            setEditInvoice(inv);
            setEditItems([{ description: inv.subject || 'Penjualan', quantity: 1, unit_price: inv.total_amount }]);
        }
    };

    const handleOpenView = async (inv: SalesInvoice) => {
        try {
            const detail = await financeApi.getSalesInvoice(inv.id);
            setViewInvoice(detail);
        } catch {
            setViewInvoice(inv);
        }
    };

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editInvoice) return;
        const formData = new FormData(e.currentTarget);
        const data: UpdateSalesInvoiceRequest = {
            invoice_number: formData.get('invoice_number') as string,
            client_id: formData.get('client_id') as string,
            date: formData.get('date') as string,
            due_date: (formData.get('due_date') as string) || undefined,
            subject: (formData.get('subject') as string) || undefined,
            items: editItems.map(item => ({
                description: item.description,
                quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 1,
                unit_price: typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0
            }))
        };
        updateMutation.mutate({ id: editInvoice.id, data });
    };

    const handleDelete = (inv: SalesInvoice) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus invoice "${inv.invoice_number}"?`)) {
            deleteMutation.mutate(inv.id);
        }
    };

    const filteredInvoices = invoices?.filter((inv: SalesInvoice) => {
        if (!searchTerm) return true;
        const clientName = clients.find((c: any) => c.id === inv.client_id)?.name || '';
        return (
            inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.subject?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const totalReceivable = invoices?.reduce((acc: number, inv: SalesInvoice) => {
        const total = typeof inv.total_amount === 'number' ? inv.total_amount : parseFloat(inv.total_amount as string) || 0;
        const paid = typeof inv.amount_paid === 'number' ? inv.amount_paid : parseFloat(inv.amount_paid as string) || 0;
        return acc + (total - paid);
    }, 0) || 0;

    const unpaidCount = invoices?.filter((inv: SalesInvoice) => {
        const { payment } = deriveInvoiceStates(inv);
        return payment !== 'paid';
    }).length || 0;

    const paidTotal = invoices?.filter((inv: SalesInvoice) => deriveInvoiceStates(inv).payment === 'paid')
        .reduce((a: number, b: SalesInvoice) => a + (typeof b.total_amount === 'number' ? b.total_amount : parseFloat(b.total_amount as string) || 0), 0) || 0;

    const stats = [
        { label: 'Total Piutang', value: formatCurrency(totalReceivable), icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Belum Dibayar', value: unpaidCount.toString() + ' Invoice', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Lunas (Total)', value: formatCurrency(paidTotal), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
                        onClick={() => {
                            setCreateItems([{ description: '', quantity: 1, unit_price: 0 }]);
                            setIsModalOpen(true);
                        }}
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
                                <th className="px-6 py-4 text-center">Status Pembayaran</th>
                                <th className="px-6 py-4 text-center">Jurnal / Post</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : filteredInvoices && filteredInvoices.length > 0 ? (
                                filteredInvoices.map((inv: SalesInvoice) => {
                                    const states = deriveInvoiceStates(inv);
                                    return (
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
                                                <Badge
                                                    variant={states.payment === 'paid' ? 'success' : states.payment === 'partially_paid' ? 'info' : 'warning'}
                                                    className={
                                                        states.payment === 'paid'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : states.payment === 'partially_paid'
                                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }
                                                >
                                                    {states.payment === 'paid' ? 'Lunas' : states.payment === 'partially_paid' ? 'Sebagian' : 'Belum Dibayar'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge
                                                    variant={states.posting === 'posted' ? 'success' : 'outline'}
                                                    className={states.posting === 'posted' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400'}
                                                >
                                                    {states.posting === 'posted' ? 'Terposting' : 'Draf'}
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
                                                                    handleOpenView(inv);
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
                                                                    handleOpenEdit(inv);
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
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
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
                                    <p className="text-xs text-slate-500 uppercase">Status Pembayaran</p>
                                    <Badge variant={deriveInvoiceStates(viewInvoice).payment === 'paid' ? 'success' : 'warning'} className="mt-1">
                                        {deriveInvoiceStates(viewInvoice).payment === 'paid' ? 'Lunas' : 'Belum Lunas'}
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

                            {/* Line items view (QARC-011) */}
                            {viewInvoice.items && viewInvoice.items.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Rincian Line Items</p>
                                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                                        <table className="w-full text-xs text-left text-slate-300">
                                            <thead className="bg-slate-950 text-slate-500 uppercase">
                                                <tr>
                                                    <th className="p-2.5">Deskripsi</th>
                                                    <th className="p-2.5 text-center">Qty</th>
                                                    <th className="p-2.5 text-right">Harga Satuan</th>
                                                    <th className="p-2.5 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {viewInvoice.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-950/30">
                                                        <td className="p-2.5">{item.description}</td>
                                                        <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                                                        <td className="p-2.5 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                                                        <td className="p-2.5 text-right font-mono font-semibold">{formatCurrency(item.total_price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
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

                            {/* Multiple Line Items Editor (QARC-011) */}
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Item Penjualan</h3>
                                    <button
                                        type="button"
                                        onClick={() => setEditItems([...editItems, { description: '', quantity: 1, unit_price: 0 }])}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <PlusCircle size={14} /> Tambah Line Item
                                    </button>
                                </div>

                                {editItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <div className="col-span-5">
                                            <input
                                                placeholder="Deskripsi Item"
                                                value={item.description}
                                                onChange={(e) => {
                                                    const updated = [...editItems];
                                                    updated[idx].description = e.target.value;
                                                    setEditItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const updated = [...editItems];
                                                    updated[idx].quantity = e.target.value;
                                                    setEditItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                type="number"
                                                placeholder="Harga Satuan"
                                                value={item.unit_price}
                                                onChange={(e) => {
                                                    const updated = [...editItems];
                                                    updated[idx].unit_price = e.target.value;
                                                    setEditItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-right focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            {editItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right pt-2 border-t border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase mr-2">Estimasi Total:</span>
                                    <span className="text-sm font-bold text-white font-mono">{formatCurrency(calculateInvoiceTotal(editItems))}</span>
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
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
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

                            {/* Multiple Line Items Creator (QARC-011) */}
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Item Penjualan</h3>
                                    <button
                                        type="button"
                                        onClick={() => setCreateItems([...createItems, { description: '', quantity: 1, unit_price: 0 }])}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                                    >
                                        <PlusCircle size={14} /> Tambah Line Item
                                    </button>
                                </div>

                                {createItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                        <div className="col-span-5">
                                            <input
                                                placeholder="Deskripsi Item"
                                                value={item.description}
                                                onChange={(e) => {
                                                    const updated = [...createItems];
                                                    updated[idx].description = e.target.value;
                                                    setCreateItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const updated = [...createItems];
                                                    updated[idx].quantity = e.target.value;
                                                    setCreateItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-center focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                type="number"
                                                placeholder="Harga Satuan"
                                                value={item.unit_price}
                                                onChange={(e) => {
                                                    const updated = [...createItems];
                                                    updated[idx].unit_price = e.target.value;
                                                    setCreateItems(updated);
                                                }}
                                                required
                                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono text-right focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            {createItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateItems(createItems.filter((_, i) => i !== idx))}
                                                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right pt-2 border-t border-slate-800">
                                    <span className="text-xs text-slate-500 uppercase mr-2">Estimasi Total:</span>
                                    <span className="text-sm font-bold text-white font-mono">{formatCurrency(calculateInvoiceTotal(createItems))}</span>
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
