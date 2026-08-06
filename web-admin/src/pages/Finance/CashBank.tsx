import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type ChartOfAccount } from '../../api/finance';
import { Card, Button } from '../../components/ui';
import { formatCurrencyIDR } from '../../utils/decimal';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, MoreVertical, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CashBank() {
    // In a real app, we'd filter COA for 'Cash & Bank' accounts
    const { data: accounts, isLoading: accountsLoading } = useQuery({
        queryKey: ['finance', 'accounts'],
        queryFn: financeApi.listAccounts
    });

    const { data: transactions, isLoading: txLoading } = useQuery({
        queryKey: ['finance', 'cash-bank-transactions'],
        queryFn: financeApi.listCashBankTransactions
    });

    const queryClient = useQueryClient();
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

    const createAccountMutation = useMutation({
        mutationFn: financeApi.createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
            setIsAddAccountModalOpen(false);
            toast.success('Akun berhasil ditambahkan');
        },
        onError: (err: unknown) => {
            toast.error('Gagal menambah akun: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    });

    const createTransferMutation = useMutation({
        mutationFn: financeApi.createCashBankTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'cash-bank-transactions'] });
            setIsTransferModalOpen(false);
            toast.success('Transfer berhasil dicatat');
        },
        onError: (err: unknown) => {
            toast.error('Gagal mencatat transfer: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    });

    const createTransactionMutation = useMutation({
        mutationFn: financeApi.createCashBankTransaction,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'cash-bank-transactions'] });
            if (variables.transaction_type === 'receive') {
                setIsReceiveModalOpen(false);
                toast.success('Penerimaan dana berhasil dicatat');
            } else {
                setIsSendModalOpen(false);
                toast.success('Pengiriman dana berhasil dicatat');
            }
        },
        onError: (err: unknown) => {
            toast.error('Gagal mencatat transaksi: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    });

    const cashAccounts = accounts?.filter(a => a.code.startsWith('1-11')) || [];

    const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createAccountMutation.mutate({
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            account_type: 'asset',
            normal_balance: 'debit',
            description: formData.get('description') as string,
            currency: 'IDR',
            parent_id: '',
        });
    };

    const handleTransfer = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createTransferMutation.mutate({
            date: formData.get('date') as string,
            amount: formData.get('amount') as string,
            from_account_id: formData.get('from_account_id') as string,
            to_account_id: formData.get('to_account_id') as string,
            description: formData.get('description') as string,
            transaction_type: 'transfer',
            account_id: formData.get('from_account_id') as string,
        });
    };

    const handleReceive = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createTransactionMutation.mutate({
            date: formData.get('date') as string,
            amount: formData.get('amount') as string,
            account_id: formData.get('account_id') as string,
            contact_name: formData.get('contact_name') as string,
            description: formData.get('description') as string,
            transaction_type: 'receive',
        });
    };

    const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createTransactionMutation.mutate({
            date: formData.get('date') as string,
            amount: formData.get('amount') as string,
            account_id: formData.get('account_id') as string,
            contact_name: formData.get('contact_name') as string,
            description: formData.get('description') as string,
            transaction_type: 'send',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Kas & Bank</h1>
                    <p className="text-muted-foreground">Kelola saldo kas dan mutasi bank Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsTransferModalOpen(true)}
                        className="gap-2 border-border text-muted-foreground"
                    >
                        Transfer Kas
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsReceiveModalOpen(true)}
                        className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    >
                        <ArrowDownLeft size={16} />
                        Terima Dana
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsSendModalOpen(true)}
                        className="gap-2 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                        <ArrowUpRight size={16} />
                        Kirim Dana
                    </Button>
                    <Button
                        onClick={() => setIsAddAccountModalOpen(true)}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <Plus size={18} />
                        Tambah Kas & Bank
                    </Button>
                </div>
            </div>

            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accountsLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-card animate-pulse rounded-2xl border border-border" />
                    ))
                ) : (
                    cashAccounts.map(account => (
                        <Card key={account.id} className="bg-card border-border hover:border-primary/50 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <Wallet className="text-primary" size={24} />
                                    </div>
                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                        {account.name}
                                    </h3>
                                    <p className="text-muted-foreground text-sm mb-4">{account.code}</p>
                                    <div className="pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo Saat Ini</p>
                                        <p className="text-2xl font-bold text-foreground">
                                            {formatCurrencyIDR('0.0000')} {/* Balance needs aggregation logic */}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500"
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setIsReceiveModalOpen(true);
                                        }}
                                    >
                                        <ArrowDownLeft size={14} /> Terima
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs gap-1 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setIsSendModalOpen(true);
                                        }}
                                    >
                                        <ArrowUpRight size={14} /> Kirim
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Recent Transactions Table */}
            <Card className="bg-card border-border">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">Transaksi Terakhir</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            placeholder="Cari transaksi..."
                            className="bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Nomor</th>
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4">Tipe</th>
                                <th className="px-6 py-4 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {txLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : transactions && transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-mono">{t.date}</td>
                                        <td className="px-6 py-4 text-primary font-medium">{t.transaction_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{t.description || '-'}</span>
                                                <span className="text-xs text-muted-foreground">{t.contact_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${t.transaction_type === 'receive' ? 'bg-emerald-500/10 text-emerald-500' :
                                                t.transaction_type === 'send' ? 'bg-destructive/10 text-destructive' :
                                                    'bg-primary/10 text-primary'
                                                }`}>
                                                {t.transaction_type === 'receive' ? 'Terima' :
                                                    t.transaction_type === 'send' ? 'Kirim' : 'Transfer'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold ${t.transaction_type === 'receive' ? 'text-emerald-500' : 'text-destructive'
                                            }`}>
                                            {formatCurrencyIDR(t.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Belum ada transaksi di periode ini
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            {/* Modal Tambah Akun */}
            {isAddAccountModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-md bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">Tambah Akun Kas/Bank</h2>
                            <button onClick={() => setIsAddAccountModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Kode Akun</label>
                                <input
                                    name="code"
                                    placeholder="1-11xxx"
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                                <p className="text-xs text-muted-foreground">Gunakan prefix 1-11 untuk Kas & Bank</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Nama Akun</label>
                                <input
                                    name="name"
                                    placeholder="Contoh: Kas Kecil, BCA IDR"
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddAccountModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createAccountMutation.isPending}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {createAccountMutation.isPending ? 'Menyimpan...' : 'Simpan Akun'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal Transfer */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">Transfer Kas / Bank</h2>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleTransfer} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Dari Akun</label>
                                    <select
                                        name="from_account_id"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Pilih Sumber</option>
                                        {cashAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Ke Akun</label>
                                    <select
                                        name="to_account_id"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Pilih Tujuan</option>
                                        {cashAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
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
                                    <label className="text-sm font-medium text-muted-foreground">Jumlah Transfer</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransferMutation.isPending}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {createTransferMutation.isPending ? 'Memproses...' : 'Transfer Sekarang'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal Terima Dana */}
            {isReceiveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-emerald-500">Terima Dana</h2>
                            <button onClick={() => setIsReceiveModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleReceive} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Simpan ke Akun</label>
                                <select
                                    name="account_id"
                                    required
                                    defaultValue={selectedAccount?.id || ''}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                >
                                    <option value="">Pilih Akun</option>
                                    {cashAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                    ))}
                                </select>
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
                                    <label className="text-sm font-medium text-muted-foreground">Jumlah Terima</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Diterima Dari</label>
                                <input
                                    name="contact_name"
                                    placeholder="Nama pengirim / pelanggan / sumber dana"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsReceiveModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransactionMutation.isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                    {createTransactionMutation.isPending ? 'Memproses...' : 'Terima Dana'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal Kirim Dana */}
            {isSendModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-card border-border shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-destructive">Kirim Dana</h2>
                            <button onClick={() => setIsSendModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSend} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Ambil dari Akun</label>
                                <select
                                    name="account_id"
                                    required
                                    defaultValue={selectedAccount?.id || ''}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                >
                                    <option value="">Pilih Akun</option>
                                    {cashAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                    ))}
                                </select>
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
                                    <label className="text-sm font-medium text-muted-foreground">Jumlah Kirim</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-destructive outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Dikirim Kepada</label>
                                <input
                                    name="contact_name"
                                    placeholder="Nama penerima / vendor / karyawan"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsSendModalOpen(false)}
                                    className="flex-1 border-border text-muted-foreground"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransactionMutation.isPending}
                                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                    {createTransactionMutation.isPending ? 'Memproses...' : 'Kirim Dana'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
