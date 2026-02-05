import React, { useState } from 'react';
import {
    Package, Search, Plus, Filter, MoreVertical,
    ArrowUpRight, ArrowDownRight, AlertTriangle,
    History, Edit2, Trash2, Box, BarChart2
} from 'lucide-react';

// Mock data for initial UI
const MOCK_ITEMS = [
    {
        id: '1',
        sku: 'SP-FIL-001',
        name: 'Oil Filter Caterpillar 320D',
        category: 'Suku Cadang Mesin',
        quantity: 45,
        unit: 'PCS',
        avgCost: 250000,
        minStock: 20,
        status: 'Instock'
    },
    {
        id: '2',
        sku: 'OL-15W40-001',
        name: 'Oil SAE 15W-40 Multigrade',
        category: 'Pelumas & Kimia',
        quantity: 12,
        unit: 'DRUM',
        avgCost: 4500000,
        minStock: 15,
        status: 'Low Stock'
    },
    {
        id: '3',
        sku: 'BN-TRK-001',
        name: 'Ban Luar 10.00-20 Gajah Tunggal',
        category: 'Ban (Tires)',
        quantity: 8,
        unit: 'PCS',
        avgCost: 3200000,
        minStock: 4,
        status: 'Instock'
    }
];

export default function InventoryItems() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = [...MOCK_ITEMS].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        // Specific handling for 'totalValue' since it's a computed field
        if (sortConfig.key === 'totalValue') {
            aValue = a.quantity * a.avgCost;
            bValue = b.quantity * b.avgCost;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const filteredItems = sortedItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <div className="w-4 h-4 opacity-0 group-hover:opacity-30"><Filter size={14} /></div>;
        return sortConfig.direction === 'asc' ? <ArrowUpRight size={14} className="text-cyan-400" /> : <ArrowDownRight size={14} className="text-cyan-400" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Barang Inventory</h1>
                    <p className="text-slate-400 mt-1">Kelola stok suku cadang dan persediaan operasional.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl transition-all border border-slate-700">
                        <History size={18} />
                        <span>Riwayat Mutasi</span>
                    </button>
                    <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-cyan-600/20">
                        <Plus size={18} />
                        <span>Tambah Barang</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Item', value: '1,280', icon: Box, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Low Stock', value: '12', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Out of Stock', value: '2', icon: Package, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { label: 'Nilai Inventory', value: 'Rp 4.2B', icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
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
                    <select className="flex-1 md:flex-none bg-slate-950 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl outline-none focus:border-slate-700 transition-all">
                        <option>Semua Kategori</option>
                        <option>Suku Cadang</option>
                        <option>Pelumas</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
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
                                    onClick={() => handleSort('category')}
                                >
                                    <div className="flex items-center gap-2">
                                        Kategori
                                        <SortIcon columnKey="category" />
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
                            {filteredItems.map((item) => (
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
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${item.status === 'Low Stock' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                                {item.status === 'Low Stock' && <AlertTriangle size={14} className="text-amber-400" />}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">Min: {item.minStock}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 text-sm">
                                        Rp {item.avgCost.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-white font-semibold text-sm">
                                        Rp {(item.quantity * item.avgCost).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Menampilkan 1-3 dari 3 barang</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-500 text-xs hover:border-slate-700 disabled:opacity-50 transition-all font-medium" disabled>Prev</button>
                        <button className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-xs hover:border-slate-700 transition-all font-medium active bg-slate-800/50">1</button>
                        <button className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-500 text-xs hover:border-slate-700 disabled:opacity-50 transition-all font-medium" disabled>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
