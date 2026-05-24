import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api/finance';
import { Search, Calendar, ArrowLeftRight, BookOpen } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableSkeleton } from '../../components/ui';
import dayjs from 'dayjs';

export default function GeneralLedger() {
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
        <div className="p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <BookOpen className="text-amber-500" size={32} />
                        General Ledger
                    </h1>
                    <p className="text-muted-foreground mt-2">View detailed transaction history by account</p>
                </div>
            </div>

            <div className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-6 mb-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/50 to-orange-500/50" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Select Account</label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all hover:border-primary/30"
                            >
                                <option value="">-- Choose Account --</option>
                                {accounts?.map(acc => (
                                    <option key={acc.id} value={acc.id} className="bg-background">
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Start Date</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all hover:border-primary/30 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">End Date</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-2xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all hover:border-primary/30 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {selectedAccountId ? (
                <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />
                    
                    <div className="overflow-x-auto relative z-10">
                        <Table className="border-none rounded-none shadow-none">
                            <TableHead>
                                <TableRow className="bg-card/90 backdrop-blur-md border-b border-border">
                                    <TableTh>Date</TableTh>
                                    <TableTh>Transaction Ref</TableTh>
                                    <TableTh>Description</TableTh>
                                    <TableTh align="right">Debit</TableTh>
                                    <TableTh align="right">Credit</TableTh>
                                    <TableTh align="right">Balance</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableTd colSpan={6} className="p-0">
                                            <div className="p-4"><TableSkeleton rows={5} cols={6} /></div>
                                        </TableTd>
                                    </TableRow>
                                ) : ledger && ledger.length > 0 ? (
                                    ledger.map((entry, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/40 transition-colors group">
                                            <TableTd className="text-muted-foreground font-medium">
                                                {dayjs(entry.date).format('DD MMM YYYY')}
                                            </TableTd>
                                            <TableTd>
                                                <span className="text-primary font-mono font-bold tracking-tight">
                                                    {entry.transaction_number}
                                                </span>
                                            </TableTd>
                                            <TableTd>
                                                <div className="text-foreground font-medium">{entry.header_description}</div>
                                                {entry.line_description && (
                                                    <div className="text-muted-foreground text-xs mt-1 bg-muted/50 inline-block px-2 py-0.5 rounded-md italic">
                                                        {entry.line_description}
                                                    </div>
                                                )}
                                            </TableTd>
                                            <TableTd align="right" className="font-mono font-bold text-emerald-500">
                                                {entry.debit > 0 ? entry.debit.toLocaleString('id-ID') : '-'}
                                            </TableTd>
                                            <TableTd align="right" className="font-mono font-bold text-rose-500">
                                                {entry.credit > 0 ? entry.credit.toLocaleString('id-ID') : '-'}
                                            </TableTd>
                                            <TableTd align="right">
                                                <span className="font-mono font-bold bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
                                                    {entry.balance.toLocaleString('id-ID')}
                                                </span>
                                            </TableTd>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableTd colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4 border border-dashed border-border">
                                                    <BookOpen size={24} className="opacity-50" />
                                                </div>
                                                <span className="font-bold uppercase tracking-widest text-xs">No Records Found</span>
                                                <p className="mt-2 text-sm opacity-70">No transactions recorded for the selected account in this period.</p>
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <div className="bg-card/20 backdrop-blur-sm border-2 border-dashed border-border rounded-3xl p-24 flex flex-col items-center justify-center text-center shadow-inner group">
                    <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:bg-amber-500/10">
                        <ArrowLeftRight className="text-muted-foreground group-hover:text-amber-500 transition-colors" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 uppercase tracking-widest">Select an Account</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Please select an account from the Chart of Accounts above to view detailed transaction history.
                    </p>
                </div>
            )}
        </div>
    );
}
