import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package, Search, Plus, Filter,
    ArrowUpRight, ArrowDownRight, AlertTriangle,
    History, Edit2, Trash2, Box, BarChart2, Loader2, X,
    ExternalLink, Upload, FileText
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import type { InventoryItem, InventoryCategory, InventoryMovement } from '../../api/inventory';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { format } from 'date-fns';
import { ImportInventoryModal } from '../../components/Inventory/ImportInventoryModal';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { InventoryVisuals } from '../../components/Inventory/InventoryVisuals';


export default function InventoryItems() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();

    // Queries
    const { data: items = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['inventory-items', categoryFilter],
        queryFn: () => inventoryApi.listItems({ category_id: categoryFilter === 'all' ? undefined : categoryFilter })
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: inventoryApi.listCategories
    });

    const { data: movements = [], isLoading: movementsLoading } = useQuery({
        queryKey: ['inventory-movements', selectedItemForHistory?.id],
        queryFn: () => inventoryApi.listMovements({ item_id: selectedItemForHistory?.id }),
        enabled: historyModalOpen
    });

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category_id: '',
        unit_id: 1, // Default unit
        description: '',
        min_stock: 0,
        max_stock: 0,
        initial_quantity: 0,
        purchase_price: 0
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: inventoryApi.createItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            setModalOpen(false);
            success('Item created successfully', 'Success');
        },
        onError: (err: any) => showError(err.response?.data?.message || 'Failed to create item', 'Error')
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string, payload: any }) => inventoryApi.updateItem(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            setModalOpen(false);
            success('Item updated successfully', 'Success');
        },
        onError: (err: any) => showError(err.response?.data?.message || 'Failed to update item', 'Error')
    });

    const deleteMutation = useMutation({
        mutationFn: inventoryApi.deleteItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            success('Item deleted successfully', 'Success');
        },
        onError: (err: any) => showError(err.response?.data?.message || 'Failed to delete item', 'Error')
    });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = useMemo(() => {
        if (!Array.isArray(items)) return [];
        return [...items].sort((a, b) => {
            if (!sortConfig) return 0;
            const aValue = (a as any)[sortConfig.key] ?? '';
            const bValue = (b as any)[sortConfig.key] ?? '';

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    const filteredItems = sortedItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = useMemo(() => {
        if (!Array.isArray(items)) return { total: 0, low: 0, out: 0, value: 0 };
        return {
            total: items.length,
            low: items.filter(i => Number(i.current_quantity) <= Number(i.min_stock) && Number(i.current_quantity) > 0).length,
            out: items.filter(i => Number(i.current_quantity) <= 0).length,
            value: items.reduce((acc, i) => acc + (Number(i.current_quantity) * Number(i.average_cost)), 0)
        };
    }, [items]);

    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormData({
            sku: '',
            name: '',
            category_id: categories[0]?.id || '',
            unit_id: 1,
            description: '',
            min_stock: 0,
            max_stock: 0,
            initial_quantity: 0,
            purchase_price: 0
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            sku: item.sku,
            name: item.name,
            category_id: item.category_id,
            unit_id: item.unit_id,
            description: item.description || '',
            min_stock: Number(item.min_stock),
            max_stock: Number(item.max_stock),
            initial_quantity: 0, // Not used for edit
            purchase_price: Number(item.average_cost)
        });
        setModalOpen(true);
    };

    const handleOpenHistory = (item?: InventoryItem) => {
        setSelectedItemForHistory(item || null);
        setHistoryModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({
                id: editingItem.id,
                payload: {
                    name: formData.name,
                    description: formData.description,
                    min_stock: formData.min_stock,
                    max_stock: formData.max_stock
                }
            });
        } else {
            createMutation.mutate(formData);
        }
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30"><Filter size={14} /></div>;
        return sortConfig.direction === 'asc' ? <ArrowUpRight size={14} className="text-cyan-400" /> : <ArrowDownRight size={14} className="text-cyan-400" />;
    };

    if (itemsLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 size={32} className="animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tighter">Daftar Barang Inventory</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Kelola stok suku cadang dan persediaan operasional.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            try {
                                info('Sedang menyusun laporan PDF...', 'Mempersiapkan');
                                await inventoryApi.exportPdf();
                                success('Laporan PDF berhasil diunduh.', 'Sukses');
                            } catch (err: any) {
                                showError('Gagal mengekspor PDF', 'Error');
                            }
                        }}
                        className="flex items-center gap-2 bg-card/60 backdrop-blur-md hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl transition-all border border-border shadow-sm"
                    >
                        <FileText size={18} />
                        <span className="font-medium">Export PDF</span>
                    </button>
                    <button 
                        onClick={() => setImportModalOpen(true)}
                        className="flex items-center gap-2 bg-card/60 backdrop-blur-md hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl transition-all border border-border shadow-sm"
                    >
                        <Upload size={18} />
                        <span className="font-medium">Import</span>
                    </button>
                    <button 
                        onClick={() => handleOpenHistory()}
                        className="flex items-center gap-2 bg-card/60 backdrop-blur-md hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl transition-all border border-border shadow-sm"
                    >
                        <History size={18} />
                        <span className="font-medium">Riwayat Mutasi</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                    >
                        <Plus size={18} />
                        <span className="font-bold tracking-wide">Tambah Barang</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {[
                    { label: 'Total Item', value: stats.total.toLocaleString(), icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Low Stock', value: stats.low.toString(), icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Out of Stock', value: stats.out.toString(), icon: Package, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Nilai Inventory', value: `Rp ${stats.value.toLocaleString()}`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                ].map((stat, i) => (
                    <div key={i} className="bg-card/60 backdrop-blur-xl border border-border p-5 rounded-3xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group overflow-hidden relative flex flex-col justify-between min-h-[120px]">
                        <div className={`absolute -top-4 -right-4 w-24 h-24 ${stat.bg.split(' ')[0]} rounded-full blur-[30px] group-hover:scale-150 transition-transform pointer-events-none`} />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl border shadow-lg group-hover:scale-110 transition-transform`}>
                                <stat.icon size={22} />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <div className="text-3xl font-black text-foreground font-mono tracking-tight">{stat.value}</div>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 block">{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-card/40 backdrop-blur-xl border border-border p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center relative z-10 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan SKU atau nama barang..."
                        className="w-full bg-background/50 border border-border rounded-xl py-3 pl-11 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-background/50 border border-border text-foreground px-5 py-3 rounded-xl hover:bg-muted/50 transition-all font-medium">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                    <select
                        className="flex-1 md:flex-none bg-background/50 border border-border text-foreground px-5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Semua Kategori</option>
                        {categories.map((cat: InventoryCategory) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl relative z-10">
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-card/90 backdrop-blur-md">
                                <th
                                    className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:bg-muted/50 hover:text-foreground transition-colors group select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-2">
                                        Barang
                                        <SortIcon columnKey="name" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:bg-muted/50 hover:text-foreground transition-colors group select-none"
                                    onClick={() => handleSort('category_name')}
                                >
                                    <div className="flex items-center gap-2">
                                        Kategori
                                        <SortIcon columnKey="category_name" />
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Stok</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hrg Rata-rata</th>
                                <th
                                    className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:bg-muted/50 hover:text-foreground transition-colors group select-none"
                                    onClick={() => handleSort('totalValue')}
                                >
                                    <div className="flex items-center gap-2">
                                        Total Nilai
                                        <SortIcon columnKey="totalValue" />
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-background/20">
                            {filteredItems.map((item) => {
                                const isLowStock = Number(item.current_quantity) <= Number(item.min_stock);
                                const isOutOfStock = Number(item.current_quantity) <= 0;

                                return (
                                    <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground group-hover:border-primary/50 group-hover:text-primary transition-all">
                                                    <Package size={24} />
                                                </div>
                                                <div 
                                                    onClick={() => navigate(`/inventory-items/${item.id}`)}
                                                    className="cursor-pointer group/name"
                                                >
                                                    <div className="text-foreground font-bold tracking-tight group-hover/name:text-primary transition-colors text-base">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5 tracking-wider bg-muted/50 inline-block px-2 py-0.5 rounded-md border border-border/50">{item.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="uppercase tracking-wider text-[10px] shadow-sm">
                                                {categories.find((c: InventoryCategory) => c.id === item.category_id)?.name || 'Unknown'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-black font-mono tracking-tight ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {Number(item.current_quantity)}
                                                    </span>
                                                    {isLowStock && <AlertTriangle size={16} className={`${isOutOfStock ? 'text-red-500' : 'text-amber-400'} drop-shadow-md animate-pulse`} />}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-widest">Min: {item.min_stock}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-foreground font-mono text-sm tracking-tight font-medium">
                                            Rp {Number(item.average_cost).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-foreground font-mono text-base font-black tracking-tight">
                                            Rp {(Number(item.current_quantity) * Number(item.average_cost)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenHistory(item)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-indigo-500/20 rounded-xl text-indigo-400 transition-colors shadow-sm"
                                                    title="History"
                                                >
                                                    <History size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-amber-500/20 rounded-xl text-amber-400 transition-colors shadow-sm"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-xl text-red-400 transition-colors shadow-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Menampilkan {filteredItems.length} barang</span>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <Tabs defaultValue="general">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-white">
                                        {editingItem ? 'Edit Barang Inventory' : 'Tambah Barang Baru'}
                                    </h2>
                                    <TabsList className="bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                                        <TabsTrigger value="general" className="px-4 py-1.5 text-xs rounded-lg data-[state=active]:bg-cyan-600 data-[state=active]:text-white transition-all">General</TabsTrigger>
                                        {editingItem && <TabsTrigger value="visuals" className="px-4 py-1.5 text-xs rounded-lg data-[state=active]:bg-cyan-600 data-[state=active]:text-white transition-all">Visuals (4-Sisi)</TabsTrigger>}
                                    </TabsList>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <TabsContent value="general">
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="SKU / Part Number"
                                            placeholder="e.g. SP-FIL-001"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            disabled={!!editingItem}
                                        />
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-400">Kategori</label>
                                            <select
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                                                value={formData.category_id}
                                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                                disabled={!!editingItem}
                                            >
                                                <option value="">Pilih Kategori...</option>
                                                {categories.map((cat: InventoryCategory) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <Input
                                        label="Nama Barang"
                                        placeholder="e.g. Oil Filter Caterpillar 320D"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Deskripsi</label>
                                        <textarea
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[80px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Min Stock"
                                            type="number"
                                            value={formData.min_stock}
                                            onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                                        />
                                        <Input
                                            label="Max Stock"
                                            type="number"
                                            value={formData.max_stock}
                                            onChange={(e) => setFormData({ ...formData, max_stock: Number(e.target.value) })}
                                        />
                                    </div>

                                    {!editingItem && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                            <Input
                                                label="Stok Awal"
                                                type="number"
                                                value={formData.initial_quantity}
                                                onChange={(e) => setFormData({ ...formData, initial_quantity: Number(e.target.value) })}
                                            />
                                            <Input
                                                label="Harga Beli (Satuan)"
                                                type="number"
                                                value={formData.purchase_price}
                                                onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                        <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="bg-cyan-600 hover:bg-cyan-500"
                                            loading={createMutation.isPending || updateMutation.isPending}
                                        >
                                            {editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            {editingItem && (
                                <TabsContent value="visuals">
                                    <div className="p-6">
                                        <InventoryVisuals itemId={editingItem.id} />
                                    </div>
                                </TabsContent>
                            )}
                        </Tabs>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-white">Riwayat Mutasi Barang</h2>
                                {selectedItemForHistory && (
                                    <p className="text-sm text-slate-400 mt-1">Menampilkan history untuk <span className="text-cyan-400 font-medium">{selectedItemForHistory.name}</span> ({selectedItemForHistory.sku})</p>
                                )}
                            </div>
                            <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1">
                            {movementsLoading ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-4">
                                    <Loader2 size={40} className="animate-spin text-cyan-500" />
                                    <p className="text-slate-500">Memuat riwayat mutasi...</p>
                                </div>
                            ) : movements.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-900 z-10 shadow-sm">
                                        <tr className="border-b border-slate-800 bg-slate-800/50">
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                                            {!selectedItemForHistory && <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Barang</th>}
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Tipe</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Qty</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Harga</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Referensi</th>
                                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {movements.map((m: InventoryMovement) => (
                                            <tr key={m.id} className="hover:bg-slate-800/20 transition-colors group">
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    {format(new Date(m.created_at), 'dd MMM yyyy HH:mm')}
                                                </td>
                                                {!selectedItemForHistory && (
                                                    <td className="px-6 py-4">
                                                        <div className="text-white text-sm font-medium">
                                                            {items.find((i: InventoryItem) => i.id === m.item_id)?.name || 'Unknown Item'}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <Badge 
                                                        variant={
                                                            m.movement_type.startsWith('IN') ? 'success' : 
                                                            m.movement_type === 'OUT_USAGE' ? 'danger' : 'warning'
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {m.movement_type.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-bold text-right ${m.movement_type.startsWith('IN') ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {m.movement_type.startsWith('IN') ? '+' : '-'}{Number(m.quantity)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-300 text-right">
                                                    Rp {Number(m.unit_price).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {m.reference_number ? (
                                                        <div className="flex items-center gap-1.5 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                                                            <span className="font-medium">{m.reference_number}</span>
                                                            {m.reference_id && <ExternalLink size={12} />}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">
                                                    {m.notes || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 gap-4">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-600">
                                        <History size={32} />
                                    </div>
                                    <p className="text-slate-500">Belum ada riwayat mutasi.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 flex justify-end">
                            <Button onClick={() => setHistoryModalOpen(false)} variant="secondary">
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Import Modal */}
            <ImportInventoryModal
                opened={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
                    setImportModalOpen(false);
                }}
                categories={categories}
            />
        </div>
    );
}
