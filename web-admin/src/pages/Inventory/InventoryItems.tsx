import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package, Search, Plus, Filter, MoreVertical,
    ArrowUpRight, ArrowDownRight, AlertTriangle,
    History, Edit2, Trash2, Box, BarChart2, Loader2, X,
    ExternalLink
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import type { InventoryItem, InventoryCategory, InventoryMovement } from '../../api/inventory';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { format } from 'date-fns';

export default function InventoryItems() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);

    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Barang Inventory</h1>
                    <p className="text-slate-400 mt-1">Kelola stok suku cadang dan persediaan operasional.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleOpenHistory()}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all border border-slate-700"
                    >
                        <History size={18} />
                        <span>Riwayat Mutasi</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-cyan-600/20"
                    >
                        <Plus size={18} />
                        <span>Tambah Barang</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Item', value: stats.total.toLocaleString(), icon: Box, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Low Stock', value: stats.low.toString(), icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Out of Stock', value: stats.out.toString(), icon: Package, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { label: 'Nilai Inventory', value: `Rp ${stats.value.toLocaleString()}`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan SKU atau nama barang..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl hover:text-slate-200 hover:border-slate-700 transition-all">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                    <select
                        className="flex-1 md:flex-none bg-slate-950 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl outline-none focus:border-slate-700 transition-all"
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/20">
                                <th
                                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-800/50 hover:text-cyan-400 transition-colors group select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-2">
                                        Barang
                                        <SortIcon columnKey="name" />
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-800/50 hover:text-cyan-400 transition-colors group select-none"
                                    onClick={() => handleSort('category_name')}
                                >
                                    <div className="flex items-center gap-2">
                                        Kategori
                                        <SortIcon columnKey="category_name" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Stok</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Hrg Rata-rata</th>
                                <th
                                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-800/50 hover:text-cyan-400 transition-colors group select-none"
                                    onClick={() => handleSort('totalValue')}
                                >
                                    <div className="flex items-center gap-2">
                                        Total Nilai
                                        <SortIcon columnKey="totalValue" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredItems.map((item) => {
                                const isLowStock = Number(item.current_quantity) <= Number(item.min_stock);
                                const isOutOfStock = Number(item.current_quantity) <= 0;

                                return (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700/50 group-hover:border-cyan-500/30 transition-colors">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{item.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs border border-slate-700/50 uppercase tracking-wide">
                                                {categories.find((c: InventoryCategory) => c.id === item.category_id)?.name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {Number(item.current_quantity)}
                                                    </span>
                                                    {isLowStock && <AlertTriangle size={14} className={isOutOfStock ? 'text-red-500' : 'text-amber-400'} />}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">Min: {item.min_stock}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 text-sm">
                                            Rp {Number(item.average_cost).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-white font-semibold text-sm">
                                            Rp {(Number(item.current_quantity) * Number(item.average_cost)).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenHistory(item)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    title="History"
                                                >
                                                    <History size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                    <MoreVertical size={16} />
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
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 text-sm">Menampilkan {filteredItems.length} barang</span>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">
                                {editingItem ? 'Edit Barang Inventory' : 'Tambah Barang Baru'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

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
        </div>
    );
}
