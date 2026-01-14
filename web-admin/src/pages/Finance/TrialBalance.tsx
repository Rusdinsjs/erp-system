import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Scale, Download } from 'lucide-react';

export function TrialBalance() {
    const { data: tb, isLoading } = useQuery({
        queryKey: ['finance', 'trial-balance'],
        queryFn: financeApi.getTrialBalance
    });

    const totalDebit = tb?.reduce((sum, item) => sum + item.debit, 0) || 0;
    const totalCredit = tb?.reduce((sum, item) => sum + item.credit, 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Neraca Saldo</h1>
                    <p className="text-slate-400">Ringkasan saldo debit dan kredit semua akun</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">
                    <Download size={18} />
                    <span>Download PDF</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 text-slate-300 text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-32">Kode</th>
                                <th className="px-6 py-4 font-semibold">Nama Akun</th>
                                <th className="px-6 py-4 font-semibold text-right">Debit</th>
                                <th className="px-6 py-4 font-semibold text-right">Kredit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : tb && tb.length > 0 ? (
                                tb.filter(item => item.debit > 0 || item.credit > 0).map((item) => (
                                    <tr key={item.account_id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-cyan-400 font-mono text-sm font-medium">
                                            {item.account_code}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {item.account_name}
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                            {item.debit > 0 ? item.debit.toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-rose-400 font-medium">
                                            {item.credit > 0 ? item.credit.toLocaleString('id-ID') : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                        Tidak ada data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-800/50">
                            <tr className="border-t-2 border-slate-700">
                                <td colSpan={2} className="px-6 py-4 font-bold text-white text-right">TOTAL</td>
                                <td className="px-6 py-4 text-right text-emerald-400 font-bold border-l border-slate-700">
                                    {totalDebit.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-right text-rose-400 font-bold border-l border-slate-700">
                                    {totalCredit.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {totalDebit !== totalCredit && !isLoading && (
                    <div className="bg-rose-950/30 border-t border-rose-500/20 p-4 flex items-center gap-3 text-rose-400 text-sm">
                        <Scale size={20} />
                        <span>Perhatian: Neraca saldo tidak seimbang. Silakan periksa kembali jurnal umum Anda.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
