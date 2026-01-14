import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button, Badge } from '../../components/ui';
import {
    Plus,
    Search,
    Receipt,
    Calendar,
    Tag,
    Trash2,
    Eye,
    X
} from 'lucide-react';

export function Expenses() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: expenses, isLoading } = useQuery({
        queryKey: ['finance', 'expenses'],
        queryFn: financeApi.listExpenses
    });

    const { data: accounts } = useQuery({
        queryKey: ['finance', 'accounts'],
        queryFn: financeApi.listAccounts
    });

    const createMutation = useMutation({
        mutationFn: financeApi.createExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
            setIsModalOpen(false);
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
            expense_number: `EXP-${new Date().getTime()}`,
            date: formData.get('date'),
            pay_from_account_id: formData.get('pay_from'),
            recipient: formData.get('recipient'),
            items: [
                {
                    account_id: formData.get('category'),
                    description: formData.get('description'),
                    amount: parseFloat(formData.get('amount') as string)
                }
            ],
            status: 'paid'
        };
        createMutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Biaya</h1>
                    <p className="text-slate-400">Catat dan pantau pengeluaran operasional Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                        <Plus size={18} />
                        Tambah Biaya
                    </Button>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Tambah Pengeluaran Baru</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Bayar Dari</label>
                                    <select
                                        name="pay_from"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                    >
                                        {accounts?.filter(a => a.code.startsWith('1-11')).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Penerima</label>
                                <input
                                    name="recipient"
                                    placeholder="Nama vendor atau person..."
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Kategori Biaya</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                >
                                    {accounts?.filter(a => a.code.startsWith('6-')).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Jumlah (IDR)</label>
                                <input
                                    name="amount"
                                    type="number"
                                    placeholder="0"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all font-mono text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                />
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
                                    {createMutation.isPending ? 'Menyimpan...' : 'Simpan Biaya'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-slate-900/50 border-slate-800 p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Status Pembayaran</h3>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950 text-cyan-500" />
                                Dibayar
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" className="rounded border-slate-700 bg-slate-950 text-cyan-500" />
                                Belum Dibayar
                            </label>
                        </div>
                    </Card>
                </div>

                {/* Main List */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="bg-slate-900/50 border-slate-800 px-4 py-3 flex items-center gap-3">
                        <Search className="text-slate-500" size={18} />
                        <input
                            placeholder="Cari biaya..."
                            className="bg-transparent border-none text-sm text-slate-300 focus:outline-none w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Card>

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="py-12 text-center animate-pulse text-slate-500">Memuat data...</div>
                        ) : expenses && expenses.length > 0 ? (
                            expenses.map((expense: any) => (
                                <Card key={expense.id} className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all group">
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                                                <Receipt size={24} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-white">{expense.recipient}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <Calendar size={12} /> {expense.date}
                                                    <span className="text-slate-700">•</span>
                                                    <Tag size={12} /> {expense.expense_number}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-bold text-white">{formatCurrency(expense.total_amount)}</p>
                                                <Badge variant={expense.status === 'paid' ? 'success' : 'warning'} className="text-[10px] py-0">
                                                    {expense.status}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="py-12 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                                Belum ada pengeluaran yang tercatat
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


