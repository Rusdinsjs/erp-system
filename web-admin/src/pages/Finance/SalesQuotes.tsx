import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus, Search, Filter, Download, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export function SalesQuotes() {
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
                    <h1 className="text-2xl font-bold text-white">Penawaran Penjualan</h1>
                    <p className="text-slate-400">Buat dan kelola penawaran harga untuk pelanggan</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-purple-600 hover:bg-purple-500"
                    >
                        <Plus size={18} />
                        Buat Penawaran
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                placeholder="Cari penawaran..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500/50 transition-all"
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
                                <th className="px-6 py-4">Expired</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td></tr>
                            ) : quotes && quotes.length > 0 ? (
                                quotes.map((quote: any) => (
                                    <tr key={quote.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-purple-400">{quote.quote_number}</td>
                                        <td className="px-6 py-4 text-white">
                                            {clients.find((c: any) => c.id === quote.client_id)?.name || quote.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(quote.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(quote.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={quote.status === 'accepted' ? 'success' : 'default'} className="uppercase text-[10px]">
                                                {quote.status}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
                        {/* Form Content Similar to Invoice but for Quote */}
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Buat Penawaran Baru</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                {/* Fields for Quote Number, Client, Dates, Item */}
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="quote_number" placeholder="Nomor Penawaran" required className="bg-slate-950 border border-slate-800 rounded px-3 py-2" defaultValue={`QT/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`} />
                                    <select name="client_id" className="bg-slate-950 border border-slate-800 rounded px-3 py-2" required>
                                        <option value="">Pilih Klien</option>
                                        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="date" type="date" required className="bg-slate-950 border border-slate-800 rounded px-3 py-2" />
                                    <input name="expiry_date" type="date" className="bg-slate-950 border border-slate-800 rounded px-3 py-2" />
                                </div>
                                <input name="subject" placeholder="Subjek" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2" />

                                <div className="p-4 bg-slate-950/50 rounded border border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Item</h3>
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-6"><input name="item_description" placeholder="Deskripsi" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                        <div className="col-span-2"><input name="quantity" type="number" placeholder="Qty" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                        <div className="col-span-4"><input name="unit_price" type="number" placeholder="Harga" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                    <Button type="submit" className="bg-purple-600 hover:bg-purple-500">Simpan</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
