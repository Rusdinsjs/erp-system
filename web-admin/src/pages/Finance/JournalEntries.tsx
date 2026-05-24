import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, FileText, ArrowRightLeft, Calendar, FileDigit, Info, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { journalApi } from '../../api/journal';
import { Button, Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableSkeleton, ActionIcon, StatusBadge } from '../../components/ui';

export default function JournalEntries() {
    const navigate = useNavigate();

    const { data: entries, isLoading } = useQuery({
        queryKey: ['journal-entries'],
        queryFn: () => journalApi.list(),
    });

    return (
        <div className="p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <ArrowRightLeft className="text-blue-500" size={32} />
                        Journal Entries
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage and review general ledger transactions</p>
                </div>
                <Button
                    leftIcon={<Plus size={20} />}
                    onClick={() => navigate('/finance/journals/new')}
                    className="rounded-xl shadow-lg shadow-blue-500/20"
                >
                    New Journal
                </Button>
            </div>

            <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
                
                {/* Optional Toolbar/Filter area */}
                <div className="px-6 py-4 border-b border-border bg-muted/20 flex gap-4 items-center relative z-10">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search transaction number..." 
                            className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto relative z-10">
                    <Table className="border-none rounded-none shadow-none">
                        <TableHead>
                            <TableRow className="bg-card/90 backdrop-blur-md border-b border-border">
                                <TableTh><div className="flex items-center gap-2"><FileDigit size={14} className="text-muted-foreground"/> Transaction Ref</div></TableTh>
                                <TableTh><div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground"/> Date</div></TableTh>
                                <TableTh><div className="flex items-center gap-2"><Info size={14} className="text-muted-foreground"/> Description</div></TableTh>
                                <TableTh>Reference</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh align="center">Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableTd colSpan={6} className="p-0">
                                        <div className="p-4"><TableSkeleton rows={5} cols={6} /></div>
                                    </TableTd>
                                </TableRow>
                            ) : entries && entries.length > 0 ? (
                                entries.map((entry) => (
                                    <TableRow key={entry.id} className="hover:bg-muted/40 transition-colors group">
                                        <TableTd>
                                            <span className="font-mono font-bold text-primary">{entry.transaction_number}</span>
                                        </TableTd>
                                        <TableTd>
                                            <span className="font-medium">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</span>
                                        </TableTd>
                                        <TableTd className="text-foreground/80 font-medium">
                                            {entry.description}
                                        </TableTd>
                                        <TableTd className="text-muted-foreground">
                                            {entry.reference || <span className="italic opacity-50">None</span>}
                                        </TableTd>
                                        <TableTd>
                                            <StatusBadge status={entry.status} />
                                        </TableTd>
                                        <TableTd align="center">
                                            <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ActionIcon 
                                                    title="View Journal"
                                                    onClick={() => navigate(`/finance/journals/${entry.id}`)}
                                                    className="hover:bg-blue-500/20 text-blue-400 border border-border"
                                                >
                                                    <Eye size={16} />
                                                </ActionIcon>
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableTd colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                                <FileText size={24} className="opacity-50" />
                                            </div>
                                            <span className="font-bold uppercase tracking-widest text-xs">No Journals Found</span>
                                            <p className="mt-2 text-sm opacity-70">There are no journal entries recorded yet.</p>
                                        </div>
                                    </TableTd>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
