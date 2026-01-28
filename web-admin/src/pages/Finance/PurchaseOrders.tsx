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

export function PurchaseOrders() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: ordersResponse, isLoading } = useQuery({
        queryKey: ['finance', 'purchase-orders'],
        queryFn: financeApi.listPurchaseOrders
    });
    const orders = ordersResponse?.data || [];

    const { data: vendorsResponse } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const vendors = vendorsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'purchase-orders'] });
            setIsModalOpen(false);
            toast.success('Pesanan pembelian berhasil dibuat');
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
            vendor_id: formData.get('vendor_id'),
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
                    <h1 className="text-2xl font-bold text-foreground">Pesanan Pembelian</h1>
                    <p className="text-muted-foreground">Kelola pesanan pembelian (PO) ke vendor</p>
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
                        Buat Pesanan
                    </Button>
                </div>
            </div>

            <Card className="bg-card border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                placeholder="Cari pesanan..."
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
                                <th className="px-6 py-4">Nomor PO</th>
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Pengiriman</th>
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
                            ) : orders.length > 0 ? (
                                orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-primary">{order.order_number}</td>
                                        <td className="px-6 py-4 text-foreground">
                                            {vendors.find((v: any) => v.id === order.vendor_id)?.name || order.vendor_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(order.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('id-ID') : '-'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-foreground">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={order.status === 'confirmed' ? 'success' : 'warning'} className="capitalize">
                                                {order.status}
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
                                        Belum ada pesanan pembelian
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Buat Pesanan */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">Buat Pesanan Pembelian (PO)</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Nomor PO</label>
                                    <input
                                        name="order_number"
                                        required
                                        placeholder="PO/2024/001"
                                        defaultValue={`PO/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                                    <select
                                        name="vendor_id"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
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
                                    <label className="text-sm font-medium text-muted-foreground">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Tanggal Pengiriman</label>
                                    <input
                                        name="delivery_date"
                                        type="date"
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Subjek</label>
                                <input
                                    name="subject"
                                    placeholder="Pesanan pembelian untuk..."
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Item</h3>
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
                                    {createMutation.isPending ? 'Menyimpan...' : 'Buat Pesanan'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
