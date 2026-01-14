import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Search, Calendar, ArrowLeftRight } from 'lucide-react';
import dayjs from 'dayjs';

export function GeneralLedger() {
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

    const { data: accounts } = useQuery({
        queryKey: ['finance', 'accounts'],
        queryFn: financeApi.listAccounts
    });

    const { data: ledger, isLoading } = useQuery({
        queryKey: ['finance', 'ledger', selectedAccountId, startDate, endDate],
        queryFn: () => financeApi.getGeneralLedger(selectedAccountId, startDate, endDate),
        enabled: !!selectedAccountId
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Buku Besar (General Ledger)</h1>
                    <p className="text-slate-400">Riwayat transaksi detail per akun</p>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-400 mb-1">Pilih Akun</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"
                            >
                                <option value="">-- Pilih Akun --</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Mulai</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Sampai</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {selectedAccountId ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/50 text-slate-300 text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tanggal</th>
                                    <th className="px-6 py-4 font-semibold">No. Transaksi</th>
                                    <th className="px-6 py-4 font-semibold">Keterangan</th>
                                    <th className="px-6 py-4 font-semibold text-right">Debit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Kredit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : ledger && ledger.length > 0 ? (
                                    ledger.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                                {dayjs(entry.date).format('DD MMM YYYY')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-cyan-400 font-mono text-sm font-medium">
                                                    {entry.transaction_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-200 text-sm">{entry.header_description}</div>
                                                {entry.line_description && (
                                                    <div className="text-slate-500 text-xs mt-0.5 italic">{entry.line_description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                                {entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-rose-400 font-medium">
                                                {entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-white font-semibold">
                                                {entry.balance.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                            Tidak ada transaksi untuk periode ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-20 flex flex-col items-center justify-center text-center">
                    <ArrowLeftRight className="text-slate-700 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-slate-400">Pilih akun terlebih dahulu</h3>
                    <p className="text-slate-500 max-w-sm mt-2">
                        Pilih salah satu akun dari Chart of Accounts untuk melihat detail riwayat transaksi.
                    </p>
                </div>
            )}
        </div>
    );
}
