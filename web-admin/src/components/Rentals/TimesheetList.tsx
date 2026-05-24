import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Check, X, Plus, Calendar, Clock, ClipboardList } from 'lucide-react';
import { timesheetApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import { CreateTimesheetModal } from './CreateTimesheetModal';
import {
    Select,
    LoadingOverlay,
    ActionIcon,
    StatusBadge,
    Button,
    Badge
} from '../ui';

interface TimesheetListProps {
    rentalId?: string;
}

export function TimesheetList({ rentalId }: TimesheetListProps) {
    const [selectedRentalInternal, setSelectedRentalInternal] = useState<string>('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const activeRentalId = rentalId || selectedRentalInternal;

    // Fetch Active Rentals for Dropdown (only if no prop provided)
    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active'),
        enabled: !rentalId
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.client_name}` })) || [];

    // Fetch Timesheets
    const { data: timesheets, isLoading } = useQuery({
        queryKey: ['timesheets', activeRentalId],
        queryFn: () => activeRentalId ? timesheetApi.listByRental(activeRentalId) : Promise.resolve([]),
        enabled: !!activeRentalId
    });

    return (
        <div className="flex flex-col h-full bg-background rounded-b-2xl">
            {/* Contextual Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    {!rentalId ? (
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Calendar size={20} className="text-primary" />
                            </div>
                            <div className="max-w-sm w-[300px]">
                                <Select
                                    placeholder="Select Rental Asset Stream"
                                    options={rentalOptions}
                                    value={selectedRentalInternal}
                                    onChange={(val) => setSelectedRentalInternal(val)}
                                    className="bg-card border-border rounded-xl h-11"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Clock size={20} className="text-primary" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Operational Logs</h4>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Timesheets & Performance Data</p>
                            </div>
                        </div>
                    )}
                </div>
                {activeRentalId && (
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={18} />}
                        onClick={() => setCreateModalOpen(true)}
                        className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-primary-foreground"
                    >
                        Register Entry
                    </Button>
                )}
            </div>

            <div className="relative flex-1 overflow-hidden flex flex-col">
                <LoadingOverlay visible={isLoading} />

                {activeRentalId ? (
                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {timesheets && timesheets.length > 0 ? (
                                timesheets.map((ts) => (
                                    <div key={ts.id} className="group relative bg-card/40 border border-border hover:border-primary/40 rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden backdrop-blur-xl">
                                        {/* Decorative Gradient Blob */}
                                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors duration-500 pointer-events-none" />
                                        
                                        <div className="relative z-10 flex flex-col h-full">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-4">
                                                <div>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Log Date</span>
                                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors text-lg uppercase tracking-tight">
                                                        {ts.work_date}
                                                    </div>
                                                </div>
                                                <StatusBadge status={ts.status} className="px-3 py-1.5 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-black/5" />
                                            </div>

                                            {/* Body */}
                                            <div className="flex-1 space-y-6">
                                                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50">
                                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                                        <Clock size={20} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Asset Identity</span>
                                                        <span className="text-foreground font-bold line-clamp-1">{(ts as any).asset_name || '-'}</span>
                                                        <span className="text-[10px] font-mono text-muted-foreground/60 block mt-0.5">ID: {ts.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-1">Utilization</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-black text-primary tracking-tighter">{ts.operating_hours}</span>
                                                            <span className="text-xs font-bold text-primary/60">HRS</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest block mb-1">Production</span>
                                                        <div className="flex flex-col">
                                                            {ts.production_volume ? (
                                                                <>
                                                                    <span className="text-xl font-black text-emerald-500 tracking-tighter italic">
                                                                        {ts.production_volume}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-emerald-500/60 uppercase">{ts.production_unit}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2">No Data</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Exception Hours */}
                                                {(ts.standby_hours > 0 || ts.breakdown_hours > 0) && (
                                                    <div className="flex items-center gap-3">
                                                        {ts.standby_hours > 0 && (
                                                            <Badge variant="warning" className="bg-orange-500/10 border-orange-500/20 text-orange-500 font-bold text-xs py-1.5 px-3">
                                                                {ts.standby_hours}h Standby
                                                            </Badge>
                                                        )}
                                                        {ts.breakdown_hours > 0 && (
                                                            <Badge variant="danger" className="bg-destructive/10 border-destructive/20 text-destructive font-bold text-xs py-1.5 px-3 animate-pulse">
                                                                {ts.breakdown_hours}h Breakdown
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="mt-6 pt-4 border-t border-border/50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                <ActionIcon variant="default" className="rounded-xl hover:bg-muted w-10 h-10 border border-border">
                                                    <Eye size={16} />
                                                </ActionIcon>
                                                {ts.status === 'submitted' && (
                                                    <>
                                                        <ActionIcon variant="success" className="rounded-xl hover:bg-emerald-500/20 w-10 h-10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                                            <Check size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon variant="danger" className="rounded-xl hover:bg-destructive/20 w-10 h-10 border border-destructive/20 shadow-lg shadow-destructive/10">
                                                            <X size={16} />
                                                        </ActionIcon>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !isLoading && (
                                    <div className="col-span-full py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <div className="p-6 bg-muted/20 rounded-full border border-border/50 shadow-inner">
                                                <ClipboardList size={48} className="opacity-20" />
                                            </div>
                                            <p className="text-sm font-bold uppercase tracking-widest opacity-50 mt-4">No operational records found for this stream</p>
                                            <Button
                                                variant="secondary"
                                                onClick={() => setCreateModalOpen(true)}
                                                className="rounded-xl px-8 mt-2 hover:scale-105 transition-transform"
                                            >
                                                Initialize Log Entry
                                            </Button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-24 h-24 rounded-full bg-primary/10 border border-dashed border-primary/20 flex items-center justify-center mb-6">
                            <Plus size={48} className="text-primary/20" />
                        </div>
                        <h4 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">Stream Selection Required</h4>
                        <p className="text-muted-foreground max-w-sm font-medium">Select a rental asset from the dropdown above to view or manage operational timesheets.</p>
                    </div>
                )}
            </div>

            {activeRentalId && (
                <CreateTimesheetModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    rentalId={activeRentalId}
                />
            )}
        </div>
    );
}
