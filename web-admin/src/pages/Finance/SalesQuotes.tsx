import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus, Search, Filter, Download, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesQuotes() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: quotes, isLoading } = useQuery({
        queryKey: ['finance', 'sales-quotes'],
        queryFn: financeApi.listSalesQuotes
    });

    const { data: clientsResponse } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const clients = clientsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createSalesQuote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-quotes'] });
            setIsModalOpen(false);
            toast.success('Penawaran berhasil dibuat');
        },
        onError: (error: any) => {
            toast.error('Gagal membuat penawaran: ' + error.message);
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
            quote_number: formData.get('quote_number'),
            client_id: formData.get('client_id'),
            date: formData.get('date'),
            expiry_date: formData.get('expiry_date'),
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Penawaran Penjualan</h1>
                    <p className="text-muted-foreground">Buat dan kelola penawaran harga untuk pelanggan</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-border text-muted-foreground">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus size={18} />
                        Buat Penawaran
                    </Button>
                </div>
            </div>

            <Card className="bg-card border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                placeholder="Cari penawaran..."
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
                                <th className="px-6 py-4">Expired</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td></tr>
                            ) : quotes && quotes.length > 0 ? (
                                quotes.map((quote: any) => (
                                    <tr key={quote.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-primary">{quote.quote_number}</td>
                                        <td className="px-6 py-4 text-foreground">
                                            {clients.find((c: any) => c.id === quote.client_id)?.name || quote.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(quote.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-foreground">
                                            {formatCurrency(quote.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={quote.status === 'accepted' ? 'success' : 'default'} className="uppercase text-[10px]">
                                                {quote.status}
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
                                        Belum ada penawaran
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal - Simplified Create Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-card border-border shadow-2xl">
                        {/* Form Content Similar to Invoice but for Quote */}
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-foreground mb-4">Buat Penawaran Baru</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                {/* Fields for Quote Number, Client, Dates, Item */}
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="quote_number" placeholder="Nomor Penawaran" required className="bg-background border border-border rounded px-3 py-2 text-foreground" defaultValue={`QT/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`} />
                                    <select name="client_id" className="bg-background border border-border rounded px-3 py-2 text-foreground" required>
                                        <option value="">Pilih Klien</option>
                                        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="date" type="date" required className="bg-background border border-border rounded px-3 py-2 text-foreground" />
                                    <input name="expiry_date" type="date" className="bg-background border border-border rounded px-3 py-2 text-foreground" />
                                </div>
                                <input name="subject" placeholder="Subjek" className="w-full bg-background border border-border rounded px-3 py-2 text-foreground" />

                                <div className="p-4 bg-muted/50 rounded border border-border">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Item</h3>
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-6"><input name="item_description" placeholder="Deskripsi" className="w-full bg-background border border-border rounded px-2 py-1 text-foreground" /></div>
                                        <div className="col-span-2"><input name="quantity" type="number" placeholder="Qty" className="w-full bg-background border border-border rounded px-2 py-1 text-foreground" /></div>
                                        <div className="col-span-4"><input name="unit_price" type="number" placeholder="Harga" className="w-full bg-background border border-border rounded px-2 py-1 text-foreground" /></div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">Simpan</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
