// Assets Page - Pure Tailwind
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, RefreshCw, Upload, BarChart3 } from 'lucide-react';
import { assetApi } from '../api/assets';
import type { Asset, CreateAssetRequest } from '../api/assets';
import { api } from '../api/client';
import { AssetFormTailwind } from '../components/Assets/AssetFormTailwind';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge,
    ActionIcon,
    Pagination,
    Drawer,
    Modal,
    LoadingOverlay,
    useToast,
} from '../components/ui';

// Helper to flatten category tree
const flattenCategories = (nodes: any[], prefix = ''): any[] => {
    let result: any[] = [];
    nodes.forEach(node => {
        const fullPath = prefix ? `${prefix} > ${node.name}` : node.name;
        result.push({ ...node, full_path: fullPath });
        if (node.children && node.children.length > 0) {
            result = result.concat(flattenCategories(node.children, fullPath));
        }
    });
    return result;
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function Assets() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [roiAssetId, setRoiAssetId] = useState<string | null>(null);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', page, debouncedSearch],
        queryFn: () => assetApi.list({
            page,
            per_page: 15,
            query: debouncedSearch,
            status: undefined
        })
    });

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories-flat'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return flattenCategories(res.data);
        },
        staleTime: 5 * 60 * 1000
    });

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            try {
                const res = await api.get('/locations');
                return res.data;
            } catch {
                return [];
            }
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: assetApi.create,
        onSuccess: (data: any) => {
            const message = data.message || 'Asset created successfully';
            const isApproval = message.toLowerCase().includes('approval');
            success(message, isApproval ? 'Request Submitted' : 'Success');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setDrawerOpen(false);
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to create asset', 'Error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => assetApi.update(editingAsset!.id, data),
        onSuccess: () => {
            success('Asset updated successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setDrawerOpen(false);
            setEditingAsset(null);
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to update asset', 'Error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: assetApi.delete,
        onSuccess: () => {
            success('Asset deleted', 'Success');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        }
    });

    // Handlers
    const handleAddNew = useCallback(() => {
        setEditingAsset(null);
        setDrawerOpen(true);
    }, []);

    const handleEdit = useCallback((asset: Asset) => {
        setEditingAsset(asset);
        setDrawerOpen(true);
    }, []);

    const handleDelete = useCallback((id: string) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleFormSubmit = useCallback((values: CreateAssetRequest) => {
        if (editingAsset) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    }, [editingAsset, updateMutation, createMutation]);

    const totalPages = assetsData?.total_pages || 1;

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card padding="lg">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Asset Management</h1>
                        <p className="text-sm text-slate-400">Manage company assets, vehicles, and equipment</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                            />
                        </div>
                        <Button
                            variant="outline"
                            leftIcon={<Upload size={16} />}
                            onClick={() => setImportModalOpen(true)}
                        >
                            Import
                        </Button>
                        <Button
                            leftIcon={<Plus size={16} />}
                            onClick={handleAddNew}
                        >
                            Add Asset
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="relative">
                    <LoadingOverlay visible={assetsLoading} />
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Asset Code</TableTh>
                                <TableTh>Name</TableTh>
                                <TableTh>Location</TableTh>
                                <TableTh>Department</TableTh>
                                <TableTh>Brand/Model</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh align="center">Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assetsData?.data?.map((asset: any) => (
                                <TableRow key={asset.id}>
                                    <TableTd>
                                        <span className="font-medium text-white">{asset.asset_code}</span>
                                    </TableTd>
                                    <TableTd>{asset.name}</TableTd>
                                    <TableTd>{asset.location_name || '-'}</TableTd>
                                    <TableTd>{asset.department || '-'}</TableTd>
                                    <TableTd>
                                        {asset.brand} {asset.model}
                                    </TableTd>
                                    <TableTd>
                                        <StatusBadge status={asset.status || 'active'} />
                                    </TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ActionIcon
                                                variant="success"
                                                onClick={() => setRoiAssetId(asset.id)}
                                                title="Asset ROI & Profitability"
                                            >
                                                <BarChart3 size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                onClick={() => navigate(`/assets/${asset.id}/lifecycle`)}
                                                title="Manage Lifecycle"
                                            >
                                                <RefreshCw size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                onClick={() => handleEdit(asset)}
                                                title="Edit Asset"
                                            >
                                                <Edit size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="danger"
                                                onClick={() => handleDelete(asset.id)}
                                                title="Delete Asset"
                                            >
                                                <Trash2 size={16} />
                                            </ActionIcon>
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))}
                            {(!assetsData?.data || assetsData.data.length === 0) && !assetsLoading && (
                                <TableEmpty colSpan={7} message="No assets found" />
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-end mt-4">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Asset Form Drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editingAsset ? `Edit Asset: ${editingAsset.asset_code}` : 'New Asset'}
                size="xl"
            >
                <AssetFormTailwind
                    initialValues={editingAsset}
                    categories={categories}
                    locations={locations}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setDrawerOpen(false)}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            </Drawer>

            {/* Import Modal - Using Mantine for now */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Assets"
                size="lg"
            >
                <div className="text-center py-8 text-slate-400">
                    <p>CSV Import feature coming soon.</p>
                    <p className="text-sm mt-2">Format: asset_code, name, category, location</p>
                </div>
            </Modal>

            {/* ROI Modal */}
            <Modal
                isOpen={!!roiAssetId}
                onClose={() => setRoiAssetId(null)}
                title="Asset Profitability Analysis (ROI)"
                size="full"
            >
                {roiAssetId && (
                    <div className="text-center py-8 text-slate-400">
                        <p>ROI Analysis for Asset ID: {roiAssetId}</p>
                        <p className="text-sm mt-2">Full ROI component will be migrated separately.</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
