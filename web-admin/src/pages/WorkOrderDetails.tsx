// WorkOrderDetails Page - Pure Tailwind
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, CheckSquare, Wrench, Plus, Trash2, DollarSign, Play, Check, UserPlus } from 'lucide-react';
import { workOrderApi } from '../api/work-order';
import { TechnicianSelectModal } from '../components/WorkOrders/TechnicianSelectModal';
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
} from '../components/ui';

interface WorkOrderDetailsProps {
    workOrderId?: string | null;
}

export function WorkOrderDetails({ workOrderId: propId }: WorkOrderDetailsProps) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = propId || paramId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { success } = useToast();



    // Modals
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);

    // Form inputs
    const [newTask, setNewTask] = useState({ task_number: 1, description: '' });
    const [newPart, setNewPart] = useState({ part_name: '', quantity: 1, unit_cost: 0 });
    const [completeData, setCompleteData] = useState({ work_performed: '', actual_cost: 0 });

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

    // Mutations
    const addTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => workOrderApi.addTask(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            setTaskModalOpen(false);
            setNewTask({ task_number: (tasks?.length || 0) + 2, description: '' });
            success('Task added', 'Success');
        },
    });

    const removeTaskMutation = useMutation({
        mutationFn: (taskId: string) => workOrderApi.removeTask(id!, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            success('Task removed', 'Success');
        },
    });

    const addPartMutation = useMutation({
        mutationFn: (data: typeof newPart) => workOrderApi.addPart(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setPartModalOpen(false);
            setNewPart({ part_name: '', quantity: 1, unit_cost: 0 });
            success('Part added', 'Success');
        },
        onError: (error: any) => {
            console.error('Failed to add part:', error);
            // Assuming useToast exposes 'error' or we use 'success' with specific styling or generic toast
            // The existing useToast usage just shows 'success' method.
            // Let's check imports. 'useToast' is from '../components/ui'.
            // Usually it has error method.
            success(error.response?.data?.message || error.message || 'Failed to add part', 'Error');
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
            success('Work Order completed', 'Completed');
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

    if (woLoading) return <div className="flex justify-center py-12"><LoadingOverlay visible /></div>;
    if (!wo) return <p className="text-slate-400 text-center py-12">Work Order not found</p>;

    const statusBadge: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
        pending: 'default',
        assigned: 'info',
        in_progress: 'warning',
        completed: 'success',
        cancelled: 'danger',
    };

    const partsCost = Number(wo.parts_cost || 0);
    const laborCost = Number(wo.labor_cost || 0);
    const totalCost = partsCost + laborCost;

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
                        <h1 className="text-3xl font-bold text-white tracking-tight">{wo.wo_number}</h1>
                        <Badge variant={statusBadge[wo.status]} className="px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold">
                            {wo.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="default" className="px-3 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold bg-white/5 border-white/10 text-gray-400">
                            {wo.priority}
                        </Badge>
                    </div>
                    {wo.asset_name && (
                        <p className="text-xl font-medium text-blue-400 mb-2">{wo.asset_name}</p>
                    )}
                    <p className="text-gray-400">{wo.wo_type}</p>
                </div>
                <div className="flex gap-3">
                    {(wo.status === 'approved' || wo.status === 'pending') && (
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
                            Complete
                        </Button>
                    )}
                </div>
            </div>

            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                            <p className="text-gray-400 text-sm font-medium">Labor Cost</p>
                            <p className="text-2xl font-bold text-white mt-1">Rp {laborCost.toLocaleString('id-ID')}</p>
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

            {/* Tabs */}
            <Card className="overflow-hidden p-0">
                <Tabs defaultValue="overview">
                    <div className="px-6 py-4 border-b border-white/5 bg-gray-900/30">
                        <TabsList className="bg-white/5">
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
                                    <p className="text-gray-300 leading-relaxed">{wo.problem_description || 'No description provided'}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Safety Requirements</p>
                                    <p className="text-gray-300">{Array.isArray(wo.safety_requirements) ? wo.safety_requirements.join(', ') : 'None'}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Timestamps</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Scheduled Date</span>
                                            <span className="text-gray-300 font-medium">{wo.scheduled_date || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Actual Start</span>
                                            <span className="text-gray-300 font-medium">{wo.actual_start_date ? new Date(wo.actual_start_date).toLocaleString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Completed At</span>
                                            <span className="text-gray-300 font-medium">{wo.actual_end_date ? new Date(wo.actual_end_date).toLocaleString() : '-'}</span>
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
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Assigned Personnel</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                                            {wo.assigned_technician ? wo.assigned_technician.charAt(0) : '?'}
                                        </div>
                                        <p className="text-gray-200 font-medium">{wo.assigned_technician || 'Unassigned'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tasks" className="p-0">
                        <div className="px-6 py-4 border-b border-white/5 bg-gray-900/10 flex justify-end">
                            <Button variant="outline" size="sm" leftIcon={<Plus size={16} />} onClick={() => setTaskModalOpen(true)} className="rounded-xl border-white/10">
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
                                        <TableTh align="center" className="w-24">Actions</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tasks?.length ? tasks.map(task => (
                                        <TableRow key={task.id} className="hover:bg-gray-700/30 border-white/5 group transition-all">
                                            <TableTd className="font-mono text-gray-500">{task.task_number}</TableTd>
                                            <TableTd className="text-gray-300">{task.description}</TableTd>
                                            <TableTd>
                                                <Badge variant={task.status === 'completed' ? 'success' : 'default'} className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                                    {task.status}
                                                </Badge>
                                            </TableTd>
                                            <TableTd align="center">
                                                <ActionIcon variant="danger" onClick={() => removeTaskMutation.mutate(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400">
                                                    <Trash2 size={16} />
                                                </ActionIcon>
                                            </TableTd>
                                        </TableRow>
                                    )) : (
                                        <TableEmpty colSpan={4} message="No tasks defined" />
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="parts" className="p-0">
                        <div className="px-6 py-4 border-b border-white/5 bg-gray-900/10 flex justify-end">
                            <Button variant="outline" size="sm" leftIcon={<Plus size={16} />} onClick={() => setPartModalOpen(true)} className="rounded-xl border-white/10">
                                Add Part
                            </Button>
                        </div>
                        <div className="relative">
                            <LoadingOverlay visible={partsLoading} />
                            <Table className="border-none rounded-none shadow-none">
                                <TableHead>
                                    <TableRow className="bg-gray-900/30 border-white/5">
                                        <TableTh>Part Name</TableTh>
                                        <TableTh className="w-24">Qty</TableTh>
                                        <TableTh>Unit Cost</TableTh>
                                        <TableTh>Total</TableTh>
                                        <TableTh align="center" className="w-24">Actions</TableTh>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parts?.length ? parts.map(part => (
                                        <TableRow key={part.id} className="hover:bg-gray-700/30 border-white/5 group transition-all">
                                            <TableTd className="text-gray-300 font-medium">{part.part_name}</TableTd>
                                            <TableTd className="font-mono">{Number(part.quantity)}</TableTd>
                                            <TableTd className="text-gray-400">Rp {Number(part.unit_cost).toLocaleString('id-ID')}</TableTd>
                                            <TableTd className="font-bold text-gray-200">Rp {Number(part.total_cost).toLocaleString('id-ID')}</TableTd>
                                            <TableTd align="center">
                                                <ActionIcon variant="danger" onClick={() => removePartMutation.mutate(part.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400">
                                                    <Trash2 size={16} />
                                                </ActionIcon>
                                            </TableTd>
                                        </TableRow>
                                    )) : (
                                        <TableEmpty colSpan={5} message="No parts used" />
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Work Task" size="xl">
                <div className="space-y-6 p-6">
                    <div className="relative">
                        <NumberInput
                            label="Sequence #"
                            value={newTask.task_number}
                            onChange={(v: number | undefined) => setNewTask({ ...newTask, task_number: v || 1 })}
                            className="bg-black/20 border-white/5 rounded-xl"
                        />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>
                    <Input
                        label="Task Description"
                        placeholder="e.g. Change oil filter, Inspect brake pads..."
                        value={newTask.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, description: e.target.value })}
                        className="bg-black/20 border-white/5 rounded-xl"
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setTaskModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => addTaskMutation.mutate(newTask)}
                            loading={addTaskMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-500 rounded-xl px-8 shadow-lg shadow-blue-500/20"
                        >
                            Add Task
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={partModalOpen} onClose={() => setPartModalOpen(false)} title="Add Spare Part" size="xl">
                <div className="space-y-6 p-6">
                    <div className="relative">
                        <Input
                            label="Part Name / Specification"
                            placeholder="e.g. Filter Oli Hino, Pad Rem Depan..."
                            value={newPart.part_name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPart({ ...newPart, part_name: e.target.value })}
                            className="bg-black/20 border-white/5 rounded-xl"
                        />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <NumberInput
                            label="Quantity"
                            value={newPart.quantity}
                            onChange={(v: number | undefined) => setNewPart({ ...newPart, quantity: v || 1 })}
                            className="bg-black/20 border-white/5 rounded-xl"
                        />
                        <NumberInput
                            label="Unit Cost"
                            prefix="Rp "
                            value={newPart.unit_cost}
                            onChange={(v: number | undefined) => setNewPart({ ...newPart, unit_cost: v || 0 })}
                            thousandSeparator
                            className="bg-black/20 border-white/5 text-emerald-400 font-medium rounded-xl"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setPartModalOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            onClick={() => addPartMutation.mutate(newPart)}
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
                            className="bg-black/20 border-white/5 rounded-xl"
                        />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
                    </div>
                    <NumberInput
                        label="Total Labor Cost"
                        prefix="Rp "
                        value={completeData.actual_cost}
                        onChange={(v: number | undefined) => setCompleteData({ ...completeData, actual_cost: v || 0 })}
                        thousandSeparator
                        className="bg-black/20 border-white/5 text-emerald-400 font-bold rounded-xl"
                        hint={`Parts cost: Rp ${partsCost.toLocaleString('id-ID')}`}
                    />
                    <div className="flex items-start gap-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Info size={20} className="text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Completing this work order will finalize all costs and update the asset status back to <span className="text-blue-400 font-bold uppercase tracking-wider">Active</span>.
                        </p>
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
                            Confirm Completion
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
        </div>
    );
}
