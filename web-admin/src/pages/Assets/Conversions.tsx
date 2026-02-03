import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    RefreshCw, Search, Plus, Check, X, Play
} from 'lucide-react';
import { conversionApi, type AssetConversion } from '../../api/conversion';
import { assetApi, type Asset } from '../../api/assets';
import {
    Card, Input, Button, Badge,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd,
    PageLoading,
    useToast,
    Modal,
    Select
} from '../../components/ui';
import { AssetConversionModal } from '../../components/Assets/AssetConversionModal';

// Simple Asset Picker Modal
function AssetPickerModal({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (assetId: string) => void }) {
    const [search, setSearch] = useState('');
    const { data: assetResponse, isLoading } = useQuery({
        queryKey: ['assets', 'picker', search],
        queryFn: () => assetApi.list({ page: 1, per_page: 20, query: search }),
    });

    const assets = assetResponse?.data || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Asset for Conversion">
            <div className="space-y-4">
                <Input
                    placeholder="Search asset by name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
                <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-md">
                    {isLoading ? (
                        <div className="p-4 text-center text-slate-500">Loading assets...</div>
                    ) : assets.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">No assets found</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {assets.map((asset: Asset) => (
                                <div
                                    key={asset.id}
                                    className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center group"
                                    onClick={() => onSelect(asset.id)}
                                >
                                    <div>
                                        <p className="font-medium text-slate-200">{asset.name}</p>
                                        <p className="text-xs text-slate-500">{asset.asset_code}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                                        Select
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </Modal>
    );
}

export default function Conversions() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal States
    const [pickerOpen, setPickerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Queries
    const { data: pendingConversions, isLoading: loadingPending } = useQuery({
        queryKey: ['conversions', 'pending'],
        queryFn: conversionApi.getPendingRequests,
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: conversionApi.approveRequest,
        onSuccess: () => {
            success('Conversion approved', 'Success');
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
        },
        onError: (err: any) => showError(err.message || 'Failed to approve', 'Error')
    });

    const rejectMutation = useMutation({
        mutationFn: conversionApi.rejectRequest,
        onSuccess: () => {
            success('Conversion rejected', 'Success');
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
        },
        onError: (err: any) => showError(err.message || 'Failed to reject', 'Error')
    });

    const executeMutation = useMutation({
        mutationFn: (id: string) => conversionApi.executeConversion(id, {}),
        onSuccess: () => {
            success('Conversion executed', 'Success');
            queryClient.invalidateQueries({ queryKey: ['conversions'] });
        },
        onError: (err: any) => showError(err.message || 'Failed to execute', 'Error')
    });

    // Combined/Filtered Data
    // Ideally we'd fetch ALL conversions, but API might limit us. 
    // For now assuming getPendingRequests returns what we need for the main workflow.
    // If not, we might need a dedicated "getAllConversions" endpoint.
    const allConversions = pendingConversions || [];

    const filteredConversions = allConversions.filter((c: AssetConversion) => {
        const matchesSearch =
            c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'danger';
            case 'pending': return 'warning';
            case 'executed': return 'info';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    const handleCreateClick = () => {
        setPickerOpen(true);
    };

    const handleAssetSelect = (assetId: string) => {
        setSelectedAssetId(assetId);
        setPickerOpen(false);
        setCreateModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-purple-400" />
                        Asset Conversions
                    </h1>
                    <p className="text-slate-400">Manage asset conversion requests</p>
                </div>
                <Button variant="primary" onClick={handleCreateClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Request
                </Button>
            </div>

            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <Input
                            placeholder="Search by title or request number..."
                            className="pl-10 bg-slate-900/50 border-slate-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            options={[
                                { label: 'All Status', value: 'all' },
                                { label: 'Pending', value: 'pending' },
                                { label: 'Approved', value: 'approved' },
                                { label: 'Rejected', value: 'rejected' },
                                { label: 'Executed', value: 'executed' },
                            ]}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Request No</TableTh>
                                <TableTh>Title</TableTh>
                                <TableTh>Asset ID</TableTh>
                                <TableTh>Cost</TableTh>
                                <TableTh>Requested By</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh>Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingPending ? (
                                <TableRow>
                                    <TableTd colSpan={7} className="text-center py-8"><PageLoading /></TableTd>
                                </TableRow>
                            ) : filteredConversions.length === 0 ? (
                                <TableRow>
                                    <TableTd colSpan={7} className="text-center py-8 text-slate-500">
                                        No conversions found.
                                    </TableTd>
                                </TableRow>
                            ) : (
                                filteredConversions.map((conv: AssetConversion) => (
                                    <TableRow key={conv.id}>
                                        <TableTd className="font-mono text-xs">{conv.request_number || '-'}</TableTd>
                                        <TableTd>
                                            <div className="font-medium text-slate-200">{conv.title}</div>
                                            <div className="text-xs text-slate-500">{new Date(conv.request_date).toLocaleDateString()}</div>
                                        </TableTd>
                                        <TableTd className="font-mono text-xs">
                                            <span title={conv.asset_id}>
                                                {conv.asset_id.substring(0, 8)}...
                                            </span>
                                        </TableTd>
                                        <TableTd>
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(conv.conversion_cost)}
                                        </TableTd>
                                        <TableTd>
                                            <span className="text-sm text-slate-300">
                                                User {conv.requested_by.substring(0, 8)}...
                                            </span>
                                        </TableTd>
                                        <TableTd>
                                            <Badge variant={getStatusColor(conv.status)}>
                                                {conv.status}
                                            </Badge>
                                        </TableTd>
                                        <TableTd>
                                            <div className="flex gap-2">
                                                {conv.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                                            title="Approve"
                                                            loading={approveMutation.isPending}
                                                            onClick={() => approveMutation.mutate(conv.id)}
                                                        >
                                                            <Check size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                            title="Reject"
                                                            loading={rejectMutation.isPending}
                                                            onClick={() => rejectMutation.mutate(conv.id)}
                                                        >
                                                            <X size={16} />
                                                        </Button>
                                                    </>
                                                )}
                                                {conv.status === 'approved' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                        title="Execute"
                                                        loading={executeMutation.isPending}
                                                        onClick={() => executeMutation.mutate(conv.id)}
                                                    >
                                                        <Play size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modals */}
            <AssetPickerModal
                isOpen={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={handleAssetSelect}
            />

            {selectedAssetId && (
                <AssetConversionModal
                    opened={createModalOpen}
                    onClose={() => {
                        setCreateModalOpen(false);
                        setSelectedAssetId(null);
                    }}
                    assetId={selectedAssetId}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['conversions'] });
                    }}
                />
            )}
        </div>
    );
}
