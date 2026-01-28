
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rentalApi } from '../../api/rental';
import { Button, Card, PageLoading } from '../ui';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';



export function RentalScheduler() {
    const [viewDate, setViewDate] = useState(new Date());

    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

    // Format for API
    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];

    const { data: scheduleItems, isLoading } = useQuery({
        queryKey: ['rentalScheduler', startStr, endStr],
        queryFn: () => rentalApi.getSchedule(startStr, endStr),
    });

    // Helper to days in month
    const daysInMonth = endOfMonth.getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Group items by Asset
    const assets = useMemo(() => {
        if (!scheduleItems) return [];
        // Extract unique assets and their items
        const map = new Map();
        scheduleItems.forEach((item: any) => {
            if (!map.has(item.asset_id)) {
                map.set(item.asset_id, {
                    id: item.asset_id,
                    name: item.asset_name,
                    code: item.asset_code,
                    schedules: []
                });
            }
            map.get(item.asset_id).schedules.push(item);
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [scheduleItems]);

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    if (isLoading) return <PageLoading />;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-muted/10">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date())} className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40 px-4">
                        Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleNextMonth} className="rounded-xl border border-border bg-muted/20 hover:bg-muted/40">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="p-6">
                <Card className="overflow-x-auto p-0 border-border rounded-2xl">
                    <div className="min-w-[800px]">
                        {/* Header Row */}
                        <div className="grid grid-cols-[200px_1fr] border-b border-border sticky top-0 bg-card z-10 shadow-lg shadow-black/20">
                            <div className="p-4 font-bold text-muted-foreground text-xs uppercase tracking-widest border-r border-border">Asset</div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                                {days.map(d => (
                                    <div key={d} className={`text-center py-4 text-[10px] font-bold text-muted-foreground border-r border-border ${d === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() ? 'bg-primary/20 text-primary' : ''}`}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="bg-card/40">
                            {assets.map(asset => (
                                <div key={asset.id} className="grid grid-cols-[200px_1fr] border-b border-border hover:bg-muted/10 transition-colors group">
                                    <div className="p-4 border-r border-border bg-muted/20 group-hover:bg-transparent">
                                        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{asset.name}</div>
                                        <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-tighter">{asset.code}</div>
                                    </div>
                                    <div className="relative h-16">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 grid h-full pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                                            {days.map(d => (
                                                <div key={d} className={`border-r border-border h-full ${d === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() ? 'bg-primary/5' : ''}`}></div>
                                            ))}
                                        </div>

                                        {/* Bars */}
                                        {asset.schedules.map((item: any) => {
                                            // Calculate position
                                            const itemStart = new Date(item.start_date);
                                            const itemEnd = item.actual_end_date ? new Date(item.actual_end_date) : (item.expected_end_date ? new Date(item.expected_end_date) : endOfMonth);

                                            // Clamp to current month view
                                            const viewStart = startOfMonth;
                                            const viewEnd = endOfMonth;

                                            if (itemEnd < viewStart || itemStart > viewEnd) return null;

                                            const effectiveStart = itemStart < viewStart ? viewStart : itemStart;
                                            const effectiveEnd = itemEnd > viewEnd ? viewEnd : itemEnd;

                                            const startDay = effectiveStart.getDate();
                                            const endDay = effectiveEnd.getDate();
                                            const duration = endDay - startDay + 1; // Inclusive

                                            // Color based on status
                                            let barClass = "bg-primary shadow-primary/20";
                                            if (item.status === 'rented_out') barClass = "bg-emerald-500 shadow-emerald-500/20";
                                            if (item.status === 'overdue') barClass = "bg-destructive shadow-destructive/20";
                                            if (item.status === 'returned') barClass = "bg-muted-foreground shadow-black/20";
                                            if (item.status === 'approved') barClass = "bg-indigo-500 shadow-indigo-500/20";


                                            return (
                                                <div
                                                    key={item.rental_item_id}
                                                    className={`absolute top-3 bottom-3 rounded-lg ${barClass} text-[10px] font-bold text-primary-foreground flex items-center px-3 truncate shadow-lg group cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110 z-20 border border-white/10`}
                                                    style={{
                                                        left: `calc(((100% / ${daysInMonth}) * ${startDay - 1}) + 2px)`,
                                                        width: `calc(((100% / ${daysInMonth}) * ${duration}) - 4px)`
                                                    }}
                                                    title={`${item.client_name} (${item.status})`}
                                                >
                                                    <span className="truncate w-full leading-none tracking-tight">{item.client_name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {assets.length === 0 && (
                            <div className="py-24 text-center">
                                <Calendar size={48} className="mx-auto mb-4 text-muted-foreground opacity-20" />
                                <p className="text-muted-foreground font-medium">No rentals scheduled for this month.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
