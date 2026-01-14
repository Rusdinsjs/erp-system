import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Card, Button } from '../../components/ui';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, MoreVertical, Search } from 'lucide-react';

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

    const cashAccounts = accounts?.filter(a => a.code.startsWith('1-11')) || [];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kas & Bank</h1>
                    <p className="text-slate-400">Kelola saldo kas dan mutasi bank Anda</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 border-slate-700 text-slate-300">
                        Transfer Kas
                    </Button>
                    <Button className="gap-2 bg-cyan-600 hover:bg-cyan-500">
                        <Plus size={18} />
                        Tambah Akun
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
                                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400">
                                        <ArrowDownLeft size={14} /> Terima
                                    </Button>
                                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400">
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
        </div>
    );
}
