import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FolderTree, Plus, Search, Layers,
    Link2, AlertCircle, Edit2, Trash2,
    Briefcase, Activity, Loader2, X,
    LayoutGrid, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import type { InventoryCategory, CreateInventoryCategoryRequest } from '../../api/inventory';
import { financeApi } from '../../api/finance';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function InventoryCategories() {
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [showCoaStructure, setShowCoaStructure] = useState(false); // New state for COA modal
    const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // View toggle
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = viewMode === 'grid' ? 12 : 20;

    const [formData, setFormData] = useState<Partial<CreateInventoryCategoryRequest>>({
        code: '',
        name: '',
        description: '',
        inventory_account_id: '',
        expense_account_id: ''
    });

    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Queries
    const { data: categories = [], isLoading: catsLoading } = useQuery({
        queryKey: ['inventory-categories'],
        queryFn: inventoryApi.listCategories
    });

    const { data: accounts = [], isLoading: accountsLoading } = useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: financeApi.listAccounts
    });

    // Validating queries loaded
    const isLoading = catsLoading || accountsLoading;

    // Derived State
    const filteredCategories = useMemo(() => {
        if (!Array.isArray(categories)) return [];
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cat.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [categories, searchTerm]);

    // Reset page when search changes
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCategories, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

    const assetAccounts = useMemo(() => accounts.filter(a => a.account_type === 'asset'), [accounts]);
    const expenseAccounts = useMemo(() => accounts.filter(a => a.account_type === 'expense'), [accounts]);

    const getAccountName = (id: string | null) => {
        if (!id) return 'Not Linked';
        const acc = accounts.find(a => a.id === id);
        return acc ? `${acc.code} - ${acc.name}` : 'Unknown Account';
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: inventoryApi.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            setModalOpen(false);
            resetForm();
            success('Category created successfully', 'Success');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to create category', 'Error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: string, payload: any }) => inventoryApi.updateCategory(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            setModalOpen(false);
            resetForm();
            success('Category updated successfully', 'Success');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to update category', 'Error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: inventoryApi.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
            success('Category deleted successfully', 'Success');
        },
        onError: (err: any) => {
            showError(err.response?.data?.message || 'Failed to delete category', 'Error');
        }
    });

    // Handlers
    const handleOpenCreate = () => {
        setEditingCategory(null);
        resetForm();
        setModalOpen(true);
    };

    const handleOpenEdit = (cat: InventoryCategory) => {
        setEditingCategory(cat);
        setFormData({
            code: cat.code,
            name: cat.name,
            description: cat.description || '',
            inventory_account_id: cat.inventory_account_id || '',
            expense_account_id: cat.expense_account_id || ''
        });
        setModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this category?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.code || !formData.name) {
            showError('Code and Name are required', 'Validation Error');
            return;
        }

        const payload = {
            code: formData.code,
            name: formData.name,
            description: formData.description,
            inventory_account_id: formData.inventory_account_id || undefined, // Send undefined if empty string
            expense_account_id: formData.expense_account_id || undefined
        };

        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, payload });
        } else {
            createMutation.mutate(payload as CreateInventoryCategoryRequest);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            inventory_account_id: '',
            expense_account_id: ''
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Kategori Inventori</h1>
                    <p className="text-slate-400 mt-1">Kelola pengelompokan barang dan pemetaan akun akuntansi.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCoaStructure(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all border border-slate-700"
                    >
                        <Layers size={18} />
                        <span>Struktur COA</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-cyan-600/20"
                    >
                        <Plus size={18} />
                        <span>Tambah Kategori</span>
                    </button>
                </div>
            </div>

            {/* Alert / Warning about Mapping */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-amber-400 font-semibold text-sm">Penting: Pemetaan Akun</h4>
                    <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
                        Setiap kategori inventori harus dipetakan ke satu Akun Persediaan (Asset) dan satu Akun Biaya (Expense).
                        Ini memastikan sinkronisasi otomatis antara nilai stok fisik dan saldo di laporan keuangan.
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            {/* Filters & Search */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Cari kategori..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm text-slate-400 font-medium">
                    Menampilkan <span className="text-white">{paginatedCategories.length}</span> dari <span className="text-white">{filteredCategories.length}</span> kategori
                </div>
            </div>

            {/* Categories Content */}
            {filteredCategories.length === 0 ? (
                <div className="py-20 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-800/50 border-dashed">
                    <div className="mb-4 flex justify-center">
                        <FolderTree size={48} className="text-slate-700" />
                    </div>
                    <p className="text-lg font-medium text-slate-400">Tidak ada kategori ditemukan</p>
                    <p className="text-sm mt-1">Coba kata kunci lain atau buat kategori baru.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {paginatedCategories.map((cat) => (
                        <div key={cat.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group relative overflow-hidden">
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />

                            <div className="relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700/50 group-hover:border-cyan-500/30 transition-all shadow-xl">
                                            <FolderTree size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors tracking-tight">{cat.name}</h3>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5 tracking-wider uppercase">{cat.code}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenEdit(cat)}
                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-400 line-clamp-2 mb-6 min-h-[40px] leading-relaxed">
                                    {cat.description || 'No description provided.'}
                                </p>

                                <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                    <div className="flex items-center justify-between group/acct">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Briefcase size={14} className="text-slate-600" />
                                            <span>Akun Kredit (Persediaan)</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cat.inventory_account_id ? 'text-cyan-400 bg-cyan-400/5 border-cyan-400/10' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                            <Link2 size={12} />
                                            <span>{getAccountName(cat.inventory_account_id)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between group/acct">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Activity size={14} className="text-slate-600" />
                                            <span>Akun Debit OPEX (Biaya)</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${cat.expense_account_id ? 'text-rose-400 bg-rose-400/5 border-rose-400/10' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                            <Link2 size={12} />
                                            <span>{getAccountName(cat.expense_account_id)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* LIST VIEW (TABLE) */
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4">Deskripsi</th>
                                <th className="px-6 py-4">Akun Kredit (Assets)</th>
                                <th className="px-6 py-4">Akun Debit (OPEX)</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {paginatedCategories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700 shrink-0">
                                                <FolderTree size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{cat.name}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{cat.code}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-[200px] truncate text-slate-400" title={cat.description || ''}>
                                            {cat.description || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`text-xs px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${cat.inventory_account_id ? 'border-cyan-500/10 bg-cyan-500/5 text-cyan-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                                            {cat.inventory_account_id && <Link2 size={10} />}
                                            {getAccountName(cat.inventory_account_id).split(' - ')[0]}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`text-xs px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${cat.expense_account_id ? 'border-rose-500/10 bg-rose-500/5 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>
                                            {cat.expense_account_id && <Link2 size={10} />}
                                            {getAccountName(cat.expense_account_id).split(' - ')[0]}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenEdit(cat)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {filteredCategories.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                    <div className="text-sm text-slate-400">
                        Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{Math.max(1, totalPages)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p = i + 1;
                                if (currentPage > 3 && totalPages > 5) p = currentPage - 2 + i;
                                if (p > totalPages) return null;

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${currentPage === p
                                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 scale-105'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">
                                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Kode Kategori"
                                        placeholder="e.g. INV-EL"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="bg-black/20 border-white/5"
                                        disabled={!!editingCategory} // Usually code is unique/immutable
                                    />
                                    <Input
                                        label="Nama Kategori"
                                        placeholder="e.g. Elektronik"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-black/20 border-white/5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Deskripsi</label>
                                    <textarea
                                        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[80px]"
                                        placeholder="Deskripsi singkat kategori..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="border-t border-white/5 pt-4 space-y-4">
                                    <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                                        <Link2 size={16} /> Pemetaan Akun (Mapping)
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                            Akun Kredit (Persediaan)
                                        </label>
                                        <select
                                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                                            value={formData.inventory_account_id}
                                            onChange={(e) => setFormData({ ...formData, inventory_account_id: e.target.value })}
                                        >
                                            <option value="">Pilih Akun Aset...</option>
                                            {assetAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Akun Kredit saat barang keluar.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                            Akun Debit OPEX (Biaya)
                                        </label>
                                        <select
                                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                                            value={formData.expense_account_id}
                                            onChange={(e) => setFormData({ ...formData, expense_account_id: e.target.value })}
                                        >
                                            <option value="">Pilih Akun Beban...</option>
                                            {expenseAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.code} - {acc.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Akun Debit saat barang dipakai untuk OPEX.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="bg-cyan-600 hover:bg-cyan-500"
                                    loading={createMutation.isPending || updateMutation.isPending}
                                >
                                    Simpan Kategori
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* COA Structure Audit Modal */}
            {showCoaStructure && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Layers className="text-cyan-400" />
                                    Struktur Mapping COA
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Audit pemetaan akun Kredit dan Debit untuk setiap kategori.</p>
                            </div>
                            <button onClick={() => setShowCoaStructure(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-0 overflow-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 font-medium sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 border-b border-slate-800">Kategori</th>
                                        <th className="px-6 py-4 border-b border-slate-800">
                                            <span className="flex items-center gap-2 text-cyan-400">
                                                <Briefcase size={14} /> Akun Kredit (Persediaan)
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-800">
                                            <span className="flex items-center gap-2 text-rose-400">
                                                <Activity size={14} /> Akun Debit OPEX (Biaya)
                                            </span>
                                        </th>
                                        <th className="px-6 py-4 border-b border-slate-800 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {categories.map((cat: InventoryCategory) => {
                                        const isComplete = cat.inventory_account_id && cat.expense_account_id;
                                        return (
                                            <tr key={cat.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white">{cat.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{cat.code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border ${cat.inventory_account_id ? 'bg-cyan-900/20 border-cyan-500/20 text-cyan-300' : 'bg-red-900/20 border-red-500/20 text-red-300'}`}>
                                                        <span className="font-mono text-xs">{getAccountName(cat.inventory_account_id).split(' - ')[0]}</span>
                                                        <span className="text-xs truncate max-w-[150px]">{getAccountName(cat.inventory_account_id).split(' - ')[1] || 'Not Set'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border ${cat.expense_account_id ? 'bg-rose-900/20 border-rose-500/20 text-rose-300' : 'bg-red-900/20 border-red-500/20 text-red-300'}`}>
                                                        <span className="font-mono text-xs">{getAccountName(cat.expense_account_id).split(' - ')[0]}</span>
                                                        <span className="text-xs truncate max-w-[150px]">{getAccountName(cat.expense_account_id).split(' - ')[1] || 'Not Set'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isComplete ? (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400">
                                                            <Link2 size={12} />
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
                                                            <AlertCircle size={12} />
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-end">
                            <Button onClick={() => setShowCoaStructure(false)}>Tutup</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
