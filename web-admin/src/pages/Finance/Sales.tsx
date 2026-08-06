import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type CreateSalesInvoiceRequest } from '../../api/finance';
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
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { deriveInvoiceStates, formatCurrencyIDR, subtractDecimalStrings, sumDecimalStrings } from '../../utils/decimal';

export default function Sales() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [createDefaults, setCreateDefaults] = useState({ invoiceNumber: '', date: '', dueDate: '' });
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
        onError: (error: unknown) => {
            toast.error('Gagal membuat invoice: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    const handleOpenCreate = () => {
        const now = new Date();
        const due = new Date(now);
        due.setDate(due.getDate() + 7);
        setCreateDefaults({
            invoiceNumber: `INV/${now.getFullYear()}/${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            date: now.toISOString().slice(0, 10),
            dueDate: due.toISOString().slice(0, 10),
        });
        setIsModalOpen(true);
    };

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: CreateSalesInvoiceRequest = {
            invoice_number: (formData.get('invoice_number') as string) || '',
            client_id: (formData.get('client_id') as string) || '',
            date: (formData.get('date') as string) || '',
            due_date: (formData.get('due_date') as string) || undefined,
            subject: (formData.get('subject') as string) || undefined,
            items: [
                {
                    description: (formData.get('item_description') as string) || '',
                    quantity: (formData.get('quantity') as string) || '1.0000',
                    unit_price: (formData.get('unit_price') as string) || '0.0000'
                }
            ]
        };
        createMutation.mutate(data);
    };

    const totalReceivable = sumDecimalStrings(
        invoices?.map((invoice) => subtractDecimalStrings(invoice.total_amount, invoice.amount_paid)) ?? [],
    );
    const unpaidCount = invoices?.filter((invoice) => deriveInvoiceStates(invoice).payment !== 'paid').length ?? 0;
    const paidTotal = sumDecimalStrings(
        invoices?.filter((invoice) => deriveInvoiceStates(invoice).payment === 'paid').map((invoice) => invoice.total_amount) ?? [],
    );

    const stats = [
        { label: 'Total Piutang', value: formatCurrencyIDR(totalReceivable), icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Belum Dibayar', value: unpaidCount.toString() + ' Invoice', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Lunas (Total)', value: formatCurrencyIDR(paidTotal), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Penjualan</h1>
                    <p className="text-muted-foreground">Kelola invoice dan penawaran pelanggan Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-border text-muted-foreground">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={handleOpenCreate}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus size={18} />
                        Buat Invoice
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="bg-card border-border">
                        <div className="p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="bg-card border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                placeholder="Cari invoice, pelanggan..."
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="gap-2 border-border text-muted-foreground">
                            <Filter size={16} />
                            Filter
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
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
                        <tbody className="divide-y divide-border text-foreground">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : invoices && invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-primary">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 text-foreground">
                                            {clients.find((c) => c.id === inv.client_id)?.name || inv.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-foreground">
                                            {formatCurrencyIDR(inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={deriveInvoiceStates(inv).payment === 'paid' ? 'success' : 'warning'} className={`${deriveInvoiceStates(inv).payment === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {deriveInvoiceStates(inv).payment === 'paid' ? 'Lunas' : deriveInvoiceStates(inv).payment === 'partially_paid' ? 'Sebagian' : 'Belum Dibayar'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">Buat Invoice Baru</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Nomor Invoice</label>
                                    <input
                                        name="invoice_number"
                                        required
                                        placeholder="INV/2024/001"
                                        defaultValue={createDefaults.invoiceNumber}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Pelanggan</label>
                                    <select
                                        name="client_id"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Pilih Pelanggan</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={createDefaults.date}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Jatuh Tempo</label>
                                    <input
                                        name="due_date"
                                        type="date"
                                        required
                                        defaultValue={createDefaults.dueDate}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Subjek/Keterangan</label>
                                <input
                                    name="subject"
                                    placeholder="Deskripsi singkat invoice..."
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Item Penjualan</h3>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6 space-y-1">
                                        <label className="text-[10px] text-muted-foreground uppercase">Deskripsi</label>
                                        <input
                                            name="item_description"
                                            required
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-muted-foreground uppercase">Qty</label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            defaultValue="1"
                                            required
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-[10px] text-muted-foreground uppercase">Harga Satuan</label>
                                        <input
                                            name="unit_price"
                                            type="number"
                                            placeholder="0"
                                            required
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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

