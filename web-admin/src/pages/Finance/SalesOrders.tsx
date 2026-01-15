import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus, Search, Filter, Download, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export function SalesOrders() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: orders, isLoading } = useQuery({
        queryKey: ['finance', 'sales-orders'],
        queryFn: financeApi.listSalesOrders
    });

    const { data: clientsResponse } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const clients = clientsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createSalesOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-orders'] });
            setIsModalOpen(false);
            toast.success('Pesanan Penjualan berhasil dibuat');
        },
        onError: (error: any) => {
            toast.error('Gagal membuat pesanan: ' + error.message);
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
            order_number: formData.get('order_number'),
            client_id: formData.get('client_id'),
            date: formData.get('date'),
            delivery_date: formData.get('delivery_date'),
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
                    <h1 className="text-2xl font-bold text-white">Pesanan Penjualan (SO)</h1>
                    <p className="text-slate-400">Kelola pesanan masuk dari pelanggan</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-blue-600 hover:bg-blue-500"
                    >
                        <Plus size={18} />
                        Buat Pesanan
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                placeholder="Cari pesanan..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all"
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
                                <th className="px-6 py-4">Nomor SO</th>
                                <th className="px-6 py-4">Pelanggan</th>
                                <th className="px-6 py-4">Tanggal Order</th>
                                <th className="px-6 py-4">Kirim Via</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td></tr>
                            ) : orders && orders.length > 0 ? (
                                orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-blue-400">{order.order_number}</td>
                                        <td className="px-6 py-4 text-white">
                                            {clients.find(c => c.id === order.client_id)?.name || order.client_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(order.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant="default" className="text-[10px] uppercase">
                                                {order.status}
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
                                        Belum ada pesanan penjualan
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
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Buat Pesanan Baru</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="order_number" placeholder="Nomor SO" required className="bg-slate-950 border border-slate-800 rounded px-3 py-2" defaultValue={`SO/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`} />
                                    <select name="client_id" className="bg-slate-950 border border-slate-800 rounded px-3 py-2" required>
                                        <option value="">Pilih Klien</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="date" type="date" required className="bg-slate-950 border border-slate-800 rounded px-3 py-2" />
                                    <input name="delivery_date" type="date" className="bg-slate-950 border border-slate-800 rounded px-3 py-2" placeholder="Tgl Kirim" />
                                </div>
                                <input name="subject" placeholder="Subjek / Referensi" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2" />

                                <div className="p-4 bg-slate-950/50 rounded border border-slate-800">
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-6"><input name="item_description" placeholder="Deskripsi Item" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                        <div className="col-span-2"><input name="quantity" type="number" placeholder="Qty" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                        <div className="col-span-4"><input name="unit_price" type="number" placeholder="Harga" className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1" /></div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-500">Simpan</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
