import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, RefreshCw, Upload, Eye, Package, CheckCircle, Wrench, Clock, FileText } from 'lucide-react';
import { assetApi } from '../api/assets';
import type { Asset, CreateAssetRequest } from '../api/assets';
import { api } from '../api/http';
import { AssetForm } from '../components/Assets/AssetForm';
import { ImportAssetsModal } from '../components/Assets/ImportAssetsModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge,
    ActionIcon,
    Pagination,
    Modal,
    useToast,
    TableSkeleton,
    MultiSelect,
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

    const [searchParams] = useSearchParams();
    const statusFilter = searchParams.get('status');

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', page, debouncedSearch, statusFilter],
        queryFn: () => assetApi.list({
            page,
            per_page: 15,
            query: debouncedSearch,
            status: statusFilter || undefined
        })
    });

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories-flat'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            // Backend returns { data: [...] }
            const treeData = res.data.data || res.data;
            return flattenCategories(Array.isArray(treeData) ? treeData : []);
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
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to delete asset. It might be in use.', 'Error');
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

    // Fetch Dashboard Stats
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: assetApi.getDashboardStats,
        staleTime: 30000
    });

    const totalPages = assetsData?.total_pages || 1;

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Asset Management</h1>
                    <p className="text-gray-400 mt-2">Manage company assets, vehicles, and equipment</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<FileText size={18} />}
                        onClick={async () => {
                            try {
                                const response = await api.get('/reports/assets/pdf', {
                                    responseType: 'blob'
                                });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `Asset_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                success('PDF Export downloaded successfully', 'Export Complete');
                            } catch (error: any) {
                                let errorMessage = 'Export Error';
                                if (error.response && error.response.data instanceof Blob) {
                                    try {
                                        const text = await error.response.data.text();
                                        const json = JSON.parse(text);
                                        errorMessage = json.error || errorMessage;
                                    } catch (e) { }
                                }
                                showError(errorMessage, 'Failed to export PDF');
                            }
                        }}
                        className="rounded-xl"
                    >
                        Export PDF
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Upload size={18} />}
                        onClick={() => setImportModalOpen(true)}
                        className="rounded-xl"
                    >
                        Import
                    </Button>
                    <Button
                        leftIcon={<Plus size={20} />}
                        onClick={handleAddNew}
                        className="rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        Add Asset
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Total Assets</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {stats?.assets?.total || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Package className="text-blue-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Active Assets</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {/* Sum of active statuses */}
                                {stats?.assets?.by_status?.filter((s: any) =>
                                    ['available', 'in_use', 'deployed', 'InInventory'].includes(s.status)
                                ).reduce((acc: number, curr: any) => acc + curr.count, 0) || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-xl">
                            <CheckCircle className="text-green-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Maintenance</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {stats?.maintenance?.pending || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-xl">
                            <Wrench className="text-amber-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Planning</p>
                            <h3 className="text-3xl font-bold text-white mt-1">
                                {stats?.assets?.by_status?.find((s: any) => s.status === 'planning')?.count || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-cyan-500/20 rounded-xl">
                            <Clock className="text-cyan-400" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0">
                {/* Search & Filters Bar */}
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/30">
                    <div className="relative w-full sm:w-96">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                    </div>

                    <div className="w-full sm:w-auto min-w-[200px]">
                        <MultiSelect
                            placeholder="Filter Status..."
                            options={[
                                { value: 'active', label: 'Active (All Operational)' },
                                { value: 'planning', label: 'Planning' },
                                { value: 'procurement', label: 'Procurement' },
                                { value: 'received', label: 'Received' },
                                { value: 'in_inventory', label: 'In Inventory' },
                                { value: 'deployed', label: 'Deployed' },
                                { value: 'rented_out', label: 'Rented Out' },
                                { value: 'under_maintenance', label: 'Under Maintenance' },
                                { value: 'under_repair', label: 'Under Repair' },
                                { value: 'under_conversion', label: 'Under Conversion' },
                                { value: 'retired', label: 'Retired' },
                                { value: 'disposed', label: 'Disposed' },
                                { value: 'lost_stolen', label: 'Lost/Stolen' },
                                { value: 'archived', label: 'Archived' },
                            ]}
                            value={statusFilter ? statusFilter.split(',') : []}
                            onChange={(values) => {
                                const newParams = new URLSearchParams(searchParams);
                                if (values.length === 0) {
                                    newParams.delete('status');
                                } else {
                                    newParams.set('status', values.join(','));
                                }
                                navigate(`?${newParams.toString()}`);
                            }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="relative">
                    {assetsLoading ? (
                        <div className="p-4">
                            <TableSkeleton rows={10} cols={7} />
                        </div>
                    ) : (
                        <Table className="border-none rounded-none shadow-none">
                            <TableHead>
                                <TableRow className="bg-gray-900/50 border-white/5">
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
                                    <TableRow key={asset.id} className="hover:bg-gray-700/30 border-white/5 group transition-all">
                                        <TableTd>
                                            <span className="font-mono text-sm text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                                                {asset.asset_code}
                                            </span>
                                        </TableTd>
                                        <TableTd className="font-medium">{asset.name}</TableTd>
                                        <TableTd>{asset.location_name || '-'}</TableTd>
                                        <TableTd>{asset.department || '-'}</TableTd>
                                        <TableTd>
                                            <div className="text-sm">
                                                <span className="text-gray-200">{asset.brand}</span>
                                                <span className="text-gray-500 ml-1">{asset.model}</span>
                                            </div>
                                        </TableTd>
                                        <TableTd>
                                            <StatusBadge status={asset.status || 'active'} />
                                        </TableTd>
                                        <TableTd align="center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ActionIcon
                                                    onClick={() => navigate(`/assets/${asset.id}`)}
                                                    title="View Details"
                                                    className="hover:bg-blue-500/20 text-blue-400"
                                                >
                                                    <Eye size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    onClick={() => navigate(`/assets/${asset.id}/lifecycle`)}
                                                    title="Manage Lifecycle"
                                                    className="hover:bg-emerald-500/20 text-emerald-400"
                                                >
                                                    <RefreshCw size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    onClick={() => handleEdit(asset)}
                                                    title="Edit Asset"
                                                    className="hover:bg-amber-500/20 text-amber-400"
                                                >
                                                    <Edit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="danger"
                                                    onClick={() => handleDelete(asset.id)}
                                                    title="Delete Asset"
                                                    className="hover:bg-red-500/20 text-red-400"
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
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-white/5 bg-gray-900/20">
                        <p className="text-sm text-gray-500">
                            Showing <span className="text-gray-300">{assetsData?.data?.length || 0}</span> of <span className="text-gray-300">{assetsData?.total || 0}</span> assets
                        </p>
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Asset Form Modal */}
            <Modal
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editingAsset ? `Edit Asset: ${editingAsset.asset_code}` : 'New Asset'}
                size="4xl"
            >
                <AssetForm
                    initialValues={editingAsset}
                    categories={categories}
                    locations={locations}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setDrawerOpen(false)}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            </Modal>

            {/* Import Modal */}
            <ImportAssetsModal
                opened={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['assets'] });
                    setImportModalOpen(false);
                }}
                categories={categories}
                locations={locations}
            />
        </div>
    );
}
