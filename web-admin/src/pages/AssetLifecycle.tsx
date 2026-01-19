// AssetLifecycle Page - Pure Tailwind
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowRight, Check, Clock, AlertTriangle, Package, Truck,
    Wrench, Trash2, Archive, RefreshCw, Lock, Info, History
} from 'lucide-react';
import { lifecycleApi } from '../api/lifecycle';
import { assetApi } from '../api/assets';
import type { LifecycleHistory } from '../api/lifecycle';
import { useAuthStore } from '../store/useAuthStore';
import { AssetConversionModal } from '../components/Assets/AssetConversionModal';
import { CreateLoanModal } from '../components/Assets/CreateLoanModal';
import { RetiredModal } from '../components/Assets/RetiredModal';
import { DisposedModal } from '../components/Assets/DisposedModal';
import { LostStolenModal } from '../components/Assets/LostStolenModal';
import { LifecycleTimeline } from '../components/Assets/LifecycleTimeline';
import { AssetFinancials } from '../components/Assets/AssetFinancials';
import {
    Button,
    Card,
    Badge,
    Modal,
    Textarea,
    LoadingOverlay,
    Tabs, TabsList, TabsTrigger, TabsContent,
    Timeline, TimelineItem,
    useToast,
    Input,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd
} from '../components/ui';

// State icon mapping
const stateIcons: Record<string, React.ReactNode> = {
    planning: <Clock size={16} />,
    procurement: <Truck size={16} />,
    received: <Package size={16} />,
    in_inventory: <Package size={16} />,
    deployed: <Check size={16} />,
    under_maintenance: <Wrench size={16} />,
    under_repair: <Wrench size={16} />,
    under_conversion: <RefreshCw size={16} />,
    retired: <AlertTriangle size={16} />,
    disposed: <Trash2 size={16} />,
    lost_stolen: <AlertTriangle size={16} />,
    archived: <Archive size={16} />,
};

// Map state to Badge variants
const getBadgeVariant = (state: string): 'default' | 'info' | 'success' | 'warning' | 'danger' => {
    switch (state) {
        case 'in_inventory':
        case 'deployed':
            return 'success';
        case 'procurement':
        case 'received':
        case 'under_conversion':
            return 'info';
        case 'under_maintenance':
        case 'under_repair':
            return 'warning';
        case 'lost_stolen':
            return 'danger';
        default:
            return 'default';
    }
};

// Permission requirements for each transition
const transitionPermissions: Record<string, number> = {
    // Role levels: 1=SuperAdmin, 2=Manager, 3=Supervisor, 4=Operator, 5=Viewer
    'planning': 4,
    'procurement': 3,
    'received': 4,
    'in_inventory': 4,
    'deployed': 3,
    'under_maintenance': 4,
    'under_repair': 4,
    'under_conversion': 2,
    'retired': 2,
    'disposed': 2,
    'lost_stolen': 3,
    'archived': 2,
};

interface AssetLifecycleProps {
    assetId?: string | null;
}

export function AssetLifecycle({ assetId: propAssetId }: AssetLifecycleProps) {
    const { id: paramAssetId } = useParams<{ id: string }>();
    const assetId = propAssetId || paramAssetId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success, error: showError, info } = useToast();

    const [transitionModalOpen, setTransitionModalOpen] = useState(false);
    const [conversionModalOpen, setConversionModalOpen] = useState(false);
    const [loanModalOpen, setLoanModalOpen] = useState(false);
    const [retiredModalOpen, setRetiredModalOpen] = useState(false);
    const [disposedModalOpen, setDisposedModalOpen] = useState(false);
    const [lostStolenModalOpen, setLostStolenModalOpen] = useState(false);
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [reason, setReason] = useState('');

    // Get user permissions
    const { user, hasRoleLevel } = useAuthStore();
    const userRoleLevel = user?.role_level ?? 5;

    // Check if user can perform a specific transition
    const canTransition = (targetState: string): boolean => {
        const requiredLevel = transitionPermissions[targetState] ?? 2;
        return hasRoleLevel(requiredLevel);
    };

    // Fetch all states
    const { data: allStates, isLoading: loadingStates, error: statesError } = useQuery({
        queryKey: ['lifecycle-states'],
        queryFn: lifecycleApi.getAllStates,
    });

    // Fetch current status from database
    const { data: currentStatus } = useQuery({
        queryKey: ['current-status', assetId],
        queryFn: () => lifecycleApi.getCurrentStatus(assetId!),
        enabled: !!assetId,
    });

    // Fetch asset detail
    const { data: assetData, isLoading: isLoadingAsset, error: assetError } = useQuery({
        queryKey: ['asset-detail', assetId],
        queryFn: () => assetApi.get(assetId!),
        enabled: !!assetId,
    });

    // Fetch valid transitions with approval info
    const { data: validTransitions, isLoading: loadingTransitions, error: transitionsError } = useQuery({
        queryKey: ['valid-transitions-with-approval', assetId],
        queryFn: () => lifecycleApi.getValidTransitionsWithApproval(assetId!),
        enabled: !!assetId,
    });

    // Fetch lifecycle history
    const { data: history, isLoading: loadingHistory, error: historyError } = useQuery({
        queryKey: ['lifecycle-history', assetId],
        queryFn: () => lifecycleApi.getHistory(assetId!),
        enabled: !!assetId,
    });

    // Transition mutation
    const transitionMutation = useMutation({
        mutationFn: () => lifecycleApi.requestTransition(assetId!, selectedState!, reason || undefined),
        onSuccess: (response) => {
            const targetState = selectedState;

            if (response.result_type === 'Executed') {
                success('Asset status updated successfully', 'Success');
            } else {
                info(response.message || 'Your transition request has been submitted for approval', 'Approval Request Created');
            }

            queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
            queryClient.invalidateQueries({ queryKey: ['asset-detail', assetId] });
            queryClient.invalidateQueries({ queryKey: ['valid-transitions-with-approval', assetId] });
            queryClient.invalidateQueries({ queryKey: ['lifecycle-history', assetId] });
            setTransitionModalOpen(false);
            setSelectedState(null);
            setReason('');

            // Open relevant form based on target state
            if (response.result_type === 'Executed') {
                if (targetState === 'under_maintenance') {
                    // navigate(`/work-orders?asset_id=${assetId}&wo_type=preventive`); // OLD LOGIC
                    navigate(`/work-orders?asset_id=${assetId}&wo_type=preventive`);
                } else if (targetState === 'under_repair') {
                    // navigate(`/work-orders?asset_id=${assetId}&wo_type=corrective`); // OLD LOGIC
                    navigate(`/work-orders?asset_id=${assetId}&wo_type=corrective`);
                } else if (targetState === 'rented_out') {
                    // Open rental form - redirect to rentals page with asset pre-selected
                    navigate(`/rentals?new=true&asset_id=${assetId}`);
                } else if (targetState === 'in_use' || targetState === 'loaned') {
                    setLoanModalOpen(true);
                } else if (targetState === 'under_conversion') {
                    setConversionModalOpen(true);
                }
            }
        },
        onError: (error: Error) => {
            showError(error.message || 'Failed to update status', 'Error');
        },
    });

    const handleCardClick = (stateValue: string) => {
        if (!canTransition(stateValue)) {
            showError('You do not have permission to perform this transition', 'Permission Denied');
            return;
        }

        // For critical transitions, open specialized modals directly
        if (stateValue === 'retired') {
            setRetiredModalOpen(true);
            return;
        }
        if (stateValue === 'disposed') {
            setDisposedModalOpen(true);
            return;
        }
        if (stateValue === 'lost_stolen') {
            setLostStolenModalOpen(true);
            return;
        }

        // SPECIAL HANDLING: Rented Out -> Redirect to Rental Form
        // This prevents the asset from becoming "Rented Out" without a rental record.
        if (stateValue === 'rented_out') {
            navigate(`/rentals/new?asset_id=${assetId}`);
            return;
        }

        // SPECIAL HANDLING: Maintenance/Repair -> Redirect to Work Order Form
        if (stateValue === 'under_maintenance') {
            navigate(`/work-orders?asset_id=${assetId}&wo_type=preventive`);
            return;
        }
        if (stateValue === 'under_repair') {
            navigate(`/work-orders?asset_id=${assetId}&wo_type=corrective`);
            return;
        }

        // For other transitions, use the standard confirmation modal
        setSelectedState(stateValue);
        setTransitionModalOpen(true);
    };

    const handleTransition = () => {
        if (!selectedState) return;
        transitionMutation.mutate();
    };

    const getCurrentState = (): string => {
        if (currentStatus) {
            return currentStatus.value;
        }
        return 'planning';
    };

    const getStateLabel = (value: string): string => {
        const state = allStates?.find((s) => s.value === value);
        return state?.label || value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getRoleName = (level: number): string => {
        const roles: Record<number, string> = {
            1: 'Super Admin',
            2: 'Manager',
            3: 'Supervisor',
            4: 'Operator',
            5: 'Viewer',
        };
        return roles[level] || 'Unknown';
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search Assets Query
    const { data: searchResults, isLoading: searching } = useQuery({
        queryKey: ['assets-search', debouncedQuery],
        queryFn: () => assetApi.list({ query: debouncedQuery, page: 1, per_page: 10 }),
        enabled: !assetId && debouncedQuery.length > 0
    });

    if (!assetId) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-white">Asset Lifecycle Audit</h1>
                    <p className="text-slate-400">Select an asset to view its lifecycle history and perform audits.</p>
                </div>

                <Card className="p-6 space-y-6">
                    <div className="max-w-md">
                        <Input
                            placeholder="Search asset by name or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Info size={16} />}
                        />
                    </div>

                    <div className="rounded-lg border border-slate-800 overflow-hidden">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Asset Tag</TableTh>
                                    <TableTh>Name</TableTh>
                                    <TableTh>Category</TableTh>
                                    <TableTh>Status</TableTh>
                                    <TableTh>Action</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {searching ? (
                                    <TableRow>
                                        <TableTd colSpan={5} className="text-center py-8 text-slate-500">Searching...</TableTd>
                                    </TableRow>
                                ) : searchResults?.data?.length ? (
                                    searchResults.data.map((asset: any) => (
                                        <TableRow key={asset.id}>
                                            <TableTd>{asset.asset_tag}</TableTd>
                                            <TableTd>{asset.name}</TableTd>
                                            <TableTd>{asset.category?.name || '-'}</TableTd>
                                            <TableTd>
                                                <Badge>{asset.status}</Badge>
                                            </TableTd>
                                            <TableTd>
                                                <Button
                                                    size="sm"
                                                    rightIcon={<ArrowRight size={14} />}
                                                    onClick={() => navigate(`/assets/${asset.id}/lifecycle`)}
                                                >
                                                    View Lifecycle
                                                </Button>
                                            </TableTd>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableTd colSpan={5} className="text-center py-8 text-slate-500">
                                            {debouncedQuery ? 'No assets found.' : 'Start typing to search for an asset.'}
                                        </TableTd>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        );
    }

    const hasError = statesError || transitionsError;
    const currentState = getCurrentState();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col">
                    {isLoadingAsset ? (
                        <div className="h-8 w-64 bg-slate-800 animate-pulse rounded" />
                    ) : assetError ? (
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-red-400">Error Loading Asset</h1>
                            <p className="text-xs text-red-500/70">
                                ID: {assetId} - {(assetError as any)?.response?.data?.error || (assetError as any)?.message}
                            </p>
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold text-white">
                            {assetData?.name || (assetData as any)?.asset?.name || `Asset ${assetId || ''}`}
                            {(assetData?.asset_code || (assetData as any)?.asset?.asset_code) && (
                                <span className="text-slate-400 ml-2 font-normal">
                                    ({assetData?.asset_code || (assetData as any)?.asset?.asset_code})
                                </span>
                            )}
                        </h1>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                        Your Role: {getRoleName(userRoleLevel)}
                    </div>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                </div>
            </div>

            {/* Financial Overview Widget */}
            {assetData && (
                <AssetFinancials
                    maintenanceCost={Number(assetData.total_maintenance_cost || 0)}
                    rentalIncome={Number(assetData.total_rental_income || 0)}
                    purchasePrice={Number(assetData.purchase_price || 0)}
                />
            )}

            <Tabs defaultValue="lifecycle">
                <Card padding="none">
                    {/* <TabsList className="px-4 pt-4">
                        <TabsTrigger value="lifecycle" icon={<History size={16} />}>LifecycleXXX</TabsTrigger>
                    </TabsList> */}

                    <TabsContent value="lifecycle" className="p-6">
                        <div className="space-y-6">
                            {hasError && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <Info size={16} />
                                    <span>Error loading data: {String(statesError || transitionsError)}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Current State & Transitions */}
                                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative">
                                    <LoadingOverlay visible={loadingTransitions || loadingStates} />

                                    <h2 className="text-lg font-bold text-white mb-4">Current Status</h2>
                                    <div className="flex flex-col gap-4 mb-8">
                                        <Badge
                                            variant={getBadgeVariant(currentState)}
                                            className="text-lg px-4 py-2 w-fit"
                                        >
                                            <div className="flex items-center gap-2">
                                                {stateIcons[currentState]}
                                                {getStateLabel(currentState)}
                                            </div>
                                        </Badge>

                                        {assetData && (
                                            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Responsible Person (PJ)</p>
                                                    <Badge size="sm" className="bg-slate-700 text-slate-300 border-slate-600">
                                                        {currentState === 'deployed' ? 'Dept. Responsibility' :
                                                            currentState.includes('loan') || assetData.assigned_to_name ? 'Individual' :
                                                                ['maintenance', 'repair'].includes(currentState) ? 'Technical' : 'Operational'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-white">
                                                    <span className="font-medium text-base">
                                                        {assetData.assigned_to_name || (
                                                            currentState === 'deployed' ? assetData.department_manager_name || 'No Dept Manager' :
                                                                ['planning', 'procurement', 'received', 'in_inventory'].includes(currentState) ? 'Warehouse / GA Team' :
                                                                    ['under_maintenance', 'under_repair'].includes(currentState) ? (assetData.vendor_name || 'Maintenance Team') :
                                                                        currentState === 'under_conversion' ? 'Technical Team' :
                                                                            ['retired', 'disposed'].includes(currentState) ? 'Asset Management / Finance' :
                                                                                'Unassigned'
                                                        )}
                                                    </span>
                                                    {(!assetData.assigned_to_name && currentState === 'deployed') && (
                                                        <Badge size="sm" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Manager PJ</Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                                    * PJ ini bertanggung jawab atas kondisi dan keberadaan aset pada tahap ini.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full h-px bg-slate-800 my-6" />

                                    <h2 className="text-lg font-bold text-white mb-4">Available Transitions</h2>
                                    {validTransitions && validTransitions.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {validTransitions.map((state) => {
                                                const hasPermission = canTransition(state.value);
                                                const requiredLevel = state.approval_level || (transitionPermissions[state.value] ?? 2);
                                                const needsApproval = state.requires_approval;


                                                return (
                                                    <button
                                                        key={state.value}
                                                        onClick={() => handleCardClick(state.value)}
                                                        disabled={!hasPermission}
                                                        className={`
                                                            flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                                            ${hasPermission
                                                                ? 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'
                                                                : 'border-slate-800 opacity-50 cursor-not-allowed'
                                                            }
                                                        `}
                                                        title={!hasPermission ? `Requires ${getRoleName(requiredLevel)}` : ''}
                                                    >
                                                        <div className={`p-2 rounded-lg ${hasPermission ? 'bg-slate-800' : 'bg-slate-900'}`}>
                                                            {hasPermission ? stateIcons[state.value] : <Lock size={16} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-white truncate">{state.label}</p>
                                                            {needsApproval && (
                                                                <span className="text-xs text-amber-400">Needs Approval</span>
                                                            )}
                                                            {!hasPermission && (
                                                                <span className="text-xs text-red-400">Locked</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm flex items-center gap-2 p-4 bg-slate-900 rounded-lg">
                                            <Info size={16} />
                                            No transitions available from current state.
                                        </p>
                                    )}
                                </div>

                                {/* History Timeline */}
                                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative min-h-[400px]">
                                    <LoadingOverlay visible={loadingHistory} />
                                    <h2 className="text-lg font-bold text-white mb-6">Lifecycle History</h2>

                                    {historyError && (
                                        <p className="text-red-400 mb-4">Error loading history</p>
                                    )}

                                    {history && history.length > 0 ? (
                                        <LifecycleTimeline history={history} />
                                    ) : !loadingHistory && (
                                        <p className="text-slate-500 text-center py-8">No history records yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Legend - All States */}
                            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Lifecycle State Legend</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {allStates?.map((state) => (
                                        <div
                                            key={state.value}
                                            className={`
                                                flex items-center gap-2 p-2 rounded-lg border text-xs
                                                ${state.value === currentState
                                                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                                                    : 'border-slate-800 bg-slate-950 text-slate-400'
                                                }
                                            `}
                                        >
                                            {stateIcons[state.value]}
                                            <span>{state.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Card>
            </Tabs>

            {/* Transition Confirmation Modal */}
            <Modal isOpen={transitionModalOpen} onClose={() => setTransitionModalOpen(false)} title="Confirm State Transition">
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4 py-4">
                        <Badge variant={getBadgeVariant(currentState)}>
                            {getStateLabel(currentState)}
                        </Badge>
                        <ArrowRight size={20} className="text-slate-500" />
                        <Badge variant={selectedState ? getBadgeVariant(selectedState) : 'default'}>
                            {selectedState ? getStateLabel(selectedState) : ''}
                        </Badge>
                    </div>

                    <Textarea
                        label="Reason (optional)"
                        placeholder="Enter reason for this transition..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setTransitionModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTransition}
                            loading={transitionMutation.isPending}
                        >
                            Confirm Transition
                        </Button>
                    </div>
                </div>
            </Modal>

            <AssetConversionModal
                opened={conversionModalOpen}
                onClose={() => setConversionModalOpen(false)}
                assetId={assetId!}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
                    // History should auto-refresh via its own efffect or query invalidation
                }}
            />

            <CreateLoanModal
                opened={loanModalOpen}
                onClose={() => setLoanModalOpen(false)}
                assetId={assetId!}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
                }}
            />

            <RetiredModal
                opened={retiredModalOpen}
                onClose={() => setRetiredModalOpen(false)}
                assetId={assetId!}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
                    queryClient.invalidateQueries({ queryKey: ['valid-transitions-with-approval', assetId] });
                }}
            />

            <DisposedModal
                opened={disposedModalOpen}
                onClose={() => setDisposedModalOpen(false)}
                assetId={assetId!}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
                    queryClient.invalidateQueries({ queryKey: ['valid-transitions-with-approval', assetId] });
                }}
            />

            <LostStolenModal
                opened={lostStolenModalOpen}
                onClose={() => setLostStolenModalOpen(false)}
                assetId={assetId!}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['current-status', assetId] });
                    queryClient.invalidateQueries({ queryKey: ['valid-transitions-with-approval', assetId] });
                }}
            />
        </div>
    );
}
