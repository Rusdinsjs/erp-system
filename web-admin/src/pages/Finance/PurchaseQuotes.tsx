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
    X
} from 'lucide-react';
import { toast } from 'sonner';

export function PurchaseQuotes() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: quotesResponse, isLoading } = useQuery({
        queryKey: ['finance', 'purchase-quotes'],
        queryFn: financeApi.listPurchaseQuotes
    });
    const quotes = quotesResponse?.data || [];

    const { data: vendorsResponse } = useQuery({
        queryKey: ['vendors'], // Assuming clients can act as vendors for now, or fetch specific vendors
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const vendors = vendorsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createPurchaseQuote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'purchase-quotes'] });
            setIsModalOpen(false);
            toast.success('Penawaran pembelian berhasil dibuat');
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
            vendor_id: formData.get('vendor_id'),
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
                    <h1 className="text-2xl font-bold text-white">Penawaran Pembelian</h1>
                    <p className="text-slate-400">Kelola permintaan penawaran harga (RFQ) ke vendor</p>
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
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Berlaku Hingga</th>
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
                            ) : quotes.length > 0 ? (
                                quotes.map((quote: any) => (
                                    <tr key={quote.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-purple-400">{quote.quote_number}</td>
                                        <td className="px-6 py-4 text-white">
                                            {vendors.find((v: any) => v.id === quote.vendor_id)?.name || quote.vendor_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(quote.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(quote.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={quote.status === 'accepted' ? 'success' : 'warning'} className="capitalize">
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
                                        Belum ada penawaran pembelian
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Buat Penawaran */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Buat Penawaran Pembelian (RFQ)</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Nomor RFQ</label>
                                    <input
                                        name="quote_number"
                                        required
                                        placeholder="RFQ/2024/001"
                                        defaultValue={`RFQ/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Vendor</label>
                                    <select
                                        name="vendor_id"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-all"
                                    >
                                        <option value="">Pilih Vendor</option>
                                        {vendors.map((vendor: any) => (
                                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Berlaku Hingga</label>
                                    <input
                                        name="expiry_date"
                                        type="date"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Subjek</label>
                                <input
                                    name="subject"
                                    placeholder="Permintaan penawaran untuk..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition-all"
                                />
                            </div>

                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Item</h3>
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-6 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Deskripsi</label>
                                        <input
                                            name="item_description"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Qty</label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            defaultValue="1"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase">Estimasi Harga</label>
                                        <input
                                            name="unit_price"
                                            type="number"
                                            placeholder="0"
                                            required
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 outline-none"
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
                                    className="flex-1 bg-purple-600 hover:bg-purple-500"
                                >
                                    {createMutation.isPending ? 'Menyimpan...' : 'Buat Penawaran'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
