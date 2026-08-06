import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type CreatePurchaseBillRequest } from '../../api/finance';
import { clientApi } from '../../api/client-management';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus,
    Search,
    Filter,
    Download,
    MoreVertical,
    ShoppingBag,
    AlertCircle,
    CheckSquare,
    X
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchaseBills() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: bills, isLoading } = useQuery({
        queryKey: ['finance', 'purchase-bills'],
        queryFn: financeApi.listPurchaseBills
    });

    const { data: vendorsResponse } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => clientApi.list({ limit: 100 })
    });
    const vendors = vendorsResponse?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: financeApi.createPurchaseBill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'purchase-bills'] });
            setIsModalOpen(false);
            toast.success('Tagihan pembelian berhasil dibuat');
        },
        onError: (error: any) => {
            toast.error('Gagal membuat tagihan: ' + error.message);
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
        const data: CreatePurchaseBillRequest = {
            bill_number: (formData.get('bill_number') as string) || '',
            vendor_id: (formData.get('vendor_id') as string) || '',
            date: (formData.get('date') as string) || '',
            due_date: (formData.get('due_date') as string) || undefined,
            budget_type: (formData.get('budget_type') as string) || undefined,
            items: [
                {
                    description: (formData.get('item_description') as string) || '',
                    quantity: parseFloat(formData.get('quantity') as string) || 1,
                    unit_price: parseFloat(formData.get('unit_price') as string) || 0
                }
            ]
        };
        createMutation.mutate(data);
    };

    const totalPayable = bills?.reduce((acc: number, b: any) => acc + (b.total_amount - b.amount_paid), 0) || 0;

    const stats = [
        { label: 'Total Utang', value: formatCurrency(totalPayable), icon: ShoppingBag, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { label: 'Jatuh Tempo', value: formatCurrency(bills?.filter((b: any) => b.status === 'overdue').reduce((a: any, b: any) => a + b.total_amount, 0) || 0), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Lunas (Total)', value: formatCurrency(bills?.filter((b: any) => b.status === 'paid').reduce((a: any, b: any) => a + b.total_amount, 0) || 0), icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tagihan Pembelian</h1>
                    <p className="text-muted-foreground">Kelola tagihan supplier dan pembayaran</p>
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
                        Buat Tagihan
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
                                placeholder="Cari tagihan, supplier..."
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
                                <th className="px-6 py-4">Nomor Tagihan</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Jatuh Tempo</th>
                                <th className="px-6 py-4">Budget</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : bills && bills.length > 0 ? (
                                bills.map((b: any) => (
                                    <tr key={b.id} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 font-medium text-primary">{b.bill_number}</td>
                                        <td className="px-6 py-4 text-foreground">
                                            {vendors.find((v: any) => v.id === b.vendor_id)?.name || b.vendor_id}
                                        </td>
                                        <td className="px-6 py-4 font-mono">{b.date}</td>
                                        <td className="px-6 py-4 font-mono">{b.due_date}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={b.budget_type === 'CAPEX' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}>
                                                {b.budget_type || 'OPEX'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-foreground">
                                            {formatCurrency(b.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={b.status === 'paid' ? 'success' : 'danger'} className={`${b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {b.status === 'paid' ? 'Lunas' : b.status === 'draft' ? 'Draft' : 'Belum Lunas'}
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
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Belum ada tagihan di periode ini
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal Buat Tagihan */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">Buat Tagihan Pembelian</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Nomor Tagihan</label>
                                    <input
                                        name="bill_number"
                                        required
                                        placeholder="BILL/2024/001"
                                        defaultValue={`BILL/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Supplier / Vendor</label>
                                    <select
                                        name="vendor_id"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Pilih Supplier</option>
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
                                    <label className="text-sm font-medium text-muted-foreground">Jatuh Tempo</label>
                                    <input
                                        name="due_date"
                                        type="date"
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Tipe Anggaran (Budget)</label>
                                <select
                                    name="budget_type"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                >
                                    <option value="OPEX">OPEX (Operasional)</option>
                                    <option value="CAPEX">CAPEX (Modal)</option>
                                </select>
                            </div>

                            <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Item Pembelian</h3>
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
                                    {createMutation.isPending ? 'Menyimpan...' : 'Simpan Tagihan'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
