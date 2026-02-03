import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus,
    Search,
    Filter,
    Download,
    MoreVertical,
    Package,
    X
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseShipments() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: shipmentsResponse, isLoading } = useQuery({
        queryKey: ['finance', 'purchase-shipments'],
        queryFn: financeApi.listPurchaseShipments
    });
    const shipments = shipmentsResponse?.data || [];

    // Fetch purchase orders for selection
    const { data: ordersResponse } = useQuery({
        queryKey: ['finance', 'purchase-orders'],
        queryFn: financeApi.listPurchaseOrders
    });
    const orders = ordersResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createPurchaseShipment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'purchase-shipments'] });
            setIsModalOpen(false);
            toast.success('Penerimaan pengiriman berhasil dicatat');
        },
        onError: (error: any) => {
            toast.error('Gagal mencatat pengiriman: ' + error.message);
        }
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            shipment_number: formData.get('shipment_number'),
            purchase_order_id: formData.get('purchase_order_id') || null,
            date: formData.get('date'),
            courier_name: formData.get('courier_name'),
            tracking_number: formData.get('tracking_number'),
            items: [] // In a real app, you'd select items to receive against the PO
        };
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pengiriman Pembelian</h1>
                    <p className="text-slate-400">Kelola penerimaan barang dari vendor</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        <Download size={18} />
                        Export
                    </Button>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                        <Plus size={18} />
                        Catat Penerimaan
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                placeholder="Cari pengiriman..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all"
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
                                <th className="px-6 py-4">No. Penerimaan</th>
                                <th className="px-6 py-4">Referensi PO</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Kurir</th>
                                <th className="px-6 py-4">Resi</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : shipments.length > 0 ? (
                                shipments.map((shipment: any) => (
                                    <tr key={shipment.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-emerald-400 flex items-center gap-2">
                                            <Package size={16} />
                                            {shipment.shipment_number}
                                        </td>
                                        <td className="px-6 py-4 text-white">
                                            {orders.find((o: any) => o.id === shipment.purchase_order_id)?.order_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(shipment.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 text-white">{shipment.courier_name || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{shipment.tracking_number || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 capitalize">
                                                {shipment.status}
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
                                        Belum ada data pengiriman
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Catat Penerimaan */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-xl bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Catat Penerimaan Barang</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Nomor Penerimaan</label>
                                <input
                                    name="shipment_number"
                                    required
                                    placeholder="GRN/2024/001"
                                    defaultValue={`GRN/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Referensi PO (Opsional)</label>
                                <select
                                    name="purchase_order_id"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                >
                                    <option value="">Pilih Pesanan Pembelian</option>
                                    {orders.map((order: any) => (
                                        <option key={order.id} value={order.id}>{order.order_number}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Tanggal Terima</label>
                                <input
                                    name="date"
                                    type="date"
                                    required
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Kurir / Ekspedisi</label>
                                    <input
                                        name="courier_name"
                                        placeholder="JNE, Sicepat, dll"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Nomor Resi</label>
                                    <input
                                        name="tracking_number"
                                        placeholder="No. Resi"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                    />
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
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                                >
                                    {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
