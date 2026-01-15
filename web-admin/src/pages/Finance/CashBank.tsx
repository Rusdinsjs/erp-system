import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button } from '../../components/ui';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, MoreVertical, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export function CashBank() {
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
    const [selectedAccount, setSelectedAccount] = useState<any>(null);

    const createAccountMutation = useMutation({
        mutationFn: financeApi.createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
            setIsAddAccountModalOpen(false);
            toast.success('Akun berhasil ditambahkan');
        },
        onError: (err: any) => {
            toast.error('Gagal menambah akun: ' + err.message);
        }
    });

    const createTransferMutation = useMutation({
        mutationFn: financeApi.createCashBankTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'cash-bank-transactions'] });
            setIsTransferModalOpen(false);
            toast.success('Transfer berhasil dicatat');
        },
        onError: (err: any) => {
            toast.error('Gagal mencatat transfer: ' + err.message);
        }
    });

    const createTransactionMutation = useMutation({
        mutationFn: financeApi.createCashBankTransaction,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'cash-bank-transactions'] });
            if (variables.transaction_type === 'receive') {
                setIsReceiveModalOpen(false);
                toast.success('Penerimaan dana berhasil dicatat');
            } else {
                setIsSendModalOpen(false);
                toast.success('Pengiriman dana berhasil dicatat');
            }
        },
        onError: (err: any) => {
            toast.error('Gagal mencatat transaksi: ' + err.message);
        }
    });

    const cashAccounts = accounts?.filter(a => a.code.startsWith('1-11')) || [];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

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
            amount: parseFloat(formData.get('amount') as string),
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
            amount: parseFloat(formData.get('amount') as string),
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
            amount: parseFloat(formData.get('amount') as string),
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
                    <h1 className="text-2xl font-bold text-white">Kas & Bank</h1>
                    <p className="text-slate-400">Kelola saldo kas dan mutasi bank Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsTransferModalOpen(true)}
                        className="gap-2 border-slate-700 text-slate-300"
                    >
                        Transfer Kas
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsReceiveModalOpen(true)}
                        className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    >
                        <ArrowDownLeft size={16} />
                        Terima Dana
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsSendModalOpen(true)}
                        className="gap-2 border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    >
                        <ArrowUpRight size={16} />
                        Kirim Dana
                    </Button>
                    <Button
                        onClick={() => setIsAddAccountModalOpen(true)}
                        className="gap-2 bg-cyan-600 hover:bg-cyan-500"
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
                        <div key={i} className="h-48 bg-slate-900/50 animate-pulse rounded-2xl border border-slate-800" />
                    ))
                ) : (
                    cashAccounts.map(account => (
                        <Card key={account.id} className="bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-cyan-500/10 rounded-xl">
                                        <Wallet className="text-cyan-400" size={24} />
                                    </div>
                                    <button className="text-slate-500 hover:text-white transition-colors">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                        {account.name}
                                    </h3>
                                    <p className="text-slate-500 text-sm mb-4">{account.code}</p>
                                    <div className="pt-4 border-t border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Saldo Saat Ini</p>
                                        <p className="text-2xl font-bold text-white">
                                            {formatCurrency(0)} {/* Balance needs aggregation logic */}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400"
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
                                        className="w-full text-xs gap-1 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400"
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
            <Card className="bg-slate-900/50 border-slate-800">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Transaksi Terakhir</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            placeholder="Cari transaksi..."
                            className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Nomor</th>
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4">Tipe</th>
                                <th className="px-6 py-4 text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {txLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center animate-pulse">Memuat data...</td>
                                </tr>
                            ) : transactions && transactions.length > 0 ? (
                                transactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono">{t.date}</td>
                                        <td className="px-6 py-4 text-cyan-400 font-medium">{t.transaction_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{t.description || '-'}</span>
                                                <span className="text-xs text-slate-500">{t.contact_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${t.transaction_type === 'receive' ? 'bg-emerald-500/10 text-emerald-400' :
                                                t.transaction_type === 'send' ? 'bg-rose-500/10 text-rose-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {t.transaction_type === 'receive' ? 'Terima' :
                                                    t.transaction_type === 'send' ? 'Kirim' : 'Transfer'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold ${t.transaction_type === 'receive' ? 'text-emerald-400' : 'text-rose-400'
                                            }`}>
                                            {formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Tambah Akun Kas/Bank</h2>
                            <button onClick={() => setIsAddAccountModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Kode Akun</label>
                                <input
                                    name="code"
                                    placeholder="1-11xxx"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                                <p className="text-xs text-slate-500">Gunakan prefix 1-11 untuk Kas & Bank</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Nama Akun</label>
                                <input
                                    name="name"
                                    placeholder="Contoh: Kas Kecil, BCA IDR"
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Deskripsi</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddAccountModalOpen(false)}
                                    className="flex-1 border-slate-800 text-slate-400"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createAccountMutation.isPending}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Transfer Kas / Bank</h2>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleTransfer} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Dari Akun</label>
                                    <select
                                        name="from_account_id"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    >
                                        <option value="">Pilih Sumber</option>
                                        {cashAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Ke Akun</label>
                                    <select
                                        name="to_account_id"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
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
                                    <label className="text-sm font-medium text-slate-400">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Jumlah Transfer</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="flex-1 border-slate-800 text-slate-400"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransferMutation.isPending}
                                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-emerald-400">Terima Dana</h2>
                            <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleReceive} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Simpan ke Akun</label>
                                <select
                                    name="account_id"
                                    required
                                    defaultValue={selectedAccount?.id || ''}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                >
                                    <option value="">Pilih Akun</option>
                                    {cashAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Jumlah Terima</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Diterima Dari</label>
                                <input
                                    name="contact_name"
                                    placeholder="Nama pengirim / pelanggan / sumber dana"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsReceiveModalOpen(false)}
                                    className="flex-1 border-slate-800 text-slate-400"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-rose-400">Kirim Dana</h2>
                            <button onClick={() => setIsSendModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSend} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Ambil dari Akun</label>
                                <select
                                    name="account_id"
                                    required
                                    defaultValue={selectedAccount?.id || ''}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                >
                                    <option value="">Pilih Akun</option>
                                    {cashAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Tanggal</label>
                                    <input
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Jumlah Kirim</label>
                                    <input
                                        name="amount"
                                        type="number"
                                        placeholder="0"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-rose-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Dikirim Kepada</label>
                                <input
                                    name="contact_name"
                                    placeholder="Nama penerima / vendor / karyawan"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Keterangan</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsSendModalOpen(false)}
                                    className="flex-1 border-slate-800 text-slate-400"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createTransactionMutation.isPending}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white"
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
