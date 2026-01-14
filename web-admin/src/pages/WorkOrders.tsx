// WorkOrders Page - Pure Tailwind
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../api/work-order';
import type { WorkOrder } from '../api/work-order';
import { WorkOrderFormTailwind } from '../components/WorkOrders/WorkOrderFormTailwind';
import { PermissionGate } from '../components/PermissionGate';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge,
    ActionIcon,
    Pagination,
    Drawer,
    useToast,
} from '../components/ui';

export function WorkOrders() {
    const [page, setPage] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    const queryClient = useQueryClient();
    const navigate = useNavigate();
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

    // Tab content wrapper to handle active state
    const TabButton = ({ value, children, icon }: { value: string; children: React.ReactNode; icon?: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(value)}
            className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === value
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
            `}
        >
            {icon}
            {children}
        </button>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Work Orders</h1>
                <PermissionGate requiredLevel={3}>
                    <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>
                        New Work Order
                    </Button>
                </PermissionGate>
            </div>

            <Card padding="lg">
                {/* Tab Navigation */}
                <div className="flex gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-xl mb-4 w-fit">
                    <TabButton value="active">Active & Planned</TabButton>
                    <TabButton value="overdue" icon={<AlertTriangle size={14} className="text-red-400" />}>
                        Overdue
                    </TabButton>
                    <TabButton value="history">History</TabButton>
                </div>

                {/* Table */}
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Asset</TableTh>
                            <TableTh>Type</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh>Approval</TableTh>
                            <TableTh>Scheduled</TableTh>
                            <TableTh>Cost</TableTh>
                            <TableTh align="center">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableTd colSpan={7} align="center">
                                    <div className="py-8 text-slate-400">Loading...</div>
                                </TableTd>
                            </TableRow>
                        ) : records.length === 0 ? (
                            <TableEmpty colSpan={7} message="No work orders found" />
                        ) : (
                            records.map((record: any) => (
                                <TableRow
                                    key={record.id}
                                    onClick={() => navigate(`/work-orders/${record.id}`)}
                                    className="cursor-pointer"
                                >
                                    <TableTd>
                                        <span className="font-medium text-white">
                                            {record.asset?.name || record.asset_id}
                                        </span>
                                    </TableTd>
                                    <TableTd>{record.wo_type}</TableTd>
                                    <TableTd>
                                        <StatusBadge status={record.status} />
                                    </TableTd>
                                    <TableTd>
                                        <StatusBadge status="-" />
                                    </TableTd>
                                    <TableTd>{record.scheduled_date}</TableTd>
                                    <TableTd>
                                        {record.estimated_cost
                                            ? `Rp ${Number(record.estimated_cost).toLocaleString('id-ID')}`
                                            : '-'}
                                    </TableTd>
                                    <TableTd align="center">
                                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <PermissionGate requiredLevel={3}>
                                                <ActionIcon
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(record.id); }}
                                                    title="Edit Work Order"
                                                >
                                                    <Edit size={16} />
                                                </ActionIcon>
                                            </PermissionGate>
                                            <PermissionGate requiredLevel={2}>
                                                <ActionIcon
                                                    variant="danger"
                                                    onClick={(e) => handleDelete(record.id, e)}
                                                    title="Delete Work Order"
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

                {/* Pagination */}
                {activeTab !== 'overdue' && totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>

            {/* Work Order Form Drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedId ? "Edit Work Order" : "New Work Order"}
                size="lg"
            >
                {drawerOpen && (
                    <WorkOrderFormTailwind
                        maintenanceId={selectedId}
                        onClose={() => setDrawerOpen(false)}
                        onSuccess={() => {
                            setDrawerOpen(false);
                            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
                        }}
                    />
                )}
            </Drawer>
        </div>
    );
}
