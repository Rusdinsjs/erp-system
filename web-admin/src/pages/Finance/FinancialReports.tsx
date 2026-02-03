import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { FileBarChart, PieChart, TrendingUp, Landmark } from 'lucide-react';

export default function FinancialReports() {
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
                    <h1 className="text-2xl font-bold text-foreground">Laporan Keuangan</h1>
                    <p className="text-muted-foreground">Ringkasan kondisi dan performa keuangan</p>
                </div>
                <div className="flex bg-muted border border-border p-1 rounded-xl shadow-sm">
                    <button
                        onClick={() => setReportType('balance-sheet')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${reportType === 'balance-sheet'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        <Landmark size={18} />
                        <span className="font-medium">Neraca</span>
                    </button>
                    <button
                        onClick={() => setReportType('income-statement')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${reportType === 'income-statement'
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                    >
                        <TrendingUp size={18} />
                        <span className="font-medium">Laba Rugi</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                {reportType === 'balance-sheet' ? <PieChart className="text-primary" /> : <FileBarChart className="text-primary" />}
                                {reportType === 'balance-sheet' ? 'Neraca (Balance Sheet)' : 'Laporan Laba Rugi (Income Statement)'}
                            </h2>
                            <div className="text-xs text-muted-foreground uppercase font-tracking-widest">Periode: Jan 2026</div>
                        </div>
                        <div className="p-0">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                                        <th className="px-6 py-3 text-left">Kode</th>
                                        <th className="px-6 py-3 text-left">Akun</th>
                                        <th className="px-6 py-3 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(isLoadingBS || isLoadingIS) ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : (reportType === 'balance-sheet' ? balanceSheet : incomeStatement)?.map((item) => (
                                        <tr key={item.account_code} className="hover:bg-muted/50 group transition-colors">
                                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs group-hover:text-primary transition-colors">
                                                {item.account_code}
                                            </td>
                                            <td className="px-6 py-4 text-foreground font-medium">
                                                {item.account_name}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-semibold ${item.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                                {item.balance.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/50">
                                        <td colSpan={2} className="px-6 py-4 text-right font-bold text-foreground uppercase text-sm">
                                            {reportType === 'balance-sheet' ? 'Total Ekuitas / Kekayaan' : 'Laba/Rugi Bersih'}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold text-lg ${totalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                            {totalBalance.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full"></div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Ikhtisar</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-border pb-3">
                                <span className="text-muted-foreground text-sm">Status Keuangan</span>
                                <span className="text-primary text-sm font-bold flex items-center gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    Stabil
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-b border-border pb-3">
                                <span className="text-muted-foreground text-sm">{reportType === 'balance-sheet' ? 'Likuiditas' : 'Profitabilitas'}</span>
                                <span className="text-foreground text-sm font-bold">100%</span>
                            </div>
                        </div>
                        <div className="mt-8 text-xs text-muted-foreground leading-relaxed italic border-l-2 border-border pl-3">
                            "{reportType === 'balance-sheet'
                                ? 'Neraca menyajikan posisi keuangan perusahaan pada saat tertentu, menunjukkan aset, kewajiban, dan ekuitas.'
                                : 'Laporan laba rugi merincikan pendapatan dan pengeluaran selama periode tertentu.'}"
                        </div>
                    </div>

                    <button className="w-full bg-card hover:bg-muted border border-border py-4 rounded-2xl text-foreground font-bold transition-all flex items-center justify-center gap-2 group shadow-sm">
                        Print Laporan
                        <div className="p-1 bg-muted rounded group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Landmark size={16} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
