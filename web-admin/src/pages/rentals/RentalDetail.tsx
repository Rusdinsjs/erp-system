// Rental Detail Page - Pure Tailwind
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Calendar, User,
    Check, X, Receipt,
    Clock, ClipboardList, Tags
} from 'lucide-react';
import { rentalApi } from '../../api/rental';
import type { RentalItem } from '../../api/rental';
import { api } from '../../api/http';
import { TimesheetList } from '../../components/Rentals/TimesheetList';
import { BillingHistory } from '../../components/Rentals/BillingHistory';
import { BillingGenerator } from '../../components/Rentals/BillingGenerator';
import { HandoverGallery } from '../../components/Rentals/HandoverGallery';
import {
    Button,
    Card,
    Badge,
    Tabs, TabsList, TabsTrigger, TabsContent,
    Modal,
    Textarea,
    NumberInput,
    Checkbox,
    Select,
    LoadingOverlay,
    useToast,
    StatusBadge
} from '../../components/ui';

function HandoverList({ rentalId }: { rentalId: string }) {
    const { data: handovers, isLoading } = useQuery({
        queryKey: ['rental-handovers', rentalId],
        queryFn: () => rentalApi.getHandovers(rentalId),
        enabled: !!rentalId
    });

    if (isLoading) return <LoadingOverlay visible />;

    if (!handovers || handovers.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-muted/20">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No handover records found for this rental.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            {handovers.map((handover: any) => (
                <div key={handover.id} className="bg-card/50 border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        {handover.handover_type === 'dispatch' ? <Receipt size={64} className="text-foreground" /> : <Calendar size={64} className="text-foreground" />}
                    </div>

                    <div className="flex justify-between items-start mb-8 border-b border-border pb-6">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <Badge variant={handover.handover_type === 'dispatch' ? 'info' : 'warning'} className="uppercase px-3 py-1 rounded-full text-[10px] font-bold tracking-widest">
                                    {handover.handover_type}
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground uppercase tracking-tighter">
                                    {new Date(handover.recorded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            {handover.condition_notes && (
                                <p className="text-muted-foreground mt-4 text-sm leading-relaxed max-w-2xl">{handover.condition_notes}</p>
                            )}
                        </div>
                        {handover.has_damage && (
                            <Badge variant="danger" className="animate-pulse shadow-lg shadow-destructive/20">Damage Reported</Badge>
                        )}
                    </div>

                    <HandoverGallery rentalId={rentalId} handoverId={handover.id} />
                </div>
            ))}
        </div>
    );
}

interface RentalDetailProps {
    rentalId?: string;
}

export default function RentalDetail({ rentalId: propRentalId }: RentalDetailProps) {
    const params = useParams<{ id: string }>();
    const id = propRentalId || params.id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success } = useToast();

    if (!id) return <div>Invalid Rental ID</div>;

    // Modal controls
    const [approveOpened, setApproveOpened] = useState(false);
    const [rejectOpened, setRejectOpened] = useState(false);
    const [dispatchOpened, setDispatchOpened] = useState(false);
    const [returnOpened, setReturnOpened] = useState(false);

    // Item Selection for Actions
    const [selectedItem, setSelectedItem] = useState<RentalItem | null>(null);

    // Form states
    const [notes, setNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    // Dispatch/Return form states
    const [meterReading, setMeterReading] = useState<number | undefined>(undefined);
    const [hasDamage, setHasDamage] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<string>('');

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get('/locations');
            return res.data.map((l: any) => ({ value: l.id, label: l.name }));
        }
    });

    // Fetch Rental Data
    const { data: rental, isLoading } = useQuery({
        queryKey: ['rental', id],
        queryFn: () => rentalApi.getRental(id!),
        enabled: !!id
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: () => rentalApi.approveRental(id!, notes),
        onSuccess: () => {
            success('Rental approved successfully', 'Approved');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setApproveOpened(false);
        }
    });

    const rejectMutation = useMutation({
        mutationFn: () => rentalApi.rejectRental(id!, rejectReason),
        onSuccess: () => {
            success('Rental rejected', 'Rejected');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setRejectOpened(false);
        }
    });

    const dispatchMutation = useMutation({
        mutationFn: () => {
            if (!selectedItem) throw new Error("No item selected");
            return rentalApi.dispatchRental(id!, {
                rental_item_id: selectedItem.id,
                condition_rating: 'Good', // Default for now, could add to form
                condition_notes: notes,
                location_id: selectedLocation || null
            });
        },
        onSuccess: () => {
            success('Asset marked as dispatched', 'Dispatched');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setDispatchOpened(false);
            setSelectedItem(null);
        }
    });

    const returnMutation = useMutation({
        mutationFn: () => {
            if (!selectedItem) throw new Error("No item selected");
            return rentalApi.returnRental(id!, {
                rental_item_id: selectedItem.id,
                return_date: new Date().toISOString().split('T')[0],
                meter_reading: meterReading || 0,
                condition_rating: hasDamage ? 'Damaged' : 'Good',
                has_damage: hasDamage,
                damage_description: hasDamage ? notes : undefined,
                condition_notes: notes,
                location_id: selectedLocation || null
            });
        },
        onSuccess: () => {
            success('Asset marked as returned', 'Returned');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setReturnOpened(false);
            setSelectedItem(null);
        }
    });

    if (isLoading) return <LoadingOverlay visible />;

    if (!rental) return <div className="text-destructive p-8">Rental not found</div>;

    return (
        <div className="p-8 space-y-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/rentals')}
                        className="rounded-xl border border-border bg-card hover:bg-muted w-12 h-12 p-0 flex items-center justify-center transition-all hover:scale-105"
                    >
                        <ArrowLeft size={24} className="text-muted-foreground" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-foreground tracking-tight">Rental #{rental.rental_number}</h1>
                            <StatusBadge status={rental.status} className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest" />
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <User size={14} className="opacity-50" /> {rental.client_name}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {['requested', 'pending_approval'].includes(rental.status) && (
                        <>
                            <Button
                                variant="outline"
                                leftIcon={<X size={18} />}
                                onClick={() => setRejectOpened(true)}
                                className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                            >
                                Reject
                            </Button>
                            <Button
                                variant="primary"
                                leftIcon={<Check size={18} />}
                                onClick={() => setApproveOpened(true)}
                                className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                Approve Rental
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 relative overflow-hidden border-border rounded-2xl bg-card/60 backdrop-blur-xl">
                        {/* Decorative background element */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Receipt size={20} className="text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Contract Overview</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Period</label>
                                    <div className="flex items-center gap-3 text-foreground bg-muted/20 p-3 rounded-xl border border-border">
                                        <Calendar size={18} className="text-primary opacity-60" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{rental.start_date}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{rental.expected_end_date ? `UNTIL ${rental.expected_end_date}` : 'OPEN-ENDED'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Internal Notes</label>
                                    <div className="text-sm text-foreground bg-muted/20 p-4 rounded-xl border border-border min-h-[85px] leading-relaxed">
                                        {rental.notes || 'No specific notes recorded for this rental.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Rented Assets Table Card */}
                    <Card className="overflow-hidden border-border rounded-2xl bg-card/60 backdrop-blur-xl p-0">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/90">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <Tags size={20} className="text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Rented Assets</h3>
                            </div>
                            <Badge variant="default" className="bg-muted text-muted-foreground border-border">{rental.items?.length || 0} Total</Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-foreground/80 border-separate border-spacing-0">
                                <thead className="bg-background/80 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4">Asset Details</th>
                                        <th className="px-6 py-4">Pricing Template</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {rental.items?.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-muted/30 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground group-hover:text-primary transition-colors">{item.asset_name}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">{item.asset_code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-foreground/80">Rp {item.rental_rate_amount?.toLocaleString('id-ID')}</div>
                                                <div className="text-[10px] text-muted-foreground capitalize">{item.rate_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={item.status} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    {rental.status === 'approved' && item.status === 'pending' && (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => { setDispatchOpened(true); setSelectedItem(item); }}
                                                            className="rounded-xl px-4 py-2 text-xs font-bold shadow-lg shadow-blue-500/10 text-white"
                                                        >
                                                            Dispatch
                                                        </Button>
                                                    )}
                                                    {item.status === 'rented_out' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-xl px-4 py-2 text-xs font-bold border-orange-500/20 text-orange-500 hover:bg-orange-500/10"
                                                            onClick={() => { setReturnOpened(true); setSelectedItem(item); }}
                                                        >
                                                            Return
                                                        </Button>
                                                    )}
                                                    {item.status === 'returned' && (
                                                        <div className="text-muted-foreground italic text-xs">Closed</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="p-6 h-full relative overflow-hidden border-border rounded-2xl bg-card/60 backdrop-blur-xl">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />

                        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2 font-display uppercase tracking-widest text-[13px] opacity-70">
                            Billing Summary
                        </h3>

                        <div className="space-y-8 relative z-10">
                            <div className="bg-muted/20 p-6 rounded-2xl border border-border border-l-emerald-500/40 border-l-4">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Total Billed</span>
                                <p className="text-3xl font-bold text-emerald-500 tracking-tighter">
                                    <span className="text-xs font-medium mr-1 opacity-60">Rp</span>
                                    {rental.total_amount?.toLocaleString('id-ID') || '0'}
                                </p>
                            </div>

                            <div className="space-y-4 px-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Status</span>
                                    <StatusBadge status={rental.status} />
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total Items</span>
                                    <span className="text-foreground font-bold">{rental.items?.length || 0} Assets</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tabs Area */}
            <Card className="overflow-hidden border-border rounded-2xl bg-card/60 backdrop-blur-sm p-0">
                <Tabs defaultValue="overview">
                    <div className="px-6 py-4 border-b border-border bg-card/90">
                        <TabsList className="bg-background/20">
                            <TabsTrigger value="overview" icon={<ClipboardList size={16} />} className="px-6">Overview</TabsTrigger>
                            <TabsTrigger value="timesheets" icon={<Clock size={16} />} className="px-6">Timesheets</TabsTrigger>
                            <TabsTrigger value="billing" icon={<Receipt size={16} />} className="px-6">Billing History</TabsTrigger>
                            <TabsTrigger value="handovers" icon={<Tags size={16} />} className="px-6">Handovers</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="min-h-[400px]">
                        <TabsContent value="overview" className="p-0">
                            <div className="p-10 text-center max-w-2xl mx-auto">
                                <div className="p-4 bg-muted/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                    <ClipboardList size={32} className="text-muted-foreground opacity-40" />
                                </div>
                                <h4 className="text-xl font-bold text-foreground mb-3">Rental Process Details</h4>
                                <p className="text-muted-foreground leading-relaxed mb-8">
                                    This rental agreement covers the following assets managed for {rental.client_name}.
                                    All activities including timesheets and billing are tracked automatically through the modules below.
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-left">
                                    <div className="bg-muted/10 p-4 rounded-xl border border-border">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Created At</div>
                                        <div className="text-sm text-foreground">System Record Logged</div>
                                    </div>
                                    <div className="bg-muted/10 p-4 rounded-xl border border-border">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Contract Manager</div>
                                        <div className="text-sm text-foreground">Fleet Operations</div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="timesheets" className="p-0">
                            <TimesheetList rentalId={id} />
                        </TabsContent>

                        <TabsContent value="billing" className="p-0 space-y-0">
                            <div className="p-6 bg-blue-500/5 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground mb-1">Billing Automation</h3>
                                <p className="text-sm text-muted-foreground">Review automated billing cycles and verify manual overrides.</p>
                            </div>
                            <BillingGenerator rentalId={id!} />
                            <div className="border-t border-border">
                                <BillingHistory rentalId={id} />
                            </div>
                        </TabsContent>

                        <TabsContent value="handovers" className="p-0">
                            <HandoverList rentalId={id!} />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>

            {/* MODALS */}

            {/* Approve Modal */}
            <Modal
                isOpen={approveOpened}
                onClose={() => setApproveOpened(false)}
                title="Approve Rental Request"
                size="xl"
            >
                <div className="relative space-y-6">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Check size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-emerald-400">Ready to Activate</h4>
                            <p className="text-xs text-emerald-500/70">Approving this request will allow assets to be dispatched to {rental.client_name}.</p>
                        </div>
                    </div>

                    <Textarea
                        label="Approval Notes (Optional)"
                        placeholder="Add internal notes about this approval..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-card border-border rounded-xl min-h-[120px]"
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setApproveOpened(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-8 shadow-lg shadow-emerald-500/20 text-white"
                            onClick={() => approveMutation.mutate()}
                            loading={approveMutation.isPending}
                        >
                            Approve Now
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal isOpen={rejectOpened} onClose={() => setRejectOpened(false)} title="Reject Rental Request" size="lg">
                <div className="space-y-6">
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                            <X size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-rose-400">Rejecting Request</h4>
                            <p className="text-xs text-rose-500/70">Please provide a reason for rejecting this rental application.</p>
                        </div>
                    </div>

                    <Textarea
                        label="Reason for Rejection"
                        required
                        placeholder="Client credit limit exceeded, asset unavailable, etc..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="bg-card border-border rounded-xl min-h-[120px]"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setRejectOpened(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            variant="danger"
                            onClick={() => rejectMutation.mutate()}
                            loading={rejectMutation.isPending}
                            className="rounded-xl px-8 shadow-lg shadow-destructive/20"
                        >
                            Reject Request
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Dispatch Modal */}
            <Modal isOpen={dispatchOpened} onClose={() => setDispatchOpened(false)} title="Dispatch Asset" size="xl">
                <div className="space-y-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />

                    <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <div className="p-3 bg-primary/20 rounded-xl">
                            <Tags size={24} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-primary/60 font-bold uppercase tracking-widest">Asset Dispatching</p>
                            <h4 className="text-lg font-bold text-foreground">{selectedItem?.asset_name}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Destination Location"
                            placeholder="Select client site..."
                            options={locations}
                            value={selectedLocation}
                            onChange={setSelectedLocation}
                            className="bg-card border-border rounded-xl"
                        />
                        <div className="p-4 bg-muted/10 rounded-xl border border-border flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Current Date</span>
                            <span className="text-sm text-foreground">{new Date().toLocaleDateString('id-ID')}</span>
                        </div>
                    </div>

                    <Textarea
                        label="Dispatch Notes"
                        placeholder="Condition notes, accessories included, operator name..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-card border-border rounded-xl min-h-[100px]"
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setDispatchOpened(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => dispatchMutation.mutate()}
                            loading={dispatchMutation.isPending}
                            className="rounded-xl px-8 shadow-lg shadow-primary/20 text-white"
                        >
                            Confirm Dispatch
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Return Modal */}
            <Modal isOpen={returnOpened} onClose={() => setReturnOpened(false)} title="Register Asset Return" size="xl">
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                        <div className="p-3 bg-orange-500/20 rounded-xl">
                            <ArrowLeft size={24} className="text-orange-500" />
                        </div>
                        <div>
                            <p className="text-xs text-orange-500/60 font-bold uppercase tracking-widest">Receiving Return</p>
                            <h4 className="text-lg font-bold text-foreground">{selectedItem?.asset_name}</h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <NumberInput
                            label="Final Meter Reading"
                            placeholder="HM / KM"
                            value={meterReading}
                            onChange={(v) => setMeterReading(Number(v))}
                            className="bg-card border-border rounded-xl"
                        />
                        <Select
                            label="Return Location"
                            placeholder="Warehouse/yard..."
                            options={locations}
                            value={selectedLocation}
                            onChange={setSelectedLocation}
                            className="bg-card border-border rounded-xl col-span-2"
                        />
                    </div>

                    <div className="p-4 bg-muted/10 rounded-2xl border border-border">
                        <Checkbox
                            label="Has Damage / Issues encountered?"
                            checked={hasDamage}
                            onChange={(e) => setHasDamage(e.target.checked)}
                        />
                        {hasDamage && (
                            <p className="text-[10px] text-destructive/70 mt-2 font-bold uppercase">Attention: Damage report will be logged</p>
                        )}
                    </div>

                    <Textarea
                        label="Return Notes / Damage Description"
                        placeholder="General condition upon return..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-card border-border rounded-xl min-h-[100px]"
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button variant="ghost" onClick={() => setReturnOpened(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-8 shadow-lg shadow-orange-500/20 border-none"
                            onClick={() => returnMutation.mutate()}
                            loading={returnMutation.isPending}
                        >
                            Confirm Return
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
