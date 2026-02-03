// ApprovalCenter Page - Pure Tailwind
import { useState, useMemo } from 'react';
import {
    Check, X, RefreshCw, Wrench, ClipboardList, ArrowRight,
    Calendar, User, Clock, Truck, ClipboardCheck, Info, ArrowLeftRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi } from '../api/approval';
import { conversionApi } from '../api/conversion';
import { fuelApi } from '../api/fuel';
import { taxRenewalApi } from '../api/tax-renewals';
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
import { Fuel, FileText } from 'lucide-react';

// Resource type config
const resourceTypeConfig: Record<string, { label: string; iconColor: string }> = {
    lifecycle_transition: { label: 'Lifecycle', iconColor: 'text-violet-400' },
    work_order: { label: 'Work Order', iconColor: 'text-blue-400' },
    asset: { label: 'Asset', iconColor: 'text-green-400' },
    rental_request: { label: 'Rental Request', iconColor: 'text-orange-400' },
    timesheet_verification: { label: 'Timesheet', iconColor: 'text-teal-400' },
    loan: { label: 'Loan Request', iconColor: 'text-cyan-400' },
    conversion_request: { label: 'Conversion', iconColor: 'text-purple-400' },
    fuel_request: { label: 'Fuel Request', iconColor: 'text-yellow-400' },
    tax_renewal: { label: 'Tax Renewal', iconColor: 'text-rose-400' },
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function getFullImageUrl(path: string | undefined) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Remove duplicate /api if present
    // Remove duplicate /api if present
    // If API_URL ends with /api, we might need to adjust. 
    // Usually VITE_API_URL includes /api. 
    // Let's assume path is relative to server root if it starts with /api/uploads
    // But VITE_API_URL is typically http://localhost:8080/api

    // Safer approach: construction from specific logic
    // If path is /api/uploads/xyz.jpg and API_URL is .../api
    // We want http://localhost:8080/api/uploads/xyz.jpg

    const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    return `${baseUrl}${path}`;
}

function RequestDetails({ request, showDetails = false }: { request: ApprovalRequest; showDetails?: boolean }) {
    const data = request.data_snapshot;

    if (request.resource_type === 'fuel_request') {
        return (
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{data?.asset_name || 'Unknown Asset'}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Fuel size={12} />
                        <span>{data?.request_type === 'amount' ? `IDR ${Number(data.requested_value).toLocaleString()}` : `${data.requested_value} Liters`}</span>
                    </div>

                    {/* Odometer Stats */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 p-2 bg-slate-800/50 rounded-lg text-xs">
                        <div>
                            <p className="text-slate-500">Current Odo</p>
                            <p className="text-white font-mono">{Number(data?.odometer_reading).toLocaleString()} km</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Prev. Odo</p>
                            <p className="text-white font-mono">
                                {data?.previous_odometer ? `${Number(data.previous_odometer).toLocaleString()} km` : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Diff</p>
                            <p className="text-emerald-400 font-mono">
                                {data?.previous_odometer
                                    ? `+${(Number(data.odometer_reading) - Number(data.previous_odometer)).toLocaleString()} km`
                                    : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Prev. Usage</p>
                            <p className="text-white font-mono">
                                {data?.previous_fuel_volume ? `${Number(data.previous_fuel_volume).toLocaleString()} L` : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {showDetails && data?.odometer_image_url && (
                    <div className="mt-2">
                        <p className="text-xs text-slate-400 mb-1">Odometer Photo:</p>
                        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 w-full max-w-sm">
                            <img
                                src={getFullImageUrl(data.odometer_image_url)}
                                alt="Odometer"
                                className="w-full h-auto object-cover max-h-[300px]"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

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
                <p className="text-sm font-medium text-white">{data?.asset_name || 'Unknown Asset'}</p>
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

    if (request.resource_type === 'loan' || request.resource_type === 'loan_request') {
        // Loan Request Details
        const assetName = data?.asset_name || 'Unknown Asset';
        const loanDate = data?.loan_date ? new Date(data.loan_date).toLocaleDateString() : 'N/A';
        const returnDate = data?.return_date || data?.expected_return_date ? new Date(data.return_date || data.expected_return_date).toLocaleDateString() : 'N/A';
        const purpose = data?.purpose || data?.needs || '';

        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{assetName}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>{loanDate} - {returnDate}</span>
                </div>
                {purpose && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Info size={12} />
                        <span className="truncate max-w-[250px]">{purpose}</span>
                    </div>
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

    if (request.resource_type === 'tax_renewal') {
        return (
            <div className="space-y-1">
                <p className="text-sm font-medium text-white">{data?.asset_name || data?.asset_id || 'Unknown Asset'}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <FileText size={12} />
                    <span>{data?.document_type}</span>
                </div>
                {data?.renewal_cost && (
                    <p className="text-xs text-emerald-400">
                        Cost: Rp {Number(data.renewal_cost).toLocaleString()}
                    </p>
                )}
                {showDetails && data?.invoice_attachment && (
                    <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-1">Invoice / Receipt:</p>
                        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900 w-full max-w-sm">
                            {data.invoice_attachment.toLowerCase().endsWith('.pdf') ? (
                                <a
                                    href={getFullImageUrl(data.invoice_attachment)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center p-4 text-cyan-400 hover:bg-slate-800 transition-colors"
                                >
                                    <FileText size={24} className="mr-2" />
                                    <span className="text-sm font-medium">View PDF Invoice</span>
                                </a>
                            ) : (
                                <img
                                    src={getFullImageUrl(data.invoice_attachment)}
                                    alt="Invoice Attachment"
                                    className="w-full h-auto object-cover max-h-[400px]"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
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

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionNotes, setActionNotes] = useState('');

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

    // Fuel Requests (integrated)
    const { data: fuelRequests = [], isLoading: loadingFuel } = useQuery({
        queryKey: ['fuel', 'pending'],
        queryFn: fuelApi.listPending,
        enabled: activeTab === 'pending',
    });

    // Tax Renewals (integrated)
    const { data: taxRenewals = [], isLoading: loadingTax } = useQuery({
        queryKey: ['tax-renewals', 'pending'],
        queryFn: () => taxRenewalApi.list('PENDING_APPROVAL'),
        enabled: activeTab === 'pending',
    });

    const { data: myRequests = [], isLoading: loadingMy } = useQuery({
        queryKey: ['approvals', 'my-requests'],
        queryFn: approvalApi.listMyRequests,
        enabled: activeTab === 'my_requests',
    });

    const { data: myFuelRequests = [], isLoading: loadingMyFuel } = useQuery({
        queryKey: ['fuel', 'my-requests'],
        queryFn: fuelApi.listMyRequests,
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
            requested_by: c.requested_by || 'Unknown', // Map to correct field
            requester_name: c.requested_by,
            created_at: c.created_at,
            updated_at: c.created_at,
            data_snapshot: c, // Pass full object as snapshot
        }));

        const mappedFuel: ApprovalRequest[] = fuelRequests.map((f: any) => ({
            id: f.id,
            resource_type: 'fuel_request',
            resource_id: f.asset_id,
            action_type: 'fuel_request',
            status: f.status.toUpperCase(), // 'REQUESTED' -> 'PENDING'
            current_approval_level: 1,
            requested_by: f.requested_by,
            requester_name: f.requester_name,
            created_at: f.created_at,
            updated_at: f.updated_at,
            data_snapshot: f,
        }));

        const mappedTax: ApprovalRequest[] = taxRenewals.map((t: any) => ({
            id: t.id,
            resource_type: 'tax_renewal',
            resource_id: t.asset_id,
            action_type: 'tax_renewal',
            status: t.status.toUpperCase(),
            current_approval_level: 1,
            requested_by: 'System', // Placeholder as tax renewals are system/admin generated
            requester_name: 'Admin / Operator',
            created_at: t.created_at,
            updated_at: t.updated_at,
            data_snapshot: t,
        }));

        return [...standardRequests, ...mappedConversions, ...mappedFuel, ...mappedTax].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [standardRequests, conversionRequests, fuelRequests, taxRenewals]);

    // Merge Requests for 'my_requests' view
    const myMergedRequests = useMemo(() => {
        const mappedFuel: ApprovalRequest[] = myFuelRequests.map((f: any) => ({
            id: f.id,
            resource_type: 'fuel_request',
            resource_id: f.asset_id,
            action_type: 'fuel_request',
            status: f.status.toUpperCase(),
            current_approval_level: 1,
            requested_by: f.requested_by,
            requester_name: f.requester_name,
            created_at: f.created_at,
            updated_at: f.updated_at,
            data_snapshot: f,
        }));

        return [...myRequests, ...mappedFuel].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [myRequests, myFuelRequests]);

    const approveMutation = useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            if (selectedRequest?.resource_type === 'conversion_request') {
                return conversionApi.approveRequest(id);
            }
            if (selectedRequest?.resource_type === 'fuel_request') {
                return fuelApi.approve(id);
            }
            if (selectedRequest?.resource_type === 'tax_renewal') {
                return taxRenewalApi.approve(id, notes);
            }
            return approvalApi.approve(id, notes);
        },
        onSuccess: () => {
            success('Request approved', 'Success');
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
            queryClient.invalidateQueries({ queryKey: ['fuel'] });
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
            setModalOpen(false);
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
            if (selectedRequest?.resource_type === 'fuel_request') {
                return fuelApi.reject(id, notes);
            }
            if (selectedRequest?.resource_type === 'tax_renewal') {
                return taxRenewalApi.reject(id, notes);
            }
            return approvalApi.reject(id, notes);
        },
        onSuccess: () => {
            success('Request rejected', 'Success');
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
            queryClient.invalidateQueries({ queryKey: ['fuel'] });
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
            setModalOpen(false);
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to reject request', 'Error');
        },
    });

    const openRequest = (request: ApprovalRequest) => {
        setSelectedRequest(request);
        setActionNotes('');
        setModalOpen(true);
    };

    const handleApprove = () => {
        if (!selectedRequest) return;
        if (window.confirm('Are you sure you want to approve this request?')) {
            approveMutation.mutate({ id: selectedRequest.id, notes: actionNotes });
        }
    };

    const handleReject = () => {
        if (!selectedRequest) return;
        if (window.confirm('Are you sure you want to reject this request?')) {
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

    const currentData = activeTab === 'pending' ? pendingRequests : myMergedRequests;
    const isLoading = activeTab === 'pending' ? (loadingStandard || loadingConversions || loadingFuel || loadingTax) : (loadingMy || loadingMyFuel);
    const filteredData = filterType === 'all' ? currentData : currentData.filter(r => r.resource_type === filterType);

    // Stats
    const lifecycleCount = pendingRequests.filter(r => r.resource_type === 'lifecycle_transition').length;
    const workOrderCount = pendingRequests.filter(r => r.resource_type === 'work_order').length;
    const rentalCount = pendingRequests.filter(r => r.resource_type === 'rental_request').length;
    const timesheetCount = pendingRequests.filter(r => r.resource_type === 'timesheet_verification').length;
    const conversionCount = pendingRequests.filter(r => r.resource_type === 'conversion_request').length;
    const assetCount = pendingRequests.filter(r => r.resource_type === 'asset').length;
    const loanCount = pendingRequests.filter(r => r.resource_type === 'loan').length;
    const fuelCount = pendingRequests.filter(r => r.resource_type === 'fuel_request').length;
    const taxCount = pendingRequests.filter(r => r.resource_type === 'tax_renewal').length;

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

    const handleCloseModal = () => {
        if (actionNotes.trim()) {
            if (window.confirm('Discard changes? You have entered notes.')) {
                setModalOpen(false);
                setActionNotes('');
            }
        } else {
            setModalOpen(false);
        }
    };

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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard title="Lifecycle" value={lifecycleCount} icon={RefreshCw} iconColor="text-violet-400" />
                    <StatCard title="Work Orders" value={workOrderCount} icon={Wrench} iconColor="text-blue-400" />
                    <StatCard title="Rentals" value={rentalCount} icon={Truck} iconColor="text-orange-400" />
                    <StatCard title="Conversions" value={conversionCount} icon={ArrowLeftRight} iconColor="text-purple-400" />
                    <StatCard title="Timesheets" value={timesheetCount} icon={ClipboardCheck} iconColor="text-teal-400" />
                    <StatCard title="Assets" value={assetCount} icon={ClipboardList} iconColor="text-green-400" />
                    <StatCard title="Loans" value={loanCount} icon={ClipboardList} iconColor="text-pink-400" />
                    <StatCard title="Fuel" value={fuelCount} icon={Fuel} iconColor="text-yellow-400" />
                    <StatCard title="Tax" value={taxCount} icon={FileText} iconColor="text-rose-400" />
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
                        { value: 'fuel_request', label: 'Fuel' },
                        { value: 'tax_renewal', label: 'Tax Renewal' },
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
                                        <TableRow key={req.id} onClick={() => openRequest(req)} className="cursor-pointer">
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
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    rightIcon={<ArrowRight size={14} />}
                                                >
                                                    Review
                                                </Button>
                                            </TableTd>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Unified Detail & Action Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title="Review Request"
                size="lg"
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        {/* Header Info */}
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

                        {/* Request Content */}
                        <div className="border-t border-slate-800 pt-4">
                            <p className="text-xs text-slate-400 mb-2">Request Content</p>
                            <Card padding="sm" className="bg-slate-900/50 border-slate-800">
                                <RequestDetails request={selectedRequest} showDetails={true} />
                            </Card>
                        </div>

                        {/* Approval History / Notes */}
                        {(selectedRequest.notes_l1 || selectedRequest.notes_l2) && (
                            <div className="border-t border-slate-800 pt-4 space-y-2">
                                <p className="text-xs text-slate-400">Previous Notes</p>
                                {selectedRequest.notes_l1 && (
                                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                                        <p className="text-xs text-slate-400">L1 Approver:</p>
                                        <p className="text-sm text-white">{selectedRequest.notes_l1}</p>
                                    </div>
                                )}
                                {selectedRequest.notes_l2 && (
                                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                                        <p className="text-xs text-slate-400">L2 Approver:</p>
                                        <p className="text-sm text-white">{selectedRequest.notes_l2}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Area (Only if Pending) */}
                        {activeTab === 'pending' && (
                            <div className="border-t border-slate-800 pt-4 space-y-4">
                                <Textarea
                                    label="Approval / Rejection Notes"
                                    placeholder="Add notes (optional for approval, required for rejection)..."
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                />

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={handleCloseModal}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={handleReject}
                                        loading={rejectMutation.isPending}
                                        disabled={!actionNotes}
                                        leftIcon={<X size={16} />}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleApprove}
                                        loading={approveMutation.isPending}
                                        leftIcon={<Check size={16} />}
                                    >
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
