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
                    <h1 className="text-2xl font-bold text-foreground">Buku Besar (General Ledger)</h1>
                    <p className="text-muted-foreground">Riwayat transaksi detail per akun</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Pilih Akun</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none appearance-none"
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
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Mulai</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Sampai</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-background border border-input rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {selectedAccountId ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tanggal</th>
                                    <th className="px-6 py-4 font-semibold">No. Transaksi</th>
                                    <th className="px-6 py-4 font-semibold">Keterangan</th>
                                    <th className="px-6 py-4 font-semibold text-right">Debit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Kredit</th>
                                    <th className="px-6 py-4 font-semibold text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : ledger && ledger.length > 0 ? (
                                    ledger.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                                {dayjs(entry.date).format('DD MMM YYYY')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-primary font-mono text-sm font-medium">
                                                    {entry.transaction_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-foreground text-sm">{entry.header_description}</div>
                                                {entry.line_description && (
                                                    <div className="text-muted-foreground text-xs mt-0.5 italic">{entry.line_description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-emerald-500 font-medium">
                                                {entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-rose-500 font-medium">
                                                {entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-foreground font-semibold">
                                                {entry.balance.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                            Tidak ada transaksi untuk periode ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/30 border border-dashed border-border rounded-xl p-20 flex flex-col items-center justify-center text-center">
                    <ArrowLeftRight className="text-muted-foreground mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-muted-foreground">Pilih akun terlebih dahulu</h3>
                    <p className="text-muted-foreground max-w-sm mt-2">
                        Pilih salah satu akun dari Chart of Accounts untuk melihat detail riwayat transaksi.
                    </p>
                </div>
            )}
        </div>
    );
}
