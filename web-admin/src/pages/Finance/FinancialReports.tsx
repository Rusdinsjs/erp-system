import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { FileBarChart, PieChart, TrendingUp, Landmark } from 'lucide-react';

export function FinancialReports() {
    const [reportType, setReportType] = useState<'balance-sheet' | 'income-statement'>('balance-sheet');

    const { data: balanceSheet, isLoading: isLoadingBS } = useQuery({
        queryKey: ['finance', 'balance-sheet'],
        queryFn: financeApi.getBalanceSheet,
        enabled: reportType === 'balance-sheet'
    });

    const { data: incomeStatement, isLoading: isLoadingIS } = useQuery({
        queryKey: ['finance', 'income-statement'],
        queryFn: financeApi.getIncomeStatement,
        enabled: reportType === 'income-statement'
    });

    const totalBalance = (reportType === 'balance-sheet' ? balanceSheet : incomeStatement)?.reduce((sum, item) => sum + item.balance, 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Laporan Keuangan</h1>
                    <p className="text-slate-400">Ringkasan kondisi dan performa keuangan</p>
                </div>
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg">
                    <button
                        onClick={() => setReportType('balance-sheet')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${reportType === 'balance-sheet'
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Landmark size={18} />
                        <span className="font-medium">Neraca</span>
                    </button>
                    <button
                        onClick={() => setReportType('income-statement')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${reportType === 'income-statement'
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <TrendingUp size={18} />
                        <span className="font-medium">Laba Rugi</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {reportType === 'balance-sheet' ? <PieChart className="text-cyan-400" /> : <FileBarChart className="text-cyan-400" />}
                                {reportType === 'balance-sheet' ? 'Neraca (Balance Sheet)' : 'Laporan Laba Rugi (Income Statement)'}
                            </h2>
                            <div className="text-xs text-slate-500 uppercase font-tracking-widest">Periode: Jan 2026</div>
                        </div>
                        <div className="p-0">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-wider">
                                        <th className="px-6 py-3 text-left">Kode</th>
                                        <th className="px-6 py-3 text-left">Akun</th>
                                        <th className="px-6 py-3 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {(isLoadingBS || isLoadingIS) ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : (reportType === 'balance-sheet' ? balanceSheet : incomeStatement)?.map((item) => (
                                        <tr key={item.account_code} className="hover:bg-slate-800/20 group transition-colors">
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs group-hover:text-cyan-400 transition-colors">
                                                {item.account_code}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 font-medium">
                                                {item.account_name}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                                {item.balance.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-800/50">
                                        <td colSpan={2} className="px-6 py-4 text-right font-bold text-white uppercase text-sm">
                                            {reportType === 'balance-sheet' ? 'Total Ekuitas / Kekayaan' : 'Laba/Rugi Bersih'}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold text-lg ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {totalBalance.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full"></div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Ikhtisar</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                                <span className="text-slate-500 text-sm">Status Keuangan</span>
                                <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                    Stabil
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                                <span className="text-slate-500 text-sm">{reportType === 'balance-sheet' ? 'Likuiditas' : 'Profitabilitas'}</span>
                                <span className="text-white text-sm font-bold">100%</span>
                            </div>
                        </div>
                        <div className="mt-8 text-xs text-slate-500 leading-relaxed italic border-l-2 border-slate-700 pl-3">
                            "{reportType === 'balance-sheet'
                                ? 'Neraca menyajikan posisi keuangan perusahaan pada saat tertentu, menunjukkan aset, kewajiban, dan ekuitas.'
                                : 'Laporan laba rugi merincikan pendapatan dan pengeluaran selama periode tertentu.'}"
                        </div>
                    </div>

                    <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-4 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 group">
                        Print Laporan
                        <div className="p-1 bg-slate-700 rounded group-hover:bg-cyan-500 transition-colors">
                            <Landmark size={16} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
