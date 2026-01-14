// ApprovalCenter Page - Pure Tailwind
import { useState, useMemo } from 'react';
import {
    Check, X, RefreshCw, Wrench, ClipboardList, ArrowRight,
    Calendar, User, Clock, Truck, ClipboardCheck, Info, ArrowLeftRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi } from '../api/approval';
import { conversionApi } from '../api/conversion';
import type { ApprovalRequest } from '../api/approval';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    Badge,
    Modal,
    Select,
    Textarea,
    LoadingOverlay,
    useToast,
} from '../components/ui';

// Resource type config
const resourceTypeConfig: Record<string, { label: string; iconColor: string }> = {
    lifecycle_transition: { label: 'Lifecycle', iconColor: 'text-violet-400' },
    work_order: { label: 'Work Order', iconColor: 'text-blue-400' },
    asset: { label: 'Asset', iconColor: 'text-green-400' },
    rental_request: { label: 'Rental Request', iconColor: 'text-orange-400' },
    timesheet_verification: { label: 'Timesheet', iconColor: 'text-teal-400' },
    loan: { label: 'Loan Request', iconColor: 'text-cyan-400' },
    conversion_request: { label: 'Conversion', iconColor: 'text-purple-400' },
};

// State colors for lifecycle
const stateBadgeVariant: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
    planning: 'default',
    procurement: 'info',
    in_inventory: 'success',
    deployed: 'success',
    under_maintenance: 'warning',
    under_repair: 'warning',
    retired: 'default',
    disposed: 'danger',
};

function RequestDetails({ request }: { request: ApprovalRequest }) {
    const data = request.data_snapshot;

    if (request.resource_type === 'conversion_request') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.title || 'Conversion Request'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <ArrowLeftRight size={12} />
                    <span>Cost: Rp {Number(data?.conversion_cost || 0).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-500">
                    {data?.reason ? `Reason: ${data.reason}` : 'No reason provided'}
                </p>
            </div>
        );
    }

    if (request.resource_type === 'lifecycle_transition') {
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <Badge variant={stateBadgeVariant[data?.from_state] || 'default'}>
                        {data?.from_state?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                    <ArrowRight size={14} className="text-slate-500" />
                    <Badge variant={stateBadgeVariant[data?.to_state] || 'default'}>
                        {data?.to_state?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                </div>
                {data?.reason && (
                    <p className="text-xs text-slate-500">Reason: {data.reason}</p>
                )}
            </div>
        );
    }

    if (request.resource_type === 'work_order') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.title || 'Work Order'}</p>
                {data?.priority && (
                    <Badge variant={data.priority === 'high' ? 'danger' : data.priority === 'medium' ? 'warning' : 'success'}>
                        {data.priority}
                    </Badge>
                )}
                {data?.estimated_cost && (
                    <p className="text-xs text-slate-500">Est: Rp {Number(data.estimated_cost).toLocaleString()}</p>
                )}
            </div>
        );
    }

    if (request.resource_type === 'rental_request') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.client_name || 'Unknown Client'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Truck size={12} />
                    <span>{data?.asset_name || 'Unknown Asset'}</span>
                </div>
                <p className="text-xs text-slate-500">
                    {data?.start_date} - {data?.expected_end_date || 'N/A'}
                </p>
            </div>
        );
    }

    if (request.resource_type === 'timesheet_verification') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.rental_number || 'Unknown Rental'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>Date: {data?.work_date}</span>
                </div>
                <p className="text-xs text-slate-500">Hours: {data?.operating_hours} hrs</p>
            </div>
        );
    }

    if (request.resource_type === 'asset') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.name || data?.asset_name || 'Asset'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <ClipboardList size={12} />
                    <span>SN: {data?.serial_number || 'N/A'}</span>
                </div>
                <Badge variant="default">{data?.category || 'Unknown Category'}</Badge>
            </div>
        );
    }

    return (
        <p className="text-xs text-slate-500 truncate max-w-[200px]">
            {JSON.stringify(data)}
        </p>
    );
}

function StatCard({ title, value, icon: Icon, iconColor }: { title: string; value: number; icon: any; iconColor: string }) {
    return (
        <Card padding="md">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800 ${iconColor}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-400">{title}</p>
                    <p className="text-xl font-bold text-white">{value}</p>
                </div>
            </div>
        </Card>
    );
}

export function ApprovalCenter() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const [activeTab, setActiveTab] = useState('pending');
    const [filterType, setFilterType] = useState('all');

    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

    // Standard Approvals
    const { data: standardRequests = [], isLoading: loadingStandard } = useQuery({
        queryKey: ['approvals', 'pending'],
        queryFn: approvalApi.listPending,
        enabled: activeTab === 'pending',
    });

    // Conversion Requests (integrated)
    const { data: conversionRequests = [], isLoading: loadingConversions } = useQuery({
        queryKey: ['conversions', 'pending'],
        queryFn: conversionApi.getPendingRequests,
        enabled: activeTab === 'pending',
    });

    const { data: myRequests = [], isLoading: loadingMy } = useQuery({
        queryKey: ['approvals', 'my-requests'],
        queryFn: approvalApi.listMyRequests,
        enabled: activeTab === 'my_requests',
    });

    // Merge Requests for 'pending' view
    const pendingRequests = useMemo(() => {
        const mappedConversions: ApprovalRequest[] = conversionRequests.map((c: any) => ({
            id: c.id,
            resource_type: 'conversion_request',
            resource_id: c.asset_id,
            action_type: 'conversion',
            status: c.status.toUpperCase(), // 'PENDING'
            current_approval_level: 1,
            requester_id: '',
            requester_name: c.requested_by,
            created_at: c.created_at,
            updated_at: c.created_at,
            data_snapshot: c, // Pass full object as snapshot
        }));
        return [...standardRequests, ...mappedConversions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [standardRequests, conversionRequests]);

    const approveMutation = useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            if (selectedRequest?.resource_type === 'conversion_request') {
                return conversionApi.approveRequest(id);
            }
            return approvalApi.approve(id, notes);
        },
        onSuccess: () => {
            success('Request approved', 'Success');
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
            setActionModalOpen(false);
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to approve request', 'Error');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
            if (selectedRequest?.resource_type === 'conversion_request') {
                return conversionApi.rejectRequest(id);
            }
            return approvalApi.reject(id, notes);
        },
        onSuccess: () => {
            success('Request rejected', 'Success');
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
            setActionModalOpen(false);
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to reject request', 'Error');
        },
    });

    const handleAction = (request: ApprovalRequest, type: 'approve' | 'reject') => {
        setSelectedRequest(request);
        setActionType(type);
        setActionNotes('');
        setActionModalOpen(true);
    };

    const submitAction = () => {
        if (!selectedRequest) return;
        if (actionType === 'approve') {
            approveMutation.mutate({ id: selectedRequest.id, notes: actionNotes || undefined });
        } else {
            rejectMutation.mutate({ id: selectedRequest.id, notes: actionNotes || 'Rejected' });
        }
    };

    const getStatusBadge = (status: string): 'info' | 'success' | 'warning' | 'danger' | 'default' => {
        switch (status) {
            case 'APPROVED_L1': return 'info';
            case 'APPROVED_L2': return 'success';
            case 'REJECTED':
            case 'rejected': return 'danger';
            case 'PENDING':
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    const currentData = activeTab === 'pending' ? pendingRequests : myRequests;
    const isLoading = activeTab === 'pending' ? (loadingStandard || loadingConversions) : loadingMy;
    const filteredData = filterType === 'all' ? currentData : currentData.filter(r => r.resource_type === filterType);

    // Stats
    const lifecycleCount = pendingRequests.filter(r => r.resource_type === 'lifecycle_transition').length;
    const workOrderCount = pendingRequests.filter(r => r.resource_type === 'work_order').length;
    const rentalCount = pendingRequests.filter(r => r.resource_type === 'rental_request').length;
    const timesheetCount = pendingRequests.filter(r => r.resource_type === 'timesheet_verification').length;
    const conversionCount = pendingRequests.filter(r => r.resource_type === 'conversion_request').length;
    const assetCount = pendingRequests.filter(r => r.resource_type === 'asset').length;
    const loanCount = pendingRequests.filter(r => r.resource_type === 'loan').length;

    const TabButton = ({ value, children, icon: Icon }: { value: string; children: React.ReactNode; icon: any }) => (
        <button
            onClick={() => setActiveTab(value)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === value
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            <Icon size={16} />
            {children}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Approval Center</h1>
                <Badge variant="warning" className="text-lg px-3 py-1">
                    {pendingRequests.length} Pending
                </Badge>
            </div>

            {/* Stats */}
            {activeTab === 'pending' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                    <StatCard title="Lifecycle" value={lifecycleCount} icon={RefreshCw} iconColor="text-violet-400" />
                    <StatCard title="Work Orders" value={workOrderCount} icon={Wrench} iconColor="text-blue-400" />
                    <StatCard title="Rentals" value={rentalCount} icon={Truck} iconColor="text-orange-400" />
                    <StatCard title="Conversions" value={conversionCount} icon={ArrowLeftRight} iconColor="text-purple-400" />
                    <StatCard title="Timesheets" value={timesheetCount} icon={ClipboardCheck} iconColor="text-teal-400" />
                    <StatCard title="Assets" value={assetCount} icon={ClipboardList} iconColor="text-green-400" />
                    <StatCard title="Loans" value={loanCount} icon={ClipboardList} iconColor="text-pink-400" />
                </div>
            )}

            {/* Tabs & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <TabButton value="pending" icon={Clock}>Pending Approvals</TabButton>
                    <TabButton value="my_requests" icon={User}>My Requests</TabButton>
                </div>
                <Select
                    placeholder="Filter by type"
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'conversion_request', label: 'Conversion' },
                        { value: 'lifecycle_transition', label: 'Lifecycle' },
                        { value: 'work_order', label: 'Work Order' },
                        { value: 'rental_request', label: 'Rental Request' },
                        { value: 'timesheet_verification', label: 'Timesheet' },
                        { value: 'asset', label: 'Asset' },
                        { value: 'loan', label: 'Loan' },
                    ]}
                />
            </div>

            {/* Table */}
            <Card padding="lg">
                <div className="relative">
                    <LoadingOverlay visible={isLoading} />

                    {filteredData.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Info size={32} className="mb-2 opacity-50" />
                            <p>No {activeTab === 'pending' ? 'pending approvals' : 'requests'} found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Date</TableTh>
                                    <TableTh>Type</TableTh>
                                    <TableTh>Action</TableTh>
                                    <TableTh>Details</TableTh>
                                    <TableTh>Level</TableTh>
                                    <TableTh>Status</TableTh>
                                    <TableTh>Requester</TableTh>
                                    <TableTh align="center">Actions</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((req) => {
                                    const config = resourceTypeConfig[req.resource_type] || { label: req.resource_type, iconColor: 'text-slate-400' };
                                    return (
                                        <TableRow key={req.id} onClick={() => { setSelectedRequest(req); setDetailModalOpen(true); }} className="cursor-pointer">
                                            <TableTd>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </div>
                                            </TableTd>
                                            <TableTd>
                                                <Badge variant="default">{config.label}</Badge>
                                            </TableTd>
                                            <TableTd>
                                                <span className="text-sm">{req.action_type.replace(/_/g, ' ')}</span>
                                            </TableTd>
                                            <TableTd>
                                                <RequestDetails request={req} />
                                            </TableTd>
                                            <TableTd>
                                                <Badge variant={req.current_approval_level === 1 ? 'info' : 'success'}>
                                                    L{req.current_approval_level}
                                                </Badge>
                                            </TableTd>
                                            <TableTd>
                                                <Badge variant={getStatusBadge(req.status)}>{req.status}</Badge>
                                            </TableTd>
                                            <TableTd>
                                                <span className="text-sm">{req.requester_name || 'Unknown'}</span>
                                            </TableTd>
                                            <TableTd align="center">
                                                {activeTab === 'pending' && (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            leftIcon={<Check size={14} />}
                                                            onClick={() => handleAction(req, 'approve')}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            leftIcon={<X size={14} />}
                                                            onClick={() => handleAction(req, 'reject')}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableTd>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Action Modal */}
            <Modal
                isOpen={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Request`}
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <Card padding="sm">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-300">Type:</span>
                                    <Badge>{resourceTypeConfig[selectedRequest.resource_type]?.label || selectedRequest.resource_type}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-300">Action:</span>
                                    <span className="text-sm">{selectedRequest.action_type.replace(/_/g, ' ')}</span>
                                </div>
                                <RequestDetails request={selectedRequest} />
                            </div>
                        </Card>

                        <Textarea
                            label="Notes"
                            placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional notes...'}
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            required={actionType === 'reject'}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setActionModalOpen(false)}>Cancel</Button>
                            <Button
                                variant={actionType === 'approve' ? 'primary' : 'danger'}
                                onClick={submitAction}
                                loading={approveMutation.isPending || rejectMutation.isPending}
                                disabled={actionType === 'reject' && !actionNotes}
                            >
                                Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title="Request Details"
                size="lg"
            >
                {selectedRequest && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-400">Request ID</p>
                                <p className="text-sm font-mono text-white">{selectedRequest.id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Created At</p>
                                <p className="text-sm text-white">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Resource Type</p>
                                <Badge>{resourceTypeConfig[selectedRequest.resource_type]?.label || selectedRequest.resource_type}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Status</p>
                                <Badge variant={getStatusBadge(selectedRequest.status)}>{selectedRequest.status}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Approval Level</p>
                                <Badge variant={selectedRequest.current_approval_level === 1 ? 'info' : 'success'}>
                                    Level {selectedRequest.current_approval_level}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Requester</p>
                                <p className="text-sm text-white">{selectedRequest.requester_name || selectedRequest.requested_by}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-4">
                            <p className="text-xs text-slate-400 mb-2">Details</p>
                            <RequestDetails request={selectedRequest} />
                        </div>

                        <div className="border-t border-slate-800 pt-4">
                            <p className="text-xs text-slate-400 mb-2">Data Snapshot</p>
                            <div className="p-3 bg-slate-900/50 rounded-lg">
                                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(selectedRequest.data_snapshot, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {(selectedRequest.notes_l1 || selectedRequest.notes_l2) && (
                            <div className="border-t border-slate-800 pt-4 space-y-2">
                                <p className="text-xs text-slate-400">Approval Notes</p>
                                {selectedRequest.notes_l1 && (
                                    <div className="p-3 bg-slate-900/50 rounded-lg">
                                        <p className="text-xs text-slate-400">L1 Notes:</p>
                                        <p className="text-sm text-white">{selectedRequest.notes_l1}</p>
                                    </div>
                                )}
                                {selectedRequest.notes_l2 && (
                                    <div className="p-3 bg-slate-900/50 rounded-lg">
                                        <p className="text-xs text-slate-400">L2 Notes:</p>
                                        <p className="text-sm text-white">{selectedRequest.notes_l2}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
