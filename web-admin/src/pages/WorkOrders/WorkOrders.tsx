// WorkOrders Page - Pure Tailwind
// Work Order Management Page
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, AlertTriangle, Wrench, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../../api/work-order';
import type { WorkOrder } from '../../api/work-order';
import { WorkOrderForm } from '../../components/WorkOrders/WorkOrderForm';
import { PermissionGate } from '../../components/PermissionGate';
import { useWebSocket } from '../../contexts/WebSocketContext';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge,
    ActionIcon,
    Pagination,
    Modal,
    useToast,
    Tabs,
    TabsList,
    TabsTrigger,
    TableSkeleton,
} from '../../components/ui';

export default function WorkOrders() {
    const [page, setPage] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    const queryClient = useQueryClient();
    const navigate = useNavigate();
    // Read URL params for pre-filling form
    const [searchParams] = useSearchParams();
    const assetIdParam = searchParams.get('asset_id');
    const woTypeParam = searchParams.get('wo_type');

    useEffect(() => {
        if (assetIdParam) {
            setDrawerOpen(true);
        }
    }, [assetIdParam]);
    const { lastMessage } = useWebSocket();
    const { success } = useToast();

    useEffect(() => {
        if (lastMessage && (lastMessage.event_type === 'WORK_ORDER_CREATED' || lastMessage.event_type === 'WORK_ORDER_COMPLETED')) {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        }
    }, [lastMessage, queryClient]);

    // Fetch Work Orders
    const { data: workOrdersData, isLoading } = useQuery({
        queryKey: ['work-orders', page, activeTab],
        queryFn: async () => {
            if (activeTab === 'overdue') {
                return await workOrderApi.listOverdue();
            }
            return await workOrderApi.list({ page, per_page: 20 });
        },
    });

    const records: WorkOrder[] = (workOrdersData as any) || [];
    const totalPages = 1; // TODO: Backend pagination support

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: workOrderApi.delete,
        onSuccess: () => {
            success('Work Order deleted (cancelled)', 'Deleted');
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        },
    });

    const handleEdit = (id: string) => {
        setSelectedId(id);
        setDrawerOpen(true);
    };

    const handleCreate = () => {
        setSelectedId(null);
        setDrawerOpen(true);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this Work Order?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Work Orders</h1>
                    <p className="text-muted-foreground mt-2">Manage maintenance, repairs, and service schedules</p>
                </div>
                <div className="flex gap-3">
                    <PermissionGate requiredLevel={3}>
                        <Button
                            leftIcon={<Plus size={20} />}
                            onClick={handleCreate}
                            className="rounded-xl shadow-lg shadow-blue-500/20"
                        >
                            New Work Order
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Active & Planned</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {records.filter(r => r.status !== 'completed').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <Wrench className="text-blue-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Overdue</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {records.filter(r => r.status === 'overdue').length || (activeTab === 'overdue' ? records.length : 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-xl">
                            <AlertCircle className="text-red-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">In Progress</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {records.filter(r => r.status === 'in_progress').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-xl">
                            <Clock className="text-amber-400" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Completed</p>
                            <h3 className="text-3xl font-bold text-card-foreground mt-1">
                                {records.filter(r => r.status === 'completed').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-500/20 rounded-xl">
                            <CheckCircle className="text-green-400" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0 border border-border">
                {/* Tabs Bar */}
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-0">
                        <TabsList className="bg-muted">
                            <TabsTrigger value="active" className="px-6">Active & Planned</TabsTrigger>
                            <TabsTrigger value="overdue" icon={<AlertTriangle size={14} className="text-red-400" />} className="px-6">
                                Overdue
                            </TabsTrigger>
                            <TabsTrigger value="history" className="px-6">History</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Table */}
                <div className="relative">
                    <Table className="border-none rounded-none shadow-none">
                        <TableHead>
                            <TableRow className="bg-muted/50 border-border">
                                <TableTh>Asset</TableTh>
                                <TableTh>Type</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh>Scheduled</TableTh>
                                <TableTh>Cost</TableTh>
                                <TableTh align="center">Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableTd colSpan={6} className="p-0">
                                        <div className="p-4"><TableSkeleton rows={5} cols={6} /></div>
                                    </TableTd>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableEmpty colSpan={6} message="No work orders found" />
                            ) : (
                                records.map((record: any) => (
                                    <TableRow
                                        key={record.id}
                                        onClick={() => navigate(`/work-orders/${record.id}`)}
                                        className="hover:bg-muted/50 border-border group transition-all cursor-pointer"
                                    >
                                        <TableTd>
                                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                {record.asset_name || record.asset?.name || record.asset_id}
                                            </span>
                                        </TableTd>
                                        <TableTd className="capitalize">{record.wo_type}</TableTd>
                                        <TableTd>
                                            <StatusBadge status={record.status} />
                                        </TableTd>
                                        <TableTd className="text-muted-foreground">{record.scheduled_date}</TableTd>
                                        <TableTd className="font-medium text-foreground">
                                            {record.status === 'completed' && record.actual_cost
                                                ? `Rp ${Number(record.actual_cost).toLocaleString('id-ID')}`
                                                : record.estimated_cost
                                                    ? `Rp ${Number(record.estimated_cost).toLocaleString('id-ID')}`
                                                    : '-'}
                                        </TableTd>
                                        <TableTd align="center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <PermissionGate requiredLevel={3}>
                                                    <ActionIcon
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(record.id); }}
                                                        title="Edit Work Order"
                                                        className="hover:bg-amber-500/20 text-amber-400"
                                                    >
                                                        <Edit size={16} />
                                                    </ActionIcon>
                                                </PermissionGate>
                                                <PermissionGate requiredLevel={2}>
                                                    <ActionIcon
                                                        variant="danger"
                                                        onClick={(e) => handleDelete(record.id, e)}
                                                        title="Delete Work Order"
                                                        className="hover:bg-red-500/20 text-red-400"
                                                    >
                                                        <Trash2 size={16} />
                                                    </ActionIcon>
                                                </PermissionGate>
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {activeTab !== 'overdue' && totalPages > 1 && (
                    <div className="flex justify-center p-4 border-t border-border bg-muted/20">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Work Order Form Modal */}
            <Modal
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedId ? "Edit Work Order" : "New Work Order"}
                size="3xl"
            >
                {drawerOpen && (
                    <WorkOrderForm
                        maintenanceId={selectedId}
                        initialAssetId={assetIdParam}
                        initialType={woTypeParam}
                        onClose={() => setDrawerOpen(false)}
                        onSuccess={() => {
                            setDrawerOpen(false);
                            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
                        }}
                    />
                )}
            </Modal>
        </div>
    );
}
