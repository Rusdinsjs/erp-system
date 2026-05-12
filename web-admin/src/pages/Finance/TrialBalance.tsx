import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Scale, Download } from 'lucide-react';

export default function TrialBalance() {
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
                    <h1 className="text-2xl font-bold text-foreground">Neraca Saldo</h1>
                    <p className="text-muted-foreground">Ringkasan saldo debit dan kredit semua akun</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors border border-border">
                    <Download size={18} />
                    <span>Download PDF</span>
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-32">Kode</th>
                                <th className="px-6 py-4 font-semibold">Nama Akun</th>
                                <th className="px-6 py-4 font-semibold text-right">Debit</th>
                                <th className="px-6 py-4 font-semibold text-right">Kredit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : tb && tb.length > 0 ? (
                                tb.filter(item => item.debit > 0 || item.credit > 0).map((item) => (
                                    <tr key={item.account_id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 text-primary font-mono text-sm font-medium">
                                            {item.account_code}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {item.account_name}
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-500 font-medium">
                                            {item.debit > 0 ? item.debit.toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-rose-500 font-medium">
                                            {item.credit > 0 ? item.credit.toLocaleString('id-ID') : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                                        Tidak ada data.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-muted/50">
                            <tr className="border-t-2 border-border">
                                <td colSpan={2} className="px-6 py-4 font-bold text-foreground text-right">TOTAL</td>
                                <td className="px-6 py-4 text-right text-emerald-500 font-bold border-l border-border">
                                    {totalDebit.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-right text-rose-500 font-bold border-l border-border">
                                    {totalCredit.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {totalDebit !== totalCredit && !isLoading && (
                    <div className="bg-destructive/10 border-t border-destructive/20 p-4 flex items-center gap-3 text-destructive text-sm">
                        <Scale size={20} />
                        <span>Perhatian: Neraca saldo tidak seimbang. Silakan periksa kembali jurnal umum Anda.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
