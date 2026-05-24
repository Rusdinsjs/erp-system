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
            <Card className="overflow-hidden p-0 border border-border bg-card/60 backdrop-blur-xl shadow-2xl rounded-3xl">
                {/* Tabs Bar */}
                <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex justify-between items-center backdrop-blur-md">
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

                {/* Kanban Board Area */}
                <div className="relative bg-background/50 p-6 min-h-[600px] overflow-x-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex gap-6 h-[500px]">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="min-w-[320px] bg-card/20 rounded-3xl p-4 border border-border/50">
                                    <div className="h-6 w-24 bg-muted animate-pulse rounded mb-4"></div>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(j => (
                                            <div key={j} className="h-32 bg-muted animate-pulse rounded-2xl"></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <div className="p-6 bg-muted/20 rounded-full mb-4">
                                <Wrench size={48} className="opacity-20" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-widest opacity-50">No work orders found in this view</p>
                            <Button variant="secondary" onClick={handleCreate} className="mt-4 rounded-xl px-8">Create New Ticket</Button>
                        </div>
                    ) : activeTab === 'history' || activeTab === 'overdue' ? (
                        /* Fallback to Table for History/Overdue for density */
                        <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden">
                            <table className="w-full text-left text-sm text-foreground/80 border-separate border-spacing-0">
                                <thead className="bg-card/90 sticky top-0 z-20 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Ticket Ref</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Asset Info</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Scheduled</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {records.map((record: any) => (
                                        <tr key={record.id} onClick={() => navigate(`/work-orders/${record.id}`)} className="group cursor-pointer hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-primary">#{record.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 font-medium">{record.asset_name || record.asset?.name || record.asset_id}</td>
                                            <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                                            <td className="px-6 py-4 text-muted-foreground">{record.scheduled_date}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ActionIcon onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${record.id}`); }} variant="default" className="rounded-xl hover:bg-primary/20 hover:text-primary w-10 h-10 border border-border"><Edit size={16} /></ActionIcon>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Kanban Board View for Active & Planned */
                        <div className="flex gap-6 h-full items-start">
                            {[
                                { title: 'Pending Approval', status: 'pending', color: 'slate', icon: AlertTriangle, borderClass: 'border-slate-500/10', bgHeader: 'bg-slate-500/5', borderHeader: 'border-slate-500/20', bgIcon: 'bg-slate-500/20', textIcon: 'text-slate-500', bgCount: 'bg-slate-500/20', textCount: 'text-slate-500', hoverBorder: 'hover:border-slate-500/50', ribbon: 'bg-slate-500/30 group-hover:bg-slate-500', hoverIconBg: 'hover:bg-slate-500' },
                                { title: 'Assigned / Ready', status: 'approved', color: 'blue', icon: Clock, borderClass: 'border-blue-500/10', bgHeader: 'bg-blue-500/5', borderHeader: 'border-blue-500/20', bgIcon: 'bg-blue-500/20', textIcon: 'text-blue-500', bgCount: 'bg-blue-500/20', textCount: 'text-blue-500', hoverBorder: 'hover:border-blue-500/50', ribbon: 'bg-blue-500/30 group-hover:bg-blue-500', hoverIconBg: 'hover:bg-blue-500' },
                                { title: 'In Progress', status: 'in_progress', color: 'amber', icon: Wrench, borderClass: 'border-amber-500/10', bgHeader: 'bg-amber-500/5', borderHeader: 'border-amber-500/20', bgIcon: 'bg-amber-500/20', textIcon: 'text-amber-500', bgCount: 'bg-amber-500/20', textCount: 'text-amber-500', hoverBorder: 'hover:border-amber-500/50', ribbon: 'bg-amber-500/30 group-hover:bg-amber-500', hoverIconBg: 'hover:bg-amber-500' },
                                { title: 'Review / Done', status: ['completed', 'verified', 'finalized'], color: 'emerald', icon: CheckCircle, borderClass: 'border-emerald-500/10', bgHeader: 'bg-emerald-500/5', borderHeader: 'border-emerald-500/20', bgIcon: 'bg-emerald-500/20', textIcon: 'text-emerald-500', bgCount: 'bg-emerald-500/20', textCount: 'text-emerald-500', hoverBorder: 'hover:border-emerald-500/50', ribbon: 'bg-emerald-500/30 group-hover:bg-emerald-500', hoverIconBg: 'hover:bg-emerald-500' }
                            ].map((col) => {
                                const colRecords = records.filter(r => 
                                    Array.isArray(col.status) ? col.status.includes(r.status) : r.status === col.status
                                );
                                
                                return (
                                    <div key={col.title} className={`flex flex-col min-w-[340px] max-w-[340px] bg-card/40 backdrop-blur-xl rounded-[2rem] border ${col.borderClass} overflow-hidden flex-shrink-0 shadow-xl`}>
                                        {/* Column Header */}
                                        <div className={`p-5 border-b ${col.borderHeader} ${col.bgHeader} flex justify-between items-center sticky top-0 z-10 backdrop-blur-md`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${col.bgIcon} ${col.textIcon}`}>
                                                    <col.icon size={18} />
                                                </div>
                                                <h3 className="font-bold text-foreground text-sm uppercase tracking-widest">{col.title}</h3>
                                            </div>
                                            <span className={`${col.bgCount} ${col.textCount} font-black px-3 py-1 rounded-full text-xs`}>
                                                {colRecords.length}
                                            </span>
                                        </div>
                                        
                                        {/* Column Body */}
                                        <div className="p-4 space-y-4 overflow-y-auto max-h-[650px] custom-scrollbar">
                                            {colRecords.length === 0 ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-border/50 rounded-3xl">
                                                    <div className="text-[10px] uppercase tracking-widest font-bold">Drop Zone Empty</div>
                                                </div>
                                            ) : (
                                                colRecords.map((wo) => (
                                                    <div 
                                                        key={wo.id} 
                                                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                        className={`group cursor-pointer bg-card/80 hover:bg-muted/80 backdrop-blur-xl border border-border ${col.hoverBorder} rounded-3xl p-5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden`}
                                                    >
                                                        {/* Top Ribbon */}
                                                        <div className={`absolute top-0 left-0 w-full h-1.5 ${col.ribbon} transition-colors duration-500`} />
                                                        
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Ticket #{wo.id.slice(0, 8)}</span>
                                                                <span className="text-foreground font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                                    {wo.asset_name || wo.asset?.name || `Asset ${wo.asset_id.slice(0, 4)}`}
                                                                </span>
                                                            </div>
                                                            <ActionIcon 
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(wo.id); }} 
                                                                className={`opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl ${col.hoverIconBg} hover:text-white w-8 h-8 shrink-0 border border-border shadow-md`}
                                                            >
                                                                <Edit size={14} />
                                                            </ActionIcon>
                                                        </div>
                                                        
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 bg-background p-2.5 rounded-xl border border-border/50">
                                                                <Wrench size={14} className="text-muted-foreground shrink-0" />
                                                                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground truncate">{wo.wo_type.replace('_', ' ')}</span>
                                                            </div>
                                                            
                                                            <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                    <Clock size={12} className={new Date(wo.scheduled_date) < new Date() && wo.status !== 'completed' ? 'text-destructive' : ''} />
                                                                    <span className={`text-[10px] font-bold uppercase ${new Date(wo.scheduled_date) < new Date() && wo.status !== 'completed' ? 'text-destructive' : ''}`}>
                                                                        {wo.scheduled_date}
                                                                    </span>
                                                                </div>
                                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border/50 shrink-0" title="Assigned To">
                                                                    <span className="text-[8px] font-black">{wo.assigned_to ? wo.assigned_to.slice(0,2).toUpperCase() : '??'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
