// Rental Detail Page - Pure Tailwind
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Truck, Calendar, User,
    Check, X, Receipt,
    Clock, ClipboardList, Tags
} from 'lucide-react';
import { rentalApi } from '../../api/rental';
import { api } from '../../api/client';
import { TimesheetList } from '../../components/Rentals/TimesheetList';
import { BillingHistory } from '../../components/Rentals/BillingHistory';
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

export function RentalDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success } = useToast();

    // Modal controls
    const [approveOpened, setApproveOpened] = useState(false);
    const [rejectOpened, setRejectOpened] = useState(false);
    const [dispatchOpened, setDispatchOpened] = useState(false);
    const [returnOpened, setReturnOpened] = useState(false);

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
        mutationFn: () => rentalApi.dispatchRental(id!, {
            driver_name: '',
            truck_plate: '',
            notes: notes,
            location_id: selectedLocation || null // API expects null or string?
        }),
        onSuccess: () => {
            success('Asset marked as dispatched', 'Dispatched');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setDispatchOpened(false);
        }
    });

    const returnMutation = useMutation({
        mutationFn: () => rentalApi.returnRental(id!, {
            return_date: new Date().toISOString().split('T')[0],
            meter_reading: meterReading || 0,
            notes: notes,
            location_id: selectedLocation || null
        }),
        onSuccess: () => {
            success('Asset marked as returned', 'Returned');
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            setReturnOpened(false);
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
                    {/* Workflow Actions */}
                    {['requested', 'pending_approval'].includes(rental.status) && (
                        <>
                            <Button variant="danger" leftIcon={<X size={16} />} onClick={() => setRejectOpened(true)}>Reject</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" leftIcon={<Check size={16} />} onClick={() => setApproveOpened(true)}>Approve</Button>
                        </>
                    )}
                    {rental.status === 'approved' && (
                        <Button leftIcon={<Truck size={16} />} onClick={() => setDispatchOpened(true)}>Dispatch Asset</Button>
                    )}
                    {rental.status === 'rented_out' && (
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white" leftIcon={<ArrowLeft size={16} />} onClick={() => setReturnOpened(true)}>Register Return</Button>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                    <Card padding="md">
                        <h3 className="text-lg font-bold text-white mb-4">Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Client</span>
                                <div className="flex items-center gap-2 text-white">
                                    <User size={18} className="text-slate-500" />
                                    <span className="font-medium">{rental.client_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Asset</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Truck size={18} className="text-slate-500" />
                                    <span className="font-medium">{rental.asset_name}</span>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 h-px bg-slate-800 my-2" />

                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Start Date</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Calendar size={18} className="text-slate-500" />
                                    <span>{rental.start_date}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-slate-500">Expected End</span>
                                <div className="flex items-center gap-2 text-white">
                                    <Calendar size={18} className="text-slate-500" />
                                    <span>{rental.expected_end_date || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-4">
                    <Card padding="md" className="h-full">
                        <h3 className="text-lg font-bold text-white mb-4">Financials</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Standard Rate</span>
                                <span className="text-lg font-bold text-white">Rp {rental.daily_rate?.toLocaleString()}</span>
                            </div>
                            {rental.rate_name && (
                                <p className="text-xs text-slate-500">Template: {rental.rate_name}</p>
                            )}
                            <div className="w-full h-px bg-slate-800" />
                            <div>
                                <span className="text-sm text-slate-500">Total Billed to Date</span>
                                <p className="text-2xl font-bold text-white mt-1">Rp 0</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

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

                        <TabsContent value="billing" className="p-6">
                            {id && <BillingHistory rentalId={id} />}
                        </TabsContent>

                        <TabsContent value="handovers" className="p-6">
                            <div className="text-center py-8">
                                <p className="text-slate-500 italic">Handover logs (Dispatch/Return) are not yet available via API.</p>
                            </div>
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
