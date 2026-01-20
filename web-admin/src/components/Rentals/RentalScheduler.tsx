
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
        <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="secondary" onClick={() => setViewDate(new Date())}>Today</Button>
                    <Button variant="secondary" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>

            <Card className="overflow-x-auto p-0 bg-slate-900 border-slate-800">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[200px_1fr] border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                        <div className="p-3 font-semibold text-slate-400 text-sm border-r border-slate-800">Asset</div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                            {days.map(d => (
                                <div key={d} className={`text-center py-2 text-xs text-slate-500 border-r border-slate-800/50 ${d === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() ? 'bg-indigo-900/30 text-white font-bold' : ''}`}>
                                    {d}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    {assets.map(asset => (
                        <div key={asset.id} className="grid grid-cols-[200px_1fr] border-b border-slate-800/50 hover:bg-slate-800/20">
                            <div className="p-3 border-r border-slate-800">
                                <div className="text-sm font-medium text-white">{asset.name}</div>
                                <div className="text-xs text-slate-500">{asset.code}</div>
                            </div>
                            <div className="relative h-14 border-slate-800/50">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 grid h-full pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(30px, 1fr))` }}>
                                    {days.map(d => (
                                        <div key={d} className={`border-r border-slate-800/30 h-full ${d === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() ? 'bg-indigo-500/5' : ''}`}></div>
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
                                    let color = "bg-blue-500";
                                    if (item.status === 'rented_out') color = "bg-emerald-500";
                                    if (item.status === 'overdue') color = "bg-red-500";
                                    if (item.status === 'returned') color = "bg-slate-600";
                                    if (item.status === 'approved') color = "bg-indigo-500";


                                    return (
                                        <div
                                            key={item.rental_item_id}
                                            className={`absolute top-2 bottom-2 rounded-md ${color} text-[10px] text-white flex items-center px-2 truncate shadow-sm group cursor-pointer transition-all hover:brightness-110`}
                                            style={{
                                                left: `calc(((100% / ${daysInMonth}) * ${startDay - 1}) + 2px)`,
                                                width: `calc(((100% / ${daysInMonth}) * ${duration}) - 4px)`
                                            }}
                                            title={`${item.client_name} (${item.status})`}
                                        >
                                            <span className="truncate w-full">{item.client_name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {assets.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No rentals scheduled for this month.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
