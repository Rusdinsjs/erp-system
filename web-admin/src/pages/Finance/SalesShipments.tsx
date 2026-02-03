import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus, Search, Filter, Download, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesShipments() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: shipments, isLoading } = useQuery({
        queryKey: ['finance', 'sales-shipments'],
        queryFn: financeApi.listSalesShipments
    });

    const createMutation = useMutation({
        mutationFn: financeApi.createSalesShipment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'sales-shipments'] });
            setIsModalOpen(false);
            toast.success('Pengiriman berhasil dicatat');
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
            date: formData.get('date'),
            courier_name: formData.get('courier_name'),
            tracking_number: formData.get('tracking_number'),
            items: [] // No items for simple shipment, implied link to SO
        };
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pengiriman Barang</h1>
                    <p className="text-muted-foreground">Pantau pengiriman pesanan ke pelanggan</p>
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
                        Catat Pengiriman
                    </Button>
                </div>
            </div>

            <Card className="bg-card border-border overflow-hidden">
                <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                placeholder="Cari resi, pengiriman..."
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
                                <th className="px-6 py-4">Nomor Pengiriman</th>
                                <th className="px-6 py-4">Kurir</th>
                                <th className="px-6 py-4">No. Resi</th>
                                <th className="px-6 py-4">Tanggal Kirim</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center animate-pulse">Memuat data...</td></tr>
                            ) : shipments && shipments.length > 0 ? (
                                shipments.map((ship: any) => (
                                    <tr key={ship.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-primary">{ship.shipment_number}</td>
                                        <td className="px-6 py-4 text-foreground">{ship.courier_name || '-'}</td>
                                        <td className="px-6 py-4 font-mono">{ship.tracking_number || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{new Date(ship.date).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant="warning" className="uppercase text-[10px]">
                                                {ship.status}
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Belum ada pengiriman
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-foreground mb-4">Catat Pengiriman</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <input name="shipment_number" placeholder="Nomor Pengiriman (DO)" required className="w-full bg-background border border-border rounded px-3 py-2 text-foreground" defaultValue={`DO/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`} />
                                <input name="date" type="date" required className="w-full bg-background border border-border rounded px-3 py-2 text-foreground" defaultValue={new Date().toISOString().split('T')[0]} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="courier_name" placeholder="Nama Kurir (JNE, dll)" className="bg-background border border-border rounded px-3 py-2 text-foreground" />
                                    <input name="tracking_number" placeholder="No. Resi" className="bg-background border border-border rounded px-3 py-2 text-foreground" />
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
