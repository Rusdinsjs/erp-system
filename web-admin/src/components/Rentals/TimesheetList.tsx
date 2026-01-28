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
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-foreground/80 border-separate border-spacing-0">
                            <thead className="bg-card/90 sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Work Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Asset Instance</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Utilization</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border text-center">Standby / BD</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Performance</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Lifecycle</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {timesheets && timesheets.length > 0 ? (
                                    timesheets.map((ts) => (
                                        <tr key={ts.id} className="group hover:bg-muted/30 transition-all duration-300">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight whitespace-nowrap">
                                                    {ts.work_date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-muted-foreground font-medium whitespace-nowrap">{(ts as any).asset_name || '-'}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground/60">ID: {ts.id.slice(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-primary font-black text-lg tracking-tighter">{ts.operating_hours}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Hours</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <Badge variant="warning" className="bg-orange-500/10 border-orange-500/20 text-orange-500 font-bold text-[10px]">
                                                        {ts.standby_hours}h S
                                                    </Badge>
                                                    <Badge variant="danger" className="bg-destructive/10 border-destructive/20 text-destructive font-bold text-[10px]">
                                                        {ts.breakdown_hours}h B
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {ts.production_volume ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-black text-emerald-500 tracking-tighter italic">
                                                            {ts.production_volume}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{ts.production_unit}</span>
                                                    </div>
                                                ) : <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">No Data</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={ts.status} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-black/5" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <ActionIcon variant="default" className="rounded-xl hover:bg-muted w-10 h-10">
                                                        <Eye size={16} />
                                                    </ActionIcon>
                                                    {ts.status === 'submitted' && (
                                                        <>
                                                            <ActionIcon variant="success" className="rounded-xl hover:bg-emerald-500/20 w-10 h-10 border border-emerald-500/20">
                                                                <Check size={16} />
                                                            </ActionIcon>
                                                            <ActionIcon variant="danger" className="rounded-xl hover:bg-destructive/20 w-10 h-10 border border-destructive/20">
                                                                <X size={16} />
                                                            </ActionIcon>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    !isLoading && (
                                        <tr>
                                            <td colSpan={7} className="py-24 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <div className="p-6 bg-muted/20 rounded-full">
                                                        <ClipboardList size={48} className="opacity-20" />
                                                    </div>
                                                    <p className="text-sm font-bold uppercase tracking-widest opacity-50">No operational records found for this stream</p>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setCreateModalOpen(true)}
                                                        className="rounded-xl"
                                                    >
                                                        Initialize Log Entry
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
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
