import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    ArrowLeft, Package, Tag, Calculator, 
    History, 
    Info, DollarSign
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { format } from 'date-fns';
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    Badge,
    LoadingOverlay,
    Tabs, TabsList, TabsTrigger, TabsContent,
} from '../../components/ui';
import { InventoryVisuals } from '../../components/Inventory/InventoryVisuals';

export default function InventoryDetail({ itemId }: { itemId?: string }) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = itemId || paramId;
    const navigate = useNavigate();

    // Fetch item detail
    const { data: item, isLoading, error } = useQuery({
        queryKey: ['inventory-item-detail', id],
        queryFn: () => inventoryApi.getItem(id!),
        enabled: !!id,
    });

    // Fetch movements
    const { data: movements = [], isLoading: movementsLoading } = useQuery({
        queryKey: ['inventory-movements', id],
        queryFn: () => inventoryApi.listMovements({ item_id: id!, limit: 50 }),
        enabled: !!id,
    });

    if (isLoading) return <LoadingOverlay visible={true} />;

    if (error || !item) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-destructive">Error Loading Item</h2>
                <p className="text-muted-foreground">{(error as any)?.message || 'Item not found'}</p>
                <Button variant="outline" onClick={() => navigate('/inventory-items')} className="mt-4">
                    Back to List
                </Button>
            </div>
        );
    }

    const isLowStock = Number(item.current_quantity) <= Number(item.min_stock);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/inventory-items')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">
                                {item.name}
                            </h1>
                            <Badge variant={isLowStock ? 'warning' : 'success'}>
                                {isLowStock ? 'Low Stock' : 'In Stock'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm font-mono mt-1">
                            SKU: {item.sku} • {item.category_name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Stok Saat Ini</p>
                        <p className={`text-2xl font-bold ${isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {Number(item.current_quantity)} <span className="text-sm font-normal text-muted-foreground">Unit</span>
                        </p>
                    </div>
                    <Button variant="primary" className="bg-cyan-600 hover:bg-cyan-500">
                        Input Mutasi
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="details">General Info</TabsTrigger>
                    <TabsTrigger value="visuals">Visuals (4-Sided)</TabsTrigger>
                    <TabsTrigger value="history">Stock History</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Summary Cards */}
                        <Card className="md:col-span-1" padding="lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator size={18} className="text-cyan-400" />
                                    Inventory Summary
                                </CardTitle>
                            </CardHeader>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Average Cost</p>
                                    <p className="text-xl font-bold text-foreground">
                                        Rp {Number(item.average_cost).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Value</p>
                                    <p className="text-xl font-bold text-cyan-400">
                                        Rp {(Number(item.current_quantity) * Number(item.average_cost)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Minimum Stock</p>
                                    <p className="text-xl font-bold text-amber-400">
                                        {Number(item.min_stock)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Item Details */}
                        <Card className="md:col-span-2" padding="lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info size={18} className="text-cyan-400" />
                                    Technical Specifications
                                </CardTitle>
                            </CardHeader>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                <DetailItem icon={<Tag size={18} />} label="SKU / Code" value={item.sku} />
                                <DetailItem icon={<Package size={18} />} label="Category" value={item.category_name || '-'} />
                                <DetailItem icon={<DollarSign size={18} />} label="Last Purchase Price" value={`Rp ${Number(item.last_purchase_price).toLocaleString()}`} />
                                <DetailItem icon={<History size={18} />} label="Created At" value={format(new Date(item.created_at), 'dd MMM yyyy')} />
                            </div>
                            <div className="mt-6">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Description</p>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm text-slate-300 min-h-[100px]">
                                    {item.description || "No description provided for this item."}
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="visuals">
                    <Card padding="lg">
                        <InventoryVisuals itemId={id!} readOnly={true} />
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card padding="none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Qty</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Unit Price</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Ref</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {movementsLoading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                    ) : movements.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No movements found</td></tr>
                                    ) : movements.map((m: any) => (
                                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {format(new Date(m.created_at), 'dd MMM yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={m.movement_type.startsWith('IN') ? 'success' : 'danger'}>
                                                    {m.movement_type.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-bold text-right ${m.movement_type.startsWith('IN') ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {m.movement_type.startsWith('IN') ? '+' : '-'}{Number(m.quantity)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                Rp {Number(m.unit_price).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {m.reference_number || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-muted-foreground">{icon}</div>
            <div>
                <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider leading-none mb-1">{label}</p>
                <p className="text-sm text-foreground font-medium">{value}</p>
            </div>
        </div>
    );
}
