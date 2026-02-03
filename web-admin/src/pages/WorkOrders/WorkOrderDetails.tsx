// WorkOrderDetails Page - Pure Tailwind
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, CheckSquare, Wrench, Plus, Trash2, DollarSign, Play, Check, UserPlus, ClipboardCheck, Edit, FileText, ChevronRight, Camera, Loader2 } from 'lucide-react';
import { workOrderApi } from '../../api/work-order';
import { uploadApi } from '../../api/upload';
import { useAuthStore } from '../../store/useAuthStore';
import { TechnicianSelectModal } from '../../components/WorkOrders/TechnicianSelectModal';
import { InventoryItemSelector } from '../../components/Inventory/InventoryItemSelector';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { SignaturePad } from '../../components/WorkOrders/SignaturePad';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    NumberInput,
    Tabs, TabsList, TabsTrigger, TabsContent,
    LoadingOverlay,
    useToast,
    Progress,
} from '../../components/ui';
import { getImageUrl } from '../../utils/image';

interface WorkOrderDetailsProps {
    workOrderId?: string | null;
}

export default function WorkOrderDetails({ workOrderId: propId }: WorkOrderDetailsProps) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = propId || paramId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();
    const { lastMessage } = useWebSocket();
    const { hasRoleLevel } = useAuthStore();

    // WebSocket real-time updates
    useEffect(() => {
        if (!lastMessage || !id) return;

        const { event_type, payload } = lastMessage;

        // Match this work order ID
        const targetWoId = payload.work_order_id || payload.id;
        if (targetWoId !== id) return;

        if (
            event_type === 'CHECKLIST_UPDATED' ||
            event_type === 'CHECKLIST_ITEM_ADDED' ||
            event_type === 'WORK_ORDER_STATUS_CHANGED' ||
            event_type === 'WORK_ORDER_PART_ADDED' ||
            event_type === 'WORK_ORDER_PART_REMOVED'
        ) {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
        }
    }, [lastMessage, id, queryClient]);



    // Modals
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
    const [editPartId, setEditPartId] = useState<string | null>(null);
    const [finalizeType, setFinalizeType] = useState('OPEX');
    const [partsClassifications, setPartsClassifications] = useState<Record<string, 'OPEX' | 'CAPEX'>>({});
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [applyTemplateModalOpen, setApplyTemplateModalOpen] = useState(false);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);


    // Form inputs
    const [newTask, setNewTask] = useState({ task_number: 1, description: '' });
    const [newPart, setNewPart] = useState({
        part_name: '',
        quantity: 1,
        unit_cost: 0,
        expense_type: 'OPEX' as 'OPEX' | 'CAPEX',
        inventory_item_id: undefined as string | undefined
    });
    const [completeData, setCompleteData] = useState({ work_performed: '' });
    const [verifyData, setVerifyData] = useState({ labor_cost: 0 });

    // Queries
    const { data: wo, isLoading: woLoading } = useQuery({
        queryKey: ['work-order', id],
        queryFn: () => workOrderApi.get(id!),
        enabled: !!id,
    });

    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['work-order-tasks', id],
        queryFn: () => workOrderApi.getTasks(id!),
        enabled: !!id,
    });

    const { data: parts, isLoading: partsLoading } = useQuery({
        queryKey: ['work-order-parts', id],
        queryFn: () => workOrderApi.getParts(id!),
        enabled: !!id,
    });

    const { data: templates } = useQuery({
        queryKey: ['maintenance-templates'],
        queryFn: () => workOrderApi.getTemplates(),
        enabled: applyTemplateModalOpen,
    });

    useEffect(() => {
        if (finalizeModalOpen && parts) {
            const initial: Record<string, 'OPEX' | 'CAPEX'> = {};
            parts.forEach(p => {
                initial[p.id] = (p.expense_type as 'OPEX' | 'CAPEX') || 'OPEX';
            });
            setPartsClassifications(initial);
        }
    }, [finalizeModalOpen, parts]);

    const [selectedTaskPhotos, setSelectedTaskPhotos] = useState<{ id: string, photos: string[] } | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = async (file: File) => {
        if (!selectedTaskPhotos) return;

        setIsUploading(true);
        try {
            // Use dedicated upload API
            const data = await uploadApi.upload(file);
            const newPhotos = [...(selectedTaskPhotos.photos || []), data.url];

            // Update the task immediately
            const updateRes = await workOrderApi.updateTaskPhotos(id!, selectedTaskPhotos.id, newPhotos);
            if (!updateRes.success) {
                throw new Error(updateRes.message || 'Failed to link photo to task');
            }

            // Update local state
            setSelectedTaskPhotos({ ...selectedTaskPhotos, photos: newPhotos });
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            success('Photo uploaded', 'Success');
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || 'Failed to upload photo', 'Error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemovePhoto = async (photoUrl: string) => {
        if (!selectedTaskPhotos) return;
        const newPhotos = selectedTaskPhotos.photos.filter(p => p !== photoUrl);
        try {
            const updateRes = await workOrderApi.updateTaskPhotos(id!, selectedTaskPhotos.id, newPhotos);
            if (!updateRes.success) throw new Error(updateRes.message || 'Failed to update task');
            setSelectedTaskPhotos({ ...selectedTaskPhotos, photos: newPhotos });
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            success('Photo removed', 'Success');
        } catch {
            showError('Failed to remove photo', 'Error');
        }
    }

    // Mutations
    const addTaskMutation = useMutation<any, any, typeof newTask>({
        mutationFn: (data: typeof newTask) => {
            if (editTaskId) {
                return workOrderApi.updateTask(id!, editTaskId, { description: data.description });
            }
            return workOrderApi.addTask(id!, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            setTaskModalOpen(false);
            setEditTaskId(null);
            setNewTask({ task_number: (tasks?.length || 0) + 2, description: '' });
            success(editTaskId ? 'Task updated' : 'Task added', 'Success');
        },
    });

    const removeTaskMutation = useMutation({
        mutationFn: (taskId: string) => workOrderApi.removeTask(id!, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            success('Task removed', 'Success');
        },
    });

    const applyTemplateMutation = useMutation({
        mutationFn: (templateId: string) => workOrderApi.applyTemplate(id!, templateId),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            setApplyTemplateModalOpen(false);
            success(res.message || 'Template applied successfully', 'Success');
        },
    });

    const addPartMutation = useMutation({
        mutationFn: (data: typeof newPart) => {
            if (editPartId) {
                return workOrderApi.updatePart(id!, editPartId, data);
            }
            return workOrderApi.addPart(id!, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setPartModalOpen(false);
            setEditPartId(null);
            setNewPart({
                part_name: '',
                quantity: 1,
                unit_cost: 0,
                expense_type: 'OPEX',
                inventory_item_id: undefined
            });
            success(editPartId ? 'Part updated' : 'Part added', 'Success');
        },
        onError: (error: any) => {
            console.error('Failed to add part:', error);
            showError(error.response?.data?.message || error.message || 'Failed to add part', 'Error');
        }
    });

    const removePartMutation = useMutation({
        mutationFn: (partId: string) => workOrderApi.removePart(id!, partId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            success('Part removed', 'Success');
        },
    });

    const approveMutation = useMutation({
        mutationFn: () => workOrderApi.approve(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            success('Work Order approved', 'Success');
        },
    });

    const startMutation = useMutation({
        mutationFn: () => workOrderApi.start(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            success('Work Order started', 'Started');
        },
    });

    const completeMutation = useMutation({
        mutationFn: (data: typeof completeData) => workOrderApi.complete(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setCompleteModalOpen(false);
            success('Physical work completed, pending supervisor review', 'Success');
        },
    });

    const verifyMutation = useMutation({
        mutationFn: (data: typeof verifyData) => workOrderApi.verify(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setVerifyModalOpen(false);
            success('Work Order verified and costs recorded', 'Success');
        },
    });

    const assignMutation = useMutation({
        mutationFn: (technicianId: string) => workOrderApi.assign(id!, technicianId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setAssignModalOpen(false);
            success('Technician assigned', 'Success');
        },
    });

    const finalizeMutation = useMutation({
        mutationFn: () => workOrderApi.finalize(id!, {
            labor_expense_type: finalizeType,
            parts: Object.entries(partsClassifications).map(([part_id, expense_type]) => ({
                part_id,
                expense_type
            }))
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            setFinalizeModalOpen(false);
            success('Work Order finalized and split expenses created', 'Success');
        },
    });

    const signoffMutation = useMutation({
        mutationFn: (data: { role: string; signature_url: string }) => workOrderApi.submitSignoff(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            success('Signature saved', 'Success');
        },
    });

    const partsCost = Number(wo?.parts_cost || 0);
    const laborCost = Number(wo?.labor_cost || 0);
    const totalCost = partsCost + laborCost;

    const splitSummary = useMemo(() => {
        let opex = 0;
        let capex = 0;

        // Labor
        const lType = finalizeModalOpen ? finalizeType : (wo?.labor_expense_type || 'OPEX');
        if (lType === 'CAPEX') capex += laborCost;
        else opex += laborCost;

        // Parts
        parts?.forEach(p => {
            const type = partsClassifications[p.id] || p.expense_type || 'OPEX';
            if (type === 'CAPEX') capex += Number(p.total_cost);
            else opex += Number(p.total_cost);
        });

        return { opex, capex };
    }, [finalizeType, partsClassifications, parts, laborCost, wo?.labor_expense_type, finalizeModalOpen]);

    if (woLoading) return <div className="flex justify-center py-12"><LoadingOverlay visible /></div>;
    if (!wo) return <p className="text-slate-400 text-center py-12">Work Order not found</p>;

    const statusBadge: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
        pending: 'default',
        assigned: 'info',
        in_progress: 'warning',
        pending_review: 'warning',
        verified: 'info',
        completed: 'success',
        cancelled: 'danger',
    };



    return (
        <div className="p-8">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    leftIcon={<ArrowLeft size={18} />}
                    onClick={() => navigate('/work-orders')}
                    className="text-gray-400 hover:text-white transition-colors pl-0"
                >
                    Back to Work Orders
                </Button>
            </div>

            {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{wo.wo_number}</h1>
                        <Badge variant={statusBadge[wo.status]} className="px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold">
                            {wo.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="default" className="px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold bg-muted border-border text-muted-foreground">
                            {wo.priority}
                        </Badge>
                    </div>
                    {wo.asset_name && (
                        <p className="text-xl font-medium text-blue-400 mb-2">{wo.asset_name}</p>
                    )}
                    <p className="text-gray-400">{wo.wo_type}</p>
                </div>

                <div className="flex-1 max-w-xs mx-8">
                    {tasks && tasks.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Checklist Progress</span>
                                <span>{Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}%</span>
                            </div>
                            <Progress
                                value={(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}
                                color="emerald"
                                size="md"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    {wo.status === 'pending' && hasRoleLevel(3) && (
                        <Button
                            variant="primary"
                            leftIcon={<Check size={18} />}
                            onClick={() => approveMutation.mutate()}
                            loading={approveMutation.isPending}
                            className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500"
                        >
                            Approve
                        </Button>
                    )}
                    {(wo.status === 'approved' || wo.status === 'pending') && hasRoleLevel(3) && (
                        <Button
                            variant="outline"
                            leftIcon={<UserPlus size={18} />}
                            onClick={() => setAssignModalOpen(true)}
                            className="rounded-xl border-white/10"
                        >
                            Assign Technician
                        </Button>
                    )}
                    {(wo.status === 'assigned' && wo.assigned_technician) && (
                        <Button
                            leftIcon={<Play size={18} />}
                            onClick={() => startMutation.mutate()}
                            loading={startMutation.isPending}
                            className="rounded-xl shadow-lg shadow-blue-500/20"
                        >
                            Start Work
                        </Button>
                    )}
                    {wo.status === 'in_progress' && (
                        <Button
                            variant="primary"
                            leftIcon={<Check size={18} />}
                            onClick={() => setCompleteModalOpen(true)}
                            className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500"
                        >
                            Finish Work
                        </Button>
                    )}
                    {wo.status === 'pending_review' && hasRoleLevel(3) && (
                        <Button
                            variant="primary"
                            leftIcon={<ClipboardCheck size={18} />}
                            onClick={() => {
                                setVerifyData({ labor_cost: 0 });
                                setVerifyModalOpen(true);
                            }}
                            className="rounded-xl shadow-lg shadow-amber-500/20 bg-amber-600 hover:bg-amber-500"
                        >
                            Verify & Input Cost
                        </Button>
                    )}
                    {wo.status === 'verified' && hasRoleLevel(2) && (
                        <Button
                            variant="primary"
                            leftIcon={<CheckSquare size={18} />}
                            onClick={() => setFinalizeModalOpen(true)}
                            className="rounded-xl shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-500"
                        >
                            Sign Off / Finalize
                        </Button>
                    )}
                </div>
            </div>

            {/* Maintenance Journey Stepper */}
            <div className="mb-10 px-4 py-8 bg-card rounded-3xl border border-border shadow-inner">
                <div className="flex justify-between items-center relative">
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
                    {[
                        { label: 'Request', status: 'pending', icon: <Plus size={14} /> },
                        { label: 'Approved', status: 'approved', icon: <Check size={14} /> },
                        { label: 'Assigned', status: 'assigned', icon: <UserPlus size={14} /> },
                        { label: 'Working', status: 'in_progress', icon: <Wrench size={14} /> },
                        { label: 'Finished', status: 'pending_review', icon: <ClipboardCheck size={14} /> },
                        { label: 'Verified', status: 'verified', icon: <DollarSign size={14} /> },
                        { label: 'Finalized', status: 'completed', icon: <CheckSquare size={14} /> },
                    ].map((step, idx, arr) => {
                        const statuses = arr.map(s => s.status);
                        const currentIdx = statuses.indexOf(wo.status);
                        const isCompleted = currentIdx > idx || wo.status === 'completed';
                        const isCurrent = wo.status === step.status;

                        return (
                            <div key={step.status} className="flex flex-col items-center gap-3 relative z-10 flex-1">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' :
                                    isCurrent ? 'bg-blue-600 border-blue-500 text-white animate-pulse shadow-blue-500/30' :
                                        'bg-card border-border text-muted-foreground'
                                    }`}>
                                    {isCompleted ? <Check size={18} /> : step.icon}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors duration-500 ${isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-gray-500'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <DollarSign className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Parts Cost</p>
                            <p className="text-2xl font-bold text-white mt-1">Rp {partsCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-amber-500/20 rounded-xl">
                            <DollarSign className="text-amber-400" size={24} />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Labor Cost</p>
                            <p className="text-2xl font-bold text-card-foreground mt-1">Rp {laborCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6 border-blue-500/20 bg-blue-500/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-blue-500/30 rounded-xl shadow-lg shadow-blue-500/20">
                            <DollarSign className="text-blue-300" size={24} />
                        </div>
                        <div>
                            <p className="text-blue-300 text-sm font-medium">Total Cost</p>
                            <p className="text-3xl font-bold text-white mt-1">Rp {totalCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="relative overflow-hidden group p-6 bg-purple-500/5 border-purple-500/20">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <div className="w-6 h-6 flex items-center justify-center font-black text-purple-400">O</div>
                        </div>
                        <div>
                            <p className="text-purple-300 text-sm font-bold uppercase tracking-wider">Total OPEX</p>
                            <p className="text-2xl font-black text-white mt-1">Rp {splitSummary.opex.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>

                <Card className="relative overflow-hidden group p-6 bg-cyan-500/5 border-cyan-500/20">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-cyan-500/20 rounded-xl">
                            <div className="w-6 h-6 flex items-center justify-center font-black text-cyan-400">C</div>
                        </div>
                        <div>
                            <p className="text-cyan-300 text-sm font-bold uppercase tracking-wider">Total CAPEX</p>
                            <p className="text-2xl font-black text-white mt-1">Rp {splitSummary.capex.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Card className="overflow-hidden p-0 border border-border">
                <Tabs defaultValue="overview">
                    <div className="px-6 py-4 border-b border-border bg-muted/30">
                        <TabsList className="bg-muted">
                            <TabsTrigger value="overview" icon={<Info size={16} />} className="px-6">Overview</TabsTrigger>
                            <TabsTrigger value="tasks" icon={<CheckSquare size={16} />} className="px-6">Tasks ({tasks?.length || 0})</TabsTrigger>
                            <TabsTrigger value="parts" icon={<Wrench size={16} />} className="px-6">Parts ({parts?.length || 0})</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                    <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Problem Description</p>
                                    <p className="text-foreground leading-relaxed">{wo.problem_description || 'No description provided'}</p>
                                </div>
                                <div className="p-6 bg-card rounded-2xl border border-border">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Safety Requirements</p>
                                    <p className="text-foreground">{Array.isArray(wo.safety_requirements) ? wo.safety_requirements.join(', ') : 'None'}</p>
                                </div>
                                <div className="p-6 bg-card rounded-2xl border border-border">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Timestamps</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Scheduled Date</span>
                                            <span className="text-foreground font-medium">{wo.scheduled_date || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Actual Start</span>
                                            <span className="text-foreground font-medium">{wo.actual_start_date ? new Date(wo.actual_start_date).toLocaleString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Completed At</span>
                                            <span className="text-foreground font-medium">{wo.actual_end_date ? new Date(wo.actual_end_date).toLocaleString() : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                    <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">Work Performed</p>
                                    <p className="text-gray-300 leading-relaxed">{wo.work_performed || 'Work pending completion'}</p>
                                </div>

                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Digital Signatures</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold text-center">Technician</p>
                                            {wo.technician_signoff ? (
                                                <div className="h-24 bg-white/5 rounded-lg overflow-hidden border border-white/10 p-2">
                                                    <img src={getImageUrl(wo.technician_signoff)} alt="Tech" className="w-full h-full object-contain opacity-90" />
                                                </div>
                                            ) : (
                                                <div className="h-24 bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-white/10">
                                                    <span className="text-[10px] text-gray-600 italic">Not signed</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold text-center">Supervisor</p>
                                            {wo.supervisor_signoff ? (
                                                <div className="h-24 bg-white/5 rounded-lg overflow-hidden border border-white/10 p-2">
                                                    <img src={getImageUrl(wo.supervisor_signoff)} alt="Sup" className="w-full h-full object-contain opacity-90" />
                                                </div>
                                            ) : (
                                                <div className="h-24 bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-white/10">
                                                    <span className="text-[10px] text-gray-600 italic">Not signed</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold text-center">Operator / Customer (Handover)</p>
                                            {wo.customer_signoff ? (
                                                <div className="h-28 bg-white/5 rounded-lg overflow-hidden border border-white/10 p-2">
                                                    <img src={getImageUrl(wo.customer_signoff)} alt="Customer" className="w-full h-full object-contain opacity-90" />
                                                </div>
                                            ) : (
                                                <div className="bg-black/20 rounded-xl border border-dashed border-white/10 p-4">
                                                    {wo.status === 'completed' ? (
                                                        <SignaturePad
                                                            label="Operator Signature"
                                                            onSave={async (dataUrl) => {
                                                                try {
                                                                    const res = await fetch(dataUrl);
                                                                    const blob = await res.blob();
                                                                    const file = new File([blob], `sig_cust_${id}.png`, { type: 'image/png' });
                                                                    const uploadRes = await uploadApi.upload(file);
                                                                    await signoffMutation.mutateAsync({ role: 'customer', signature_url: uploadRes.url });
                                                                } catch {
                                                                    showError('Failed to save signature', 'Error');
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-4 text-gray-600">
                                                            <span className="text-xs italic">Pending Handover</span>
                                                            <p className="text-[10px] mt-1 text-center">Available after work is completed</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tasks" className="p-0">
                        <div className="px-6 py-4 border-b border-border bg-muted/10 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<FileText size={16} />}
                                onClick={() => setApplyTemplateModalOpen(true)}
                                className="rounded-xl border-white/10 text-gray-400 hover:text-blue-400"
                            >
                                Apply Template
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Plus size={16} />}
                                onClick={() => {
                                    setEditTaskId(null);
                                    setNewTask({ task_number: (tasks?.length || 0) + 1, description: '' });
                                    setTaskModalOpen(true);
                                }}
                                className="rounded-xl border-white/10"
                            >
                                Add Task
                            </Button>
                        </div>
                        <div className="relative">
                            <LoadingOverlay visible={tasksLoading} />
                            <Table className="border-none rounded-none shadow-none">
                                <TableHead>
                                    <TableRow className="bg-gray-900/30 border-white/5">
                                        <TableTh className="w-20">#</TableTh>
                                        <TableTh>Description</TableTh>
                                        <TableTh className="w-40">Status</TableTh>
                                        <TableTh className="w-24 text-center">Photos</TableTh>
                                        <TableTh align="center" className="w-24">Actions</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tasks?.length ? tasks.map(task => (
                                        <TableRow key={task.id} className="hover:bg-muted/30 border-border group transition-all">
                                            <TableTd className="font-mono text-muted-foreground">{task.task_number}</TableTd>
                                            <TableTd className="text-foreground">{task.description}</TableTd>
                                            <TableTd>
                                                <Badge variant={task.status === 'completed' ? 'success' : 'default'} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                    {task.status}
                                                </Badge>
                                            </TableTd>
                                            <TableTd align="center">
                                                {task.photos && task.photos.length > 0 && (
                                                    <div className="flex -space-x-2 justify-center">
                                                        {task.photos.slice(0, 3).map((p, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full border border-gray-800 bg-gray-700 overflow-hidden relative z-0 hover:z-10 transition-all">
                                                                <img src={getImageUrl(p)} alt="evidence" className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                        {task.photos.length > 3 && (
                                                            <div className="w-6 h-6 rounded-full border border-gray-800 bg-gray-700 flex items-center justify-center text-[8px] text-white">
                                                                +{task.photos.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableTd>
                                            <TableTd align="center">
                                                <div className="flex gap-2 justify-center">
                                                    <ActionIcon
                                                        variant="default"
                                                        onClick={() => {
                                                            setEditTaskId(task.id);
                                                            setNewTask({ task_number: task.task_number, description: task.description });
                                                            setTaskModalOpen(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/20 text-blue-400"
                                                    >
                                                        <Edit size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="default"
                                                        onClick={() => {
                                                            setSelectedTaskPhotos({ id: task.id, photos: task.photos || [] });
                                                            setPhotoModalOpen(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-500/20 text-purple-400"
                                                    >
                                                        <Camera size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="danger" onClick={() => removeTaskMutation.mutate(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400">
                                                        <Trash2 size={16} />
                                                    </ActionIcon>
                                                </div>
                                            </TableTd>
                                        </TableRow>
                                    )) : (
                                        <TableEmpty colSpan={5} message="No tasks defined" />
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="parts" className="p-0">
                        <div className="px-6 py-4 border-b border-white/5 bg-gray-900/10 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Plus size={16} />}
                                onClick={() => {
                                    setEditPartId(null);
                                    setNewPart({
                                        part_name: '',
                                        quantity: 1,
                                        unit_cost: 0,
                                        expense_type: 'OPEX',
                                        inventory_item_id: undefined
                                    });
                                    setPartModalOpen(true);
                                }}
                                className="rounded-xl border-white/10"
                            >
                                Add Part
                            </Button>
                        </div>
                        <div className="relative">
                            <LoadingOverlay visible={partsLoading} />
                            <Table className="border-none rounded-none shadow-none">
                                <TableHead>
                                    <TableRow className="bg-muted/30 border-border">
                                        <TableTh>Part Name</TableTh>
                                        <TableTh className="w-24">Qty</TableTh>
                                        <TableTh>Unit Cost</TableTh>
                                        <TableTh>Total</TableTh>
                                        <TableTh className="w-24 text-center">Class</TableTh>
                                        <TableTh align="center" className="w-24">Actions</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parts?.length ? parts.map(part => (
                                        <TableRow key={part.id} className="hover:bg-muted/30 border-border group transition-all">
                                            <TableTd className="text-foreground font-medium">{part.part_name}</TableTd>
                                            <TableTd className="font-mono">{Number(part.quantity)}</TableTd>
                                            <TableTd className="text-muted-foreground">Rp {Number(part.unit_cost).toLocaleString('id-ID')}</TableTd>
                                            <TableTd className="font-bold text-card-foreground">Rp {Number(part.total_cost).toLocaleString('id-ID')}</TableTd>
                                            <TableTd align="center">
                                                <Badge
                                                    variant={part.expense_type === 'CAPEX' ? 'info' : 'default'}
                                                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${part.expense_type === 'CAPEX' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}
                                                >
                                                    {part.expense_type || 'OPEX'}
                                                </Badge>
                                            </TableTd>
                                            <TableTd align="center">
                                                <div className="flex gap-2 justify-center">
                                                    <ActionIcon
                                                        variant="default"
                                                        onClick={() => {
                                                            setEditPartId(part.id);
                                                            setNewPart({
                                                                part_name: part.part_name,
                                                                quantity: part.quantity,
                                                                unit_cost: part.unit_cost,
                                                                expense_type: (part as any).expense_type || 'OPEX',
                                                                inventory_item_id: (part as any).inventory_item_id
                                                            });
                                                            setPartModalOpen(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500/20 text-blue-400"
                                                    >
                                                        <Edit size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="danger" onClick={() => removePartMutation.mutate(part.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400">
                                                        <Trash2 size={16} />
                                                    </ActionIcon>
                                                </div>
                                            </TableTd>
                                        </TableRow>
                                    )) : (
                                        <TableEmpty colSpan={6} message="No parts used" />
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            <Modal isOpen={applyTemplateModalOpen} onClose={() => setApplyTemplateModalOpen(false)} title="Apply Maintenance Template" size="lg">
                <div className="space-y-4 p-6">
                    <p className="text-muted-foreground text-sm mb-4">Select a template to automatically populate the work checklist. This will add all tasks defined in the template to this work order.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {templates?.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => applyTemplateMutation.mutate(t.id)}
                                className="p-4 bg-background/50 border border-border rounded-xl hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all group"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</h4>
                                        <p className="text-xs text-muted-foreground">{t.description || 'No description provided'}</p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-600 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                        {(!templates || templates.length === 0) && (
                            <div className="text-center py-8 text-gray-500 italic bg-black/10 rounded-xl border border-dashed border-white/5">
                                No maintenance templates available.
                                <br />
                                <span className="text-xs">Go to "Maintenance Templates" to create one.</span>
                            </div>
                        )}
                    </div>
                </div>
                {applyTemplateMutation.isPending && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-50">
                        <LoadingOverlay visible />
                    </div>
                )}
            </Modal>

            <Modal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} title="Evidence Media" size="lg">
                <div className="p-6">
                    <p className="text-muted-foreground text-sm mb-6">Upload before/after photos for this checklist task.</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                        {selectedTaskPhotos?.photos?.map((photo, index) => (
                            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-background">
                                <img
                                    src={getImageUrl(photo)}
                                    alt={`Common Evidence ${index}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => handleRemovePhoto(photo)}
                                        className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                            {isUploading ? (
                                <Loader2 className="animate-spin text-primary" size={24} />
                            ) : (
                                <>
                                    <div className="p-3 rounded-full bg-secondary group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-colors mb-2">
                                        <Camera size={20} />
                                    </div>
                                    <span className="text-xs text-muted-foreground group-hover:text-primary font-medium">Add Photo</span>
                                </>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                                }}
                                disabled={isUploading}
                            />
                        </label>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="ghost" onClick={() => setPhotoModalOpen(false)}>Done</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={taskModalOpen} onClose={() => { setTaskModalOpen(false); setEditTaskId(null); }} title={editTaskId ? "Edit Work Task" : "Add Work Task"} size="xl">
                <div className="space-y-6 p-6">
                    <div className="relative">
                        <NumberInput
                            label="Sequence #"
                            value={newTask.task_number}
                            onChange={(v: number | undefined) => setNewTask({ ...newTask, task_number: v || 1 })}
                            className="bg-background border-border rounded-xl"
                        />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>
                    <Input
                        label="Task Description"
                        placeholder="e.g. Change oil filter, Inspect brake pads..."
                        value={newTask.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, description: e.target.value })}
                        className="bg-background border-border rounded-xl"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setTaskModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => addTaskMutation.mutate(newTask)}
                            loading={addTaskMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-8 shadow-lg shadow-indigo-500/20 font-bold"
                        >
                            {editTaskId ? "Save Changes" : "Add Task"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={partModalOpen} onClose={() => setPartModalOpen(false)} title="Add Spare Part" size="xl">
                <div className="space-y-6 p-6">
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={() => setNewPart({ ...newPart, inventory_item_id: undefined, part_name: '', unit_cost: 0 })}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${!newPart.inventory_item_id ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}`}
                        >
                            Manual Entry
                        </button>
                        <button
                            onClick={() => setNewPart({ ...newPart, inventory_item_id: 'temp', part_name: '', unit_cost: 0 })} // Set temp ID to switch mode, will be replaced by actual ID
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${newPart.inventory_item_id ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-background border-border text-muted-foreground'}`}
                        >
                            From Inventory
                        </button>
                    </div>

                    <div className="relative">
                        {newPart.inventory_item_id !== undefined ? (
                            <InventoryItemSelector
                                value={newPart.inventory_item_id === 'temp' ? null : newPart.inventory_item_id}
                                onChange={(item: any) => {
                                    if (item) {
                                        setNewPart({
                                            ...newPart,
                                            inventory_item_id: item.id,
                                            part_name: item.name,
                                            unit_cost: parseFloat(item.average_cost),
                                            quantity: 1
                                        });
                                    } else {
                                        setNewPart({ ...newPart, inventory_item_id: 'temp', part_name: '', unit_cost: 0 });
                                    }
                                }}
                                label="Search Inventory"
                                required
                            />
                        ) : (
                            <Input
                                label="Part Name / Specification"
                                placeholder="e.g. Filter Oli Hino, Pad Rem Depan..."
                                value={newPart.part_name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPart({ ...newPart, part_name: e.target.value })}
                                className="bg-background border-border rounded-xl"
                            />
                        )}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <NumberInput
                            label="Quantity"
                            value={newPart.quantity}
                            onChange={(v: number | undefined) => setNewPart({ ...newPart, quantity: v || 1 })}
                            className="bg-background border-border rounded-xl"
                        />
                        <NumberInput
                            label="Unit Cost"
                            prefix="Rp "
                            value={newPart.unit_cost}
                            onChange={(v: number | undefined) => setNewPart({ ...newPart, unit_cost: v || 0 })}
                            thousandSeparator
                            className="bg-background border-border text-emerald-400 font-medium rounded-xl"
                            disabled={!!newPart.inventory_item_id} // Disable manual cost edit if inventory item
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 font-medium mb-1.5 block">Expense Classification</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setNewPart({ ...newPart, expense_type: 'OPEX' })}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${newPart.expense_type === 'OPEX' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-background border-border text-muted-foreground hover:bg-secondary'}`}
                            >
                                OPEX
                            </button>
                            <button
                                onClick={() => setNewPart({ ...newPart, expense_type: 'CAPEX' })}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${newPart.expense_type === 'CAPEX' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-background border-border text-muted-foreground hover:bg-secondary'}`}
                            >
                                CAPEX
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setPartModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                // Clean up temp ID before submitting
                                const payload = { ...newPart };
                                if (payload.inventory_item_id === 'temp') payload.inventory_item_id = undefined;
                                addPartMutation.mutate(payload);
                            }}
                            loading={addPartMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-500 rounded-xl px-8 shadow-lg shadow-amber-500/20"
                        >
                            Add Part
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Work Order" size="xl">
                <div className="space-y-6 p-6">
                    <div className="relative">
                        <Input
                            label="Final Work Performed"
                            placeholder="Summary of actions taken..."
                            value={completeData.work_performed}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompleteData({ ...completeData, work_performed: e.target.value })}
                            className="bg-background border-border rounded-xl"
                        />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>
                    <div className="flex items-start gap-4 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Info size={20} className="text-emerald-400" />
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Finishing this work order reflects that physical maintenance is complete. It will now move to <span className="text-blue-400 font-bold uppercase tracking-wider">Supervisor Review</span> for cost verification.
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <SignaturePad
                            label="Technician Signature"
                            onSave={async (dataUrl) => {
                                try {
                                    // Convert base64 to File
                                    const res = await fetch(dataUrl);
                                    const blob = await res.blob();
                                    const file = new File([blob], `signature_tech_${id}.png`, { type: 'image/png' });

                                    // Upload
                                    const uploadRes = await uploadApi.upload(file);
                                    const signatureUrl = uploadRes.url;

                                    // Save signoff
                                    await signoffMutation.mutateAsync({ role: 'technician', signature_url: signatureUrl });
                                } catch {
                                    showError('Failed to save signature', 'Error');
                                }
                            }}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setCompleteModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => completeMutation.mutate(completeData)}
                            loading={completeMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-10 h-12 shadow-lg shadow-emerald-500/20 font-bold"
                        >
                            Finish Work
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} title="Verify Work Order & Cost" size="xl">
                <div className="space-y-6 p-6">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-sm text-blue-200 font-medium">Work Performed by Technician:</p>
                        <p className="text-gray-300 mt-2 italic">"{wo.work_performed || 'No report provided'}"</p>
                    </div>

                    <NumberInput
                        label="Verified Labor Cost"
                        prefix="Rp "
                        value={verifyData.labor_cost}
                        onChange={(v: number | undefined) => setVerifyData({ labor_cost: v || 0 })}
                        thousandSeparator
                        className="bg-background border-border text-amber-400 font-bold rounded-xl"
                        hint={`Parts cost recorded: Rp ${partsCost.toLocaleString('id-ID')}`}
                    />

                    <div className="flex items-start gap-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <ClipboardCheck size={20} className="text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Verification confirms the labor cost and moves this work order to the <span className="text-purple-400 font-bold uppercase tracking-wider">Finalization</span> queue for manager sign-off.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setVerifyModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => verifyMutation.mutate(verifyData)}
                            loading={verifyMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-500 rounded-xl px-10 h-12 shadow-lg shadow-amber-500/20 font-bold"
                        >
                            Verify & Submit
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Assign Technician Modal */}
            <TechnicianSelectModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                onSelect={(techId) => assignMutation.mutate(techId)}
                loading={assignMutation.isPending}
            />
            <Modal isOpen={finalizeModalOpen} onClose={() => setFinalizeModalOpen(false)} title="Finalize Work Order" size="xl">
                <div className="space-y-6 p-6">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Info size={20} className="text-purple-400" />
                            <h3 className="text-lg font-bold text-white">Expense Classification</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            Please classify each cost item. This determines how it is recorded in the financial system.
                        </p>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Labor Item */}
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 rounded-xl">
                                    <DollarSign size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-bold text-foreground">Labor Cost</div>
                                    <div className="text-sm text-emerald-400 font-medium">Rp {laborCost.toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                            <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
                                <button
                                    onClick={() => setFinalizeType('OPEX')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${finalizeType === 'OPEX' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    OPEX
                                </button>
                                <button
                                    onClick={() => setFinalizeType('CAPEX')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${finalizeType === 'CAPEX' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
                                >
                                    CAPEX
                                </button>
                            </div>
                        </div>

                        {/* Parts Items */}
                        {parts?.map(part => (
                            <div key={part.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-500/20 rounded-xl">
                                        <Wrench size={20} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white line-clamp-1">{part.part_name}</div>
                                        <div className="text-sm text-emerald-400 font-medium">
                                            {Number(part.quantity).toLocaleString()} x Rp {Number(part.unit_cost).toLocaleString('id-ID')} = Rp {Number(part.total_cost).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                                    <button
                                        onClick={() => setPartsClassifications(prev => ({ ...prev, [part.id]: 'OPEX' }))}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${partsClassifications[part.id] === 'OPEX' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        OPEX
                                    </button>
                                    <button
                                        onClick={() => setPartsClassifications(prev => ({ ...prev, [part.id]: 'CAPEX' }))}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${partsClassifications[part.id] === 'CAPEX' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        CAPEX
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-purple-500/20 border border-purple-500/20 rounded-xl">
                            <div className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-1">Total OPEX</div>
                            <div className="text-xl font-black text-card-foreground">Rp {splitSummary.opex.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="p-4 bg-cyan-500/20 border border-cyan-500/20 rounded-xl">
                            <div className="text-xs text-cyan-400 uppercase font-bold tracking-wider mb-1">Total CAPEX</div>
                            <div className="text-xl font-black text-card-foreground">Rp {splitSummary.capex.toLocaleString('id-ID')}</div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <SignaturePad
                            label="Supervisor / Manager Approval Signature"
                            onSave={async (dataUrl) => {
                                try {
                                    const res = await fetch(dataUrl);
                                    const blob = await res.blob();
                                    const file = new File([blob], `signature_sup_${id}.png`, { type: 'image/png' });
                                    const uploadRes = await uploadApi.upload(file);
                                    await signoffMutation.mutateAsync({ role: 'supervisor', signature_url: uploadRes.url });
                                } catch {
                                    showError('Failed to save signature', 'Error');
                                }
                            }}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setFinalizeModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => finalizeMutation.mutate()}
                            loading={finalizeMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-8 shadow-lg shadow-indigo-500/20 font-bold"
                        >
                            Confirm Finalization & Sign Off
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
