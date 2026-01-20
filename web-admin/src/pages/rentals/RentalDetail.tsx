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
    useToast
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
            <div className="text-center py-8 border-2 border-dashed border-gray-700/50 rounded-lg bg-white/5">
                <ClipboardList className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">No handover records found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {handovers.map((handover: any) => (
                <div key={handover.id} className="bg-gray-950/50 border border-white/5 rounded-lg p-6 hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <Badge variant={handover.handover_type === 'dispatch' ? 'info' : 'warning'} className="uppercase">
                                    {handover.handover_type}
                                </Badge>
                                <span className="text-sm text-gray-400">
                                    Recorded on {new Date(handover.recorded_at).toLocaleDateString()}
                                </span>
                            </div>
                            {handover.condition_notes && (
                                <p className="text-gray-300 mt-2 text-sm">{handover.condition_notes}</p>
                            )}
                        </div>
                        {handover.has_damage && (
                            <Badge variant="danger">Damage Reported</Badge>
                        )}
                    </div>

                    <HandoverGallery rentalId={rentalId} handoverId={handover.id} />
                </div>
            ))}
        </div>
    );
}

// Status Badge Helper
const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
        draft: 'default',
        requested: 'info',
        pending_approval: 'warning',
        approved: 'info',
        rented_out: 'success',
        returned: 'default',
        completed: 'success',
        cancelled: 'danger',
        rejected: 'danger',
    };
    return <Badge variant={variants[status] || 'default'} className="capitalize">{status.replace('_', ' ')}</Badge>;
};

interface RentalDetailProps {
    rentalId?: string;
}

export function RentalDetail({ rentalId: propRentalId }: RentalDetailProps) {
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
    // if (error || !rental) return <div className="text-red-400">Failed to load rental details</div>;

    if (!rental) return <div className="text-red-400 p-8">Rental not found</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/rentals')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">Rental #{rental.rental_number}</h1>
                        {getStatusBadge(rental.status)}
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex gap-2">
                        {/* Workflow Actions */}
                        {['requested', 'pending_approval'].includes(rental.status) && (
                            <>
                                <Button variant="danger" leftIcon={<X size={16} />} onClick={() => setRejectOpened(true)}>Reject</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" leftIcon={<Check size={16} />} onClick={() => setApproveOpened(true)}>Approve</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                    <Card padding="md">
                        <h3 className="text-lg font-bold text-white mb-4">Contract Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Client</span>
                                <div className="flex items-center gap-2 text-white">
                                    <User size={18} className="text-slate-500" />
                                    <span className="font-medium">{rental.client_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Contract No.</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Receipt size={18} className="text-slate-500" />
                                    <span className="font-medium">{rental.rental_number}</span>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 h-px bg-white/5 my-2" />

                            <div className="space-y-1">
                                <span className="text-sm text-gray-400">Start Date</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Calendar size={18} className="text-gray-500" />
                                    <span>{rental.start_date}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-gray-400">Expected End</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Calendar size={18} className="text-gray-500" />
                                    <span>{rental.expected_end_date || 'Open-Ended'}</span>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <h4 className="text-sm text-gray-400 mb-1">Notes</h4>
                                <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">
                                    {rental.notes || 'No notes provided.'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-4">
                    <Card padding="md" className="h-full">
                        <h3 className="text-lg font-bold text-white mb-4">Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Total Items</span>
                                <span className="text-lg font-bold text-white">
                                    {rental.items?.length || 0} Assets
                                </span>
                            </div>
                            <div className="w-full h-px bg-white/5" />
                            <div>
                                <span className="text-sm text-gray-500">Total Billed to Date</span>
                                <p className="text-2xl font-bold text-white mt-1">Rp {rental.total_amount?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* ASSETS LIST */}
            <Card padding="md">
                <h3 className="text-lg font-bold text-white mb-4">Rented Assets</h3>
                <div className="overflow-x-auto border border-white/5 rounded-lg">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-800 text-xs uppercase font-semibold text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Asset</th>
                                <th className="px-4 py-3">Rate</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {rental.items?.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-800/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{item.asset_name}</div>
                                        <div className="text-xs text-slate-500">{item.asset_code}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        Rp {item.rental_rate_amount?.toLocaleString()} ({item.rate_name})
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {rental.status === 'approved' && item.status === 'pending' && (
                                            <Button size="sm" onClick={() => { setDispatchOpened(true); setSelectedItem(item); }}>
                                                Dispatch
                                            </Button>
                                        )}
                                        {item.status === 'rented_out' && (
                                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { setReturnOpened(true); setSelectedItem(item); }}>
                                                Return
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Tabs for Sub-modules */}
            <Card padding="none" className="overflow-hidden">
                <Tabs defaultValue="overview">
                    <div className="px-4 pt-4 border-b border-slate-800">
                        <TabsList>
                            <TabsTrigger value="overview" icon={<ClipboardList size={14} />}>Overview</TabsTrigger>
                            <TabsTrigger value="timesheets" icon={<Clock size={14} />}>Timesheets</TabsTrigger>
                            <TabsTrigger value="billing" icon={<Receipt size={14} />}>Billing History</TabsTrigger>
                            <TabsTrigger value="handovers" icon={<Tags size={14} />}>Handovers</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="bg-slate-900/50 min-h-[300px]">
                        <TabsContent value="overview" className="p-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Notes</h4>
                                <p className="text-white bg-slate-950 p-4 rounded-lg border border-slate-800">
                                    {rental.notes || 'No notes available.'}
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="timesheets" className="p-6">
                            <TimesheetList rentalId={id} />
                        </TabsContent>

                        <TabsContent value="billing" className="p-6 space-y-8">
                            {/* Generator */}
                            <BillingGenerator rentalId={id!} />

                            {/* History */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Invoice History</h3>
                                {id && <BillingHistory rentalId={id} />}
                            </div>
                        </TabsContent>

                        <TabsContent value="handovers" className="p-6">
                            <HandoverList rentalId={id!} />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>

            {/* MODALS */}

            {/* Approve Modal */}
            <Modal isOpen={approveOpened} onClose={() => setApproveOpened(false)} title="Approve Rental Request">
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">Are you sure you want to approve this rental request?</p>
                    <Textarea
                        label="Approval Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setApproveOpened(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                            Confirm Approval
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal isOpen={rejectOpened} onClose={() => setRejectOpened(false)} title="Reject Rental Request">
                <div className="space-y-4">
                    <Textarea
                        label="Reason for Rejection"
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setRejectOpened(false)}>Cancel</Button>
                        <Button variant="danger" onClick={() => rejectMutation.mutate()} loading={rejectMutation.isPending}>
                            Reject Request
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Dispatch Modal */}
            <Modal isOpen={dispatchOpened} onClose={() => setDispatchOpened(false)} title="Dispatch Asset">
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">Confirm dispatch of asset to client.</p>
                    <Select
                        label="Destination Location"
                        placeholder="Select client site..."
                        options={locations}
                        value={selectedLocation}
                        onChange={setSelectedLocation}
                    />
                    <Textarea
                        label="Dispatch Notes"
                        placeholder="Condition notes, accessories included..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setDispatchOpened(false)}>Cancel</Button>
                        <Button onClick={() => dispatchMutation.mutate()} loading={dispatchMutation.isPending}>
                            Confirm Dispatch
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Return Modal */}
            <Modal isOpen={returnOpened} onClose={() => setReturnOpened(false)} title="Register Asset Return">
                <div className="space-y-4">
                    <NumberInput
                        label="Final Meter Reading"
                        placeholder="HM / KM"
                        value={meterReading}
                        onChange={(v) => setMeterReading(Number(v))}
                    />
                    <Checkbox
                        label="Has Damage?"
                        checked={hasDamage}
                        onChange={(checked: any) => setHasDamage(checked)}
                    />
                    <Textarea
                        label="Return Notes / Damage Description"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <Select
                        label="Return Location"
                        placeholder="Select warehouse/yard..."
                        options={locations}
                        value={selectedLocation}
                        onChange={setSelectedLocation}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setReturnOpened(false)}>Cancel</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>
                            Confirm Return
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
