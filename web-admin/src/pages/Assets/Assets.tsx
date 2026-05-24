import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, RefreshCw, Upload, Eye, Package, CheckCircle, Wrench, Clock, FileText, ArrowUp, ArrowDown, Filter, RotateCcw, LayoutGrid, List } from 'lucide-react';
import { assetApi } from '../../api/assets';
import { categoryApi } from '../../api/category';
import { locationApi } from '../../api/locations';
import { departmentApi } from '../../api/departments';
import type { Asset, CreateAssetRequest } from '../../api/assets';
import { api } from '../../api/http';
import { AssetForm } from '../../components/Assets/AssetForm';
import { ImportAssetsModal } from '../../components/Assets/ImportAssetsModal';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
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
    GlobalSearch,
    Drawer,
    Checkbox,
    Select,
} from '../../components/ui';
import { BulkActionToolbar } from '../../components/Assets/BulkActionToolbar';
import { AssetPreviewModal } from '../../components/Assets/AssetPreviewModal';

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


export default function Assets() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { success, error: showError } = useToast();
    const { user } = useAuthStore();

    const allowedGroup = user?.role === 'admin_alat_berat' ? 'ALAT_BERAT' : user?.role === 'admin_kendaraan' ? 'KENDARAAN' : user?.role === 'admin_infrastruktur' ? 'INFRASTRUKTUR' : null;

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [locationFilter, setLocationFilter] = useState<string | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
    const [exactMatch, setExactMatch] = useState(false);
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    const [bulkActionType, setBulkActionType] = useState<'status' | 'location' | 'department' | null>(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkValue, setBulkValue] = useState<string>('');
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', page, search, statusFilter, categoryFilter, locationFilter, departmentFilter, exactMatch, sortBy, sortOrder],
        queryFn: () => assetApi.list({
            page,
            per_page: 15,
            query: search,
            status: statusFilter || undefined,
            category_id: categoryFilter || undefined,
            location_id: locationFilter || undefined,
            department: departmentFilter || undefined,
            exact_match: exactMatch,
            sort_by: sortBy || undefined,
            sort_order: sortOrder || undefined,
        })
    });

    // Fetch Categories for filters (flat list)
    const { data: filterCategories = [] } = useQuery({
        queryKey: ['categories-flat-for-filter'],
        queryFn: async () => {
            const res = await categoryApi.list();
            if (!allowedGroup) return res;
            return res.filter(c => c.asset_group === allowedGroup);
        },
        staleTime: 5 * 60 * 1000
    });

    // Fetch Locations for filters (flat list)
    const { data: filterLocations = [] } = useQuery({
        queryKey: ['locations-for-filter'],
        queryFn: locationApi.list,
        staleTime: 5 * 60 * 1000
    });

    // Fetch Departments for filters (flat list)
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentApi.list,
        staleTime: 5 * 60 * 1000
    });

    // Fetch Categories for forms (tree structure)
    const { data: categories = [] } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            // Backend returns { data: [...] }
            const treeData = res.data.data || res.data;
            const flattened = flattenCategories(Array.isArray(treeData) ? treeData : []);
            if (!allowedGroup) return flattened;
            return flattened.filter(c => c.asset_group === allowedGroup);
        },
        staleTime: 5 * 60 * 1000
    });

    // Fetch Locations for forms (original fetch)
    const { data: locations = [] } = useQuery({
        queryKey: ['locations-original'],
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
        mutationFn: async (data: any) => {
            // Extract pending documents from the payload
            const { pending_documents, ...assetData } = data;

            // 1. Create Asset
            const newAsset = await assetApi.create(assetData);

            // 2. Upload Documents if any
            if (pending_documents && Array.isArray(pending_documents) && pending_documents.length > 0) {
                // We'll upload them sequentially to ensure reliability, paralleling might trigger rate limits or be messy
                // Ideally, show a toast or loading state for this.
                let uploadedCount = 0;

                for (const doc of pending_documents) {
                    try {
                        const fileData = await assetApi.uploadFile(doc.file);
                        await assetApi.addDocument(newAsset.id, {
                            name: doc.name || doc.file.name,
                            type: doc.type,
                            file_path: fileData.url,
                            mime_type: fileData.content_type,
                            size_bytes: fileData.size,
                            notes: doc.notes
                        });
                        uploadedCount++;
                    } catch (e) {
                        console.error(`Failed to upload document: ${doc.name}`, e);
                        // Continue to next document
                    }
                }

                // If we want to return something about the docs, we could attach it to the response
                // but the standard response is fine.
            }

            return newAsset;
        },
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
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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


    const toggleSelectAll = () => {
        if (selectedAssetIds.length === assetsData?.data.length) {
            setSelectedAssetIds([]);
        } else {
            setSelectedAssetIds(assetsData?.data.map((a: Asset) => a.id) || []);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedAssetIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkAction = async () => {
        if (!bulkActionType || !bulkValue) return;

        try {
            const payload: any = {
                asset_ids: selectedAssetIds,
            };

            if (bulkActionType === 'status') payload.status = bulkValue;
            if (bulkActionType === 'location') payload.location_id = bulkValue;
            if (bulkActionType === 'department') {
                payload.department = bulkValue;
            }

            await assetApi.bulkUpdate(payload);
            success(`${selectedAssetIds.length} assets updated successfully`);
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setSelectedAssetIds([]);
            setBulkModalOpen(false);
            setBulkValue('');
        } catch (err: any) {
            showError(err.response?.data?.error || 'Failed to update assets');
        }
    };

    // Sorting handler
    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return null;
        return sortOrder === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    };

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Asset Management</h1>
                    <p className="text-muted-foreground mt-2">Manage company assets, vehicles, and equipment</p>
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
                            <p className="text-muted-foreground text-sm font-medium">Total Assets</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
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
                            <p className="text-muted-foreground text-sm font-medium">In Use</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {/* Sum of in_use/deployed statuses */}
                                {stats?.assets?.by_status?.filter((s: any) =>
                                    ['in_use', 'deployed', 'active'].includes(s.status)
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
                            <p className="text-muted-foreground text-sm font-medium">Maintenance</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {stats?.assets?.by_status?.filter((s: any) =>
                                    ['under_maintenance', 'under_repair'].includes(s.status)
                                ).reduce((acc: number, curr: any) => acc + curr.count, 0) || 0}
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
                            <p className="text-muted-foreground text-sm font-medium">Rent Out</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {stats?.assets?.by_status?.find((s: any) => s.status === 'rented_out')?.count || 0}
                            </h3>
                        </div>
                        <div className="p-3 bg-cyan-500/20 rounded-xl">
                            <Clock className="text-cyan-400" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Active Filters Summary */}
            {(categoryFilter || locationFilter || departmentFilter || statusFilter || exactMatch) && (
                <div className="flex items-center gap-2 mb-4 px-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Filters:</span>
                    <div className="flex flex-wrap gap-2">
                        {categoryFilter && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">Category: {categoryFilter.split(',').length}</span>}
                        {locationFilter && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">Location: {locationFilter.split(',').length}</span>}
                        {departmentFilter && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Dept: {departmentFilter.split(',').length}</span>}
                        {statusFilter && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">Status: {statusFilter.split(',').length}</span>}
                        {exactMatch && <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">Exact Match</span>}
                        <button
                            onClick={() => {
                                setCategoryFilter(null);
                                setLocationFilter(null);
                                setDepartmentFilter(null);
                                setStatusFilter(null);
                                setExactMatch(false);
                                setSearch('');
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-2 transition-colors"
                        >
                            <RotateCcw size={12} /> Reset All
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0 border border-border">
                {/* Search & Filters Bar */}
                <div className="p-4 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/30">
                    <div className="flex items-center gap-4 flex-1 w-full">
                        <GlobalSearch
                            onSearch={setSearch}
                            initialValue={search}
                            className="w-full max-w-xl"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Grid View"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-primary/20 text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Table View"
                            >
                                <List size={18} />
                            </button>
                        </div>
                        <Button
                            variant="outline"
                            leftIcon={<Filter size={18} />}
                            onClick={() => setFilterDrawerOpen(true)}
                            className={`rounded-xl border-border/50 ${filterDrawerOpen ? 'bg-primary/10 border-primary/50 text-blue-400' : ''}`}
                        >
                            Filters {(categoryFilter || locationFilter || departmentFilter || statusFilter) ? `(${(categoryFilter?.split(',').length || 0) + (locationFilter?.split(',').length || 0) + (departmentFilter?.split(',').length || 0) + (statusFilter?.split(',').length || 0)})` : ''}
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative bg-muted/5">
                    {assetsLoading ? (
                        <div className="p-4">
                            {viewMode === 'table' ? <TableSkeleton rows={10} cols={7} /> : <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"><div className="h-64 bg-muted/50 rounded-2xl animate-pulse"></div><div className="h-64 bg-muted/50 rounded-2xl animate-pulse"></div><div className="h-64 bg-muted/50 rounded-2xl animate-pulse"></div><div className="h-64 bg-muted/50 rounded-2xl animate-pulse"></div></div>}
                        </div>
                    ) : (
                        <>
                            {viewMode === 'table' ? (
                                <Table className="border-none rounded-none shadow-none">
                                    <TableHead>
                                        <TableRow className="bg-muted/50 border-border">
                                            <TableTh className="w-10">
                                                <Checkbox
                                                    checked={selectedAssetIds.length > 0 && selectedAssetIds.length === assetsData?.data.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('asset_code')}>
                                                <div className="flex items-center">Asset Code <SortIcon field="asset_code" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('category_id')}>
                                                <div className="flex items-center">Category <SortIcon field="category_id" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                                                <div className="flex items-center">Name <SortIcon field="name" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('brand')}>
                                                <div className="flex items-center">Brand/Model <SortIcon field="brand" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('location_id')}>
                                                <div className="flex items-center">Location <SortIcon field="location_id" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('department_id')}>
                                                <div className="flex items-center">Department <SortIcon field="department_id" /></div>
                                            </TableTh>
                                            <TableTh className="cursor-pointer hover:text-foreground" onClick={() => handleSort('status')}>
                                                <div className="flex items-center">Status <SortIcon field="status" /></div>
                                            </TableTh>
                                            <TableTh align="center">Actions</TableTh>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {assetsData?.data?.map((asset: any) => (
                                            <TableRow key={asset.id} className={`${selectedAssetIds.includes(asset.id) ? 'bg-primary/10' : 'hover:bg-muted/50'} border-border group transition-all`}>
                                                <TableTd>
                                                    <Checkbox
                                                        checked={selectedAssetIds.includes(asset.id)}
                                                        onChange={() => toggleSelect(asset.id)}
                                                    />
                                                </TableTd>
                                                <TableTd>
                                                    <span 
                                                        onClick={() => {
                                                            setPreviewAsset(asset);
                                                            setIsPreviewOpen(true);
                                                        }}
                                                        className="font-mono text-sm text-blue-400 font-medium group-hover:text-blue-300 transition-colors cursor-pointer hover:underline"
                                                    >
                                                        {asset.asset_code}
                                                    </span>
                                                </TableTd>
                                                <TableTd>{asset.category_name || '-'}</TableTd>
                                                <TableTd>
                                                    <span 
                                                        onClick={() => {
                                                            setPreviewAsset(asset);
                                                            setIsPreviewOpen(true);
                                                        }}
                                                        className="font-medium cursor-pointer hover:text-blue-400 transition-colors hover:underline truncate max-w-[150px] inline-block"
                                                    >
                                                        {asset.name}
                                                    </span>
                                                </TableTd>
                                                <TableTd>
                                                    <div className="text-sm truncate max-w-[120px]">
                                                        <span className="text-foreground">{asset.brand}</span>
                                                        <span className="text-muted-foreground ml-1">{asset.model}</span>
                                                    </div>
                                                </TableTd>
                                                <TableTd className="truncate max-w-[120px]">{asset.location_name || '-'}</TableTd>
                                                <TableTd className="truncate max-w-[120px]">{asset.department || '-'}</TableTd>
                                                <TableTd>
                                                    <StatusBadge status={asset.status || 'active'} />
                                                </TableTd>
                                                <TableTd align="center">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ActionIcon
                                                            onClick={() => {
                                                                setPreviewAsset(asset);
                                                                setIsPreviewOpen(true);
                                                            }}
                                                            title="Quick Preview"
                                                            className="hover:bg-cyan-500/20 text-cyan-400"
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
                                            <TableEmpty colSpan={9} message="No assets found" />
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {assetsData?.data?.map((asset: any) => {
                                        const imageUrl = asset.photos?.front || asset.photos?.left || asset.photos?.right || asset.photos?.back || null;
                                        const displayUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL || '/api'}${imageUrl}`) : null;
                                        
                                        return (
                                            <div key={asset.id} className="group bg-card/60 backdrop-blur-xl border border-border rounded-3xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all duration-300 relative flex flex-col min-h-[340px]">
                                                <div className="absolute top-3 left-3 z-20">
                                                    <Checkbox
                                                        checked={selectedAssetIds.includes(asset.id)}
                                                        onChange={() => toggleSelect(asset.id)}
                                                        className="bg-black/40 backdrop-blur-md border-white/20"
                                                    />
                                                </div>
                                                <div className="absolute top-3 right-3 z-20">
                                                    <StatusBadge status={asset.status || 'active'} className="shadow-lg backdrop-blur-md bg-background/80" />
                                                </div>
                                                
                                                <div className="h-48 w-full bg-slate-900 flex items-center justify-center relative overflow-hidden cursor-pointer" onClick={() => {
                                                    setPreviewAsset(asset);
                                                    setIsPreviewOpen(true);
                                                }}>
                                                    {displayUrl ? (
                                                        <img src={displayUrl} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-slate-600 group-hover:text-blue-400 transition-colors">
                                                            <Package size={48} className="mb-2 opacity-50" />
                                                            <span className="text-xs font-semibold uppercase tracking-widest opacity-50">No Photo</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                                                    <div className="absolute bottom-3 left-4 right-4">
                                                        <p className="text-white font-bold truncate text-lg shadow-sm">{asset.name}</p>
                                                        <p className="text-cyan-400 font-mono text-xs font-bold tracking-wider">{asset.asset_code}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="p-5 flex-1 flex flex-col justify-between">
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">Category</p>
                                                                <p className="text-foreground truncate">{asset.category_name || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">Brand/Model</p>
                                                                <p className="text-foreground truncate">{asset.brand || '-'} {asset.model}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">Location</p>
                                                                <p className="text-foreground truncate">{asset.location_name || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">Department</p>
                                                                <p className="text-foreground truncate">{asset.department || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                                                        <div className="flex items-center gap-2 max-w-[50%]">
                                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 font-bold border border-blue-500/30 flex-shrink-0">
                                                                {asset.assigned_to_name?.charAt(0) || '?'}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground truncate" title={asset.assigned_to_name}>{asset.assigned_to_name || 'Unassigned'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <ActionIcon onClick={() => { setPreviewAsset(asset); setIsPreviewOpen(true); }} className="hover:bg-cyan-500/20 text-cyan-400 w-8 h-8"><Eye size={14} /></ActionIcon>
                                                            <ActionIcon onClick={() => navigate(`/assets/${asset.id}/lifecycle`)} className="hover:bg-emerald-500/20 text-emerald-400 w-8 h-8"><RefreshCw size={14} /></ActionIcon>
                                                            <ActionIcon onClick={() => handleEdit(asset)} className="hover:bg-amber-500/20 text-amber-400 w-8 h-8"><Edit size={14} /></ActionIcon>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!assetsData?.data || assetsData.data.length === 0) && !assetsLoading && (
                                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 bg-muted/20 rounded-3xl border border-dashed border-border">
                                            <Package size={48} className="mb-4 opacity-30" />
                                            <p className="text-lg font-medium">No assets found</p>
                                            <p className="text-sm opacity-60">Try adjusting your filters or search terms</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
                </div>

                {/* Pagination */}
                {assetsData?.total_pages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-border bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="text-foreground">{assetsData?.data?.length || 0}</span> of <span className="text-foreground">{assetsData?.total || 0}</span> assets
                        </p>
                        <Pagination
                            currentPage={page}
                            totalPages={assetsData?.total_pages}
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
            {/* Advanced Filters Drawer */}
            <Drawer
                isOpen={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                title="Advanced Filters"
                size="md"
            >
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Search Mode</label>
                        <Checkbox
                            label="Exact Match Only"
                            checked={exactMatch}
                            onChange={(e) => setExactMatch(e.target.checked)}
                            className="bg-muted/50 p-3 rounded-xl border border-border/50"
                        />
                        <p className="text-xs text-muted-foreground px-1 italic">When enabled, only assets with IDs or Codes exactly matching the query will be returned.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Categories</label>
                        <MultiSelect
                            placeholder="Select categories..."
                            options={filterCategories.map((c: any) => ({ value: c.id, label: c.name }))}
                            value={categoryFilter ? categoryFilter.split(',') : []}
                            onChange={(values) => setCategoryFilter(values.length ? values.join(',') : null)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Locations</label>
                        <MultiSelect
                            placeholder="Select locations..."
                            options={filterLocations.map((l: any) => ({ value: l.id, label: l.name }))}
                            value={locationFilter ? locationFilter.split(',') : []}
                            onChange={(values) => setLocationFilter(values.length ? values.join(',') : null)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Departments</label>
                        <MultiSelect
                            placeholder="Select departments..."
                            options={departments.map((d: any) => ({ value: d.name, label: d.name }))}
                            value={departmentFilter ? departmentFilter.split(',') : []}
                            onChange={(values) => setDepartmentFilter(values.length ? values.join(',') : null)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Asset Status</label>
                        <MultiSelect
                            placeholder="Select statuses..."
                            options={[
                                { value: 'active', label: 'Active (Functional)' },
                                { value: 'planning', label: 'Planning' },
                                { value: 'procurement', label: 'Procurement' },
                                { value: 'received', label: 'Received' },
                                { value: 'in_inventory', label: 'In Inventory' },
                                { value: 'in_use', label: 'In Use' },
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
                            onChange={(values) => setStatusFilter(values.length ? values.join(',') : null)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            className="flex-1 rounded-xl"
                            onClick={() => setFilterDrawerOpen(false)}
                        >
                            Apply Filters
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-border/50"
                            onClick={() => {
                                setCategoryFilter(null);
                                setLocationFilter(null);
                                setDepartmentFilter(null);
                                setStatusFilter(null);
                                setExactMatch(false);
                            }}
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </Drawer>

            <ImportAssetsModal
                opened={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['assets'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                    setImportModalOpen(false);
                }}
                categories={categories}
                locations={locations}
            />

            <BulkActionToolbar
                selectedCount={selectedAssetIds.length}
                onClear={() => setSelectedAssetIds([])}
                onAction={(type) => {
                    if (type === 'delete') {
                        if (window.confirm(`Are you sure you want to archive ${selectedAssetIds.length} assets?`)) {
                            // Implement bulk delete if needed later
                            success(`${selectedAssetIds.length} assets archived`);
                            setSelectedAssetIds([]);
                        }
                    } else {
                        setBulkActionType(type);
                        setBulkModalOpen(true);
                        setBulkValue('');
                    }
                }}
            />

            <Modal
                isOpen={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                title={`Bulk Update ${bulkActionType?.charAt(0).toUpperCase()}${bulkActionType?.slice(1)}`}
                size="sm"
            >
                <div className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Updating <span className="text-foreground font-bold">{selectedAssetIds.length}</span> assets.
                    </p>

                    {bulkActionType === 'status' && (
                        <Select
                            label="New Status"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'in_inventory', label: 'In Inventory' },
                                { value: 'in_use', label: 'In Use' },
                                { value: 'under_maintenance', label: 'Under Maintenance' },
                                { value: 'retired', label: 'Retired' },
                            ]}
                            value={bulkValue}
                            onChange={(val) => setBulkValue(val)}
                        />
                    )}

                    {bulkActionType === 'location' && (
                        <Select
                            label="New Location"
                            options={filterLocations.map((l: any) => ({ value: l.id, label: l.name }))}
                            value={bulkValue}
                            onChange={(val) => setBulkValue(val)}
                        />
                    )}

                    {bulkActionType === 'department' && (
                        <Select
                            label="New Department"
                            options={departments.map((d: any) => ({ value: d.name, label: d.name }))}
                            value={bulkValue}
                            onChange={(val) => setBulkValue(val)}
                        />
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button
                            className="flex-1 rounded-xl h-11"
                            onClick={handleBulkAction}
                            disabled={!bulkValue}
                        >
                            Apply to All
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-border/50 h-11"
                            onClick={() => setBulkModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            <AssetPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                asset={previewAsset}
            />
        </div>
    );
}

