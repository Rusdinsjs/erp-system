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
    X,
    TrendingDown,
    Clock,
    AlertCircle,
    Check
} from 'lucide-react';
import clsx from 'clsx';

export default function Expenses() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<string[]>(['paid', 'unpaid']);
    const [filterType, setFilterType] = useState<string[]>(['OPEX', 'CAPEX']);

    // New Expense State
    const [newExpenseStatus, setNewExpenseStatus] = useState<'paid' | 'unpaid'>('paid');
    const [newExpenseType, setNewExpenseType] = useState<'OPEX' | 'CAPEX'>('OPEX');

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
            setNewExpenseStatus('paid'); // Reset
            setNewExpenseType('OPEX');
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
            status: newExpenseStatus,
            expense_type: newExpenseType
        };
        createMutation.mutate(data);
    };

    const toggleFilter = (status: string) => {
        setFilterStatus(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleTypeFilter = (type: string) => {
        setFilterType(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const filteredExpenses = expenses?.filter((expense: any) => {
        const matchesSearch =
            expense.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.expense_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus.includes(expense.status);
        const matchesType = filterType.includes(expense.expense_type || 'OPEX');

        return matchesSearch && matchesStatus && matchesType;
    });

    const totalThisMonth = filteredExpenses?.reduce((sum: number, expense: any) => sum + expense.total_amount, 0) || 0;
    const pendingCount = filteredExpenses?.filter((e: any) => e.status === 'unpaid').length || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Biaya Operasional</h1>
                    <p className="text-muted-foreground">Catat dan pantau pengeluaran operasional perusahaan</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus size={18} />
                        Catat Biaya
                    </Button>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <h2 className="text-xl font-bold text-foreground">Catat Pengeluaran</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">

                            {/* Status Toggle */}
                            <div className="bg-muted/50 p-1 rounded-lg flex">
                                <button
                                    type="button"
                                    onClick={() => setNewExpenseStatus('paid')}
                                    className={clsx(
                                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                        newExpenseStatus === 'paid'
                                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Check size={14} className={newExpenseStatus === 'paid' ? 'opacity-100' : 'opacity-0'} />
                                    Langsung Bayar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewExpenseStatus('unpaid')}
                                    className={clsx(
                                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                        newExpenseStatus === 'unpaid'
                                            ? "bg-amber-500/10 text-amber-500 shadow-sm ring-1 ring-amber-500/20"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Clock size={14} className={newExpenseStatus === 'unpaid' ? 'opacity-100' : 'opacity-0'} />
                                    Bayar Nanti (Hutang)
                                </button>
                            </div>

                            {/* Type Toggle */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipe Pengeluaran</label>
                                    <div className="flex bg-muted/50 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setNewExpenseType('OPEX')}
                                            className={clsx(
                                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                                newExpenseType === 'OPEX'
                                                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            OPEX (Operasional)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewExpenseType('CAPEX')}
                                            className={clsx(
                                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                                newExpenseType === 'CAPEX'
                                                    ? "bg-blue-500/10 text-blue-600 shadow-sm ring-1 ring-blue-500/20"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            CAPEX (Modal)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Tanggal {newExpenseStatus === 'unpaid' ? 'Tagihan' : 'Transaksi'}
                                    </label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {newExpenseStatus === 'paid' ? 'Bayar Dari (Kas/Bank)' : 'Akun Hutang'}
                                    </label>
                                    <select
                                        name="pay_from"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    >
                                        {accounts
                                            ?.filter(a => newExpenseStatus === 'paid'
                                                ? a.code.startsWith('1-11') // Assets (Cash/Bank)
                                                : a.code.startsWith('2-')   // Liabilities
                                            )
                                            .map(a => (
                                                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Penerima / Vendor</label>
                                <input
                                    name="recipient"
                                    placeholder="Contoh: Toko Bangunan Jaya, PLN, Telkom..."
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori Biaya</label>
                                <select
                                    name="category"
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none transition-all"
                                >
                                    {accounts?.filter(a => a.code.startsWith('6-')).map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominal (IDR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">Rp</span>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:border-primary outline-none transition-all font-mono text-lg font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan / Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    placeholder="Detail transaksi..."
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground hover:bg-muted"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                                >
                                    {createMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Total Pengeluaran (Filtered)</p>
                            <h3 className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(totalThisMonth)}</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Receipt className="text-primary" size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-card border-border p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Tagihan Belum Dibayar</p>
                            <h3 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
                                {pendingCount}
                                <span className="text-sm font-normal text-muted-foreground">Tagihan</span>
                            </h3>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                            <Clock className="text-amber-500" size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-card border-border p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Efisiensi Bulan Ini</p>
                            <h3 className="text-3xl font-bold text-foreground tracking-tight text-emerald-500">Good</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                            <TrendingDown className="text-emerald-500" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-card border-border p-5 sticky top-6">
                        <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Search size={14} /> Filter Status
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer group select-none">
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    filterStatus.includes('paid')
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 bg-background group-hover:border-primary"
                                )}>
                                    {filterStatus.includes('paid') && <Check size={12} strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filterStatus.includes('paid')}
                                    onChange={() => toggleFilter('paid')}
                                />
                                <span className="group-hover:text-primary transition-colors">Sudah Dibayar</span>
                            </label>

                            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer group select-none">
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    filterStatus.includes('unpaid')
                                        ? "bg-amber-500 border-amber-500 text-white"
                                        : "border-muted-foreground/30 bg-background group-hover:border-amber-500"
                                )}>
                                    {filterStatus.includes('unpaid') && <Check size={12} strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filterStatus.includes('unpaid')}
                                    onChange={() => toggleFilter('unpaid')}
                                />
                                <span className="group-hover:text-amber-500 transition-colors">Belum Dibayar (Hutang)</span>
                            </label>
                        </div>

                        <h3 className="text-xs font-bold text-muted-foreground mb-4 mt-8 uppercase tracking-wider flex items-center gap-2">
                            <Tag size={14} /> Filter Tipe
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer group select-none">
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    filterType.includes('OPEX')
                                        ? "bg-slate-500 border-slate-500 text-white"
                                        : "border-muted-foreground/30 bg-background group-hover:border-slate-500"
                                )}>
                                    {filterType.includes('OPEX') && <Check size={12} strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filterType.includes('OPEX')}
                                    onChange={() => toggleTypeFilter('OPEX')}
                                />
                                <span className="group-hover:text-slate-500 transition-colors">OPEX (Operasional)</span>
                            </label>

                            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer group select-none">
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    filterType.includes('CAPEX')
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-muted-foreground/30 bg-background group-hover:border-blue-600"
                                )}>
                                    {filterType.includes('CAPEX') && <Check size={12} strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={filterType.includes('CAPEX')}
                                    onChange={() => toggleTypeFilter('CAPEX')}
                                />
                                <span className="group-hover:text-blue-600 transition-colors">CAPEX (Modal)</span>
                            </label>
                        </div>
                    </Card>
                </div>

                {/* Main List */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="bg-card border-border px-4 py-3 flex items-center gap-3 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
                        <Search className="text-muted-foreground" size={18} />
                        <input
                            placeholder="Cari penerima, nomor referensi, atau nominal..."
                            className="bg-transparent border-none text-sm text-foreground focus:outline-none w-full placeholder:text-muted-foreground h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Card>

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="py-12 text-center animate-pulse text-muted-foreground">Memuat data...</div>
                        ) : filteredExpenses && filteredExpenses.length > 0 ? (
                            filteredExpenses.map((expense: any) => (
                                <Card key={expense.id} className="bg-card border-border hover:border-primary/50 transition-all group shadow-sm hover:shadow-md">
                                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className={clsx(
                                                "p-3 rounded-lg transition-colors shrink-0",
                                                expense.status === 'paid' ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {expense.status === 'paid' ? <Receipt size={24} /> : <Clock size={24} />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-foreground text-lg">{expense.recipient}</h4>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {expense.date}</span>
                                                    <span className="text-border">|</span>
                                                    <span className="flex items-center gap-1"><Tag size={12} /> {expense.expense_number}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className="text-right">
                                                <p className="font-bold text-foreground text-lg">{formatCurrency(expense.total_amount)}</p>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <Badge variant="outline" className={clsx(
                                                        "text-[10px] py-0.5 px-2 uppercase tracking-wide border-0",
                                                        expense.expense_type === 'CAPEX' ? "bg-blue-500/10 text-blue-600" : "bg-slate-500/10 text-slate-600"
                                                    )}>
                                                        {expense.expense_type || 'OPEX'}
                                                    </Badge>
                                                    <Badge variant={expense.status === 'paid' ? 'success' : 'warning'} className="text-[10px] py-0.5 px-2 uppercase tracking-wide">
                                                        {expense.status === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Lihat Detail">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors" title="Hapus">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3 border border-dashed border-border rounded-xl">
                                <div className="p-4 bg-muted rounded-full">
                                    <AlertCircle size={32} />
                                </div>
                                <p className="font-medium">Tidak ada data pengeluaran yang cocok</p>
                                <p className="text-sm opacity-70">Coba ubah filter atau kata kunci pencarian</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
