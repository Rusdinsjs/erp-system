// WorkOrderDetails Page - Pure Tailwind
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, CheckSquare, Wrench, Plus, Trash2, DollarSign, Play, Check, AlertCircle } from 'lucide-react';
import { workOrderApi } from '../api/work-order';
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
        <div className="space-y-6">
            {/* Back Button */}
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/work-orders')}>
                Back to List
            </Button>

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-white">{wo.wo_number}</h1>
                        <Badge variant={statusBadge[wo.status]}>{wo.status.toUpperCase()}</Badge>
                        <Badge variant="default">{wo.priority}</Badge>
                    </div>
                    <p className="text-slate-400">{wo.wo_type}</p>
                </div>
                <div className="flex gap-2">
                    {wo.status === 'assigned' && (
                        <Button leftIcon={<Play size={16} />} onClick={() => startMutation.mutate()} loading={startMutation.isPending}>
                            Start Work
                        </Button>
                    )}
                    {wo.status === 'in_progress' && (
                        <Button variant="primary" leftIcon={<Check size={16} />} onClick={() => setCompleteModalOpen(true)}>
                            Complete
                        </Button>
                    )}
                </div>
            </div>

            {/* Cost Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <DollarSign size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Parts Cost</p>
                            <p className="text-lg font-bold text-white">Rp {partsCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <DollarSign size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Labor Cost</p>
                            <p className="text-lg font-bold text-white">Rp {laborCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md" className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/30 flex items-center justify-center">
                            <DollarSign size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Total Cost</p>
                            <p className="text-xl font-bold text-white">Rp {totalCost.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Card padding="none">
                <Tabs defaultValue="overview">
                    <TabsList className="px-4 pt-4">
                        <TabsTrigger value="overview" icon={<Info size={14} />}>Overview</TabsTrigger>
                        <TabsTrigger value="tasks" icon={<CheckSquare size={14} />}>Tasks ({tasks?.length || 0})</TabsTrigger>
                        <TabsTrigger value="parts" icon={<Wrench size={14} />}>Parts ({parts?.length || 0})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Problem Description</p>
                                    <p className="text-slate-400">{wo.problem_description || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Safety Requirements</p>
                                    <p className="text-slate-400">{Array.isArray(wo.safety_requirements) ? wo.safety_requirements.join(', ') : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Dates</p>
                                    <p className="text-sm text-slate-400">Scheduled: {wo.scheduled_date || '-'}</p>
                                    <p className="text-sm text-slate-400">Actual Start: {wo.actual_start_date ? new Date(wo.actual_start_date).toLocaleString() : '-'}</p>
                                    <p className="text-sm text-slate-400">Completed: {wo.actual_end_date ? new Date(wo.actual_end_date).toLocaleString() : '-'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Work Performed</p>
                                    <p className="text-slate-400">{wo.work_performed || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Assigned Technician</p>
                                    <p className="text-slate-400">{wo.assigned_technician || 'Unassigned'}</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tasks" className="p-4">
                        <div className="flex justify-end mb-4">
                            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setTaskModalOpen(true)}>Add Task</Button>
                        </div>
                        <LoadingOverlay visible={tasksLoading} />
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>#</TableTh>
                                    <TableTh>Description</TableTh>
                                    <TableTh>Status</TableTh>
                                    <TableTh align="center">Actions</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tasks?.length ? tasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableTd>{task.task_number}</TableTd>
                                        <TableTd>{task.description}</TableTd>
                                        <TableTd>
                                            <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                                                {task.status}
                                            </Badge>
                                        </TableTd>
                                        <TableTd align="center">
                                            <ActionIcon variant="danger" onClick={() => removeTaskMutation.mutate(task.id)}>
                                                <Trash2 size={16} />
                                            </ActionIcon>
                                        </TableTd>
                                    </TableRow>
                                )) : (
                                    <TableEmpty colSpan={4} message="No tasks defined" />
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="parts" className="p-4">
                        <div className="flex justify-end mb-4">
                            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setPartModalOpen(true)}>Add Part</Button>
                        </div>
                        <LoadingOverlay visible={partsLoading} />
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Part Name</TableTh>
                                    <TableTh>Qty</TableTh>
                                    <TableTh>Unit Cost</TableTh>
                                    <TableTh>Total</TableTh>
                                    <TableTh align="center">Actions</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {parts?.length ? parts.map(part => (
                                    <TableRow key={part.id}>
                                        <TableTd>{part.part_name}</TableTd>
                                        <TableTd>{Number(part.quantity)}</TableTd>
                                        <TableTd>Rp {Number(part.unit_cost).toLocaleString('id-ID')}</TableTd>
                                        <TableTd className="font-bold">Rp {Number(part.total_cost).toLocaleString('id-ID')}</TableTd>
                                        <TableTd align="center">
                                            <ActionIcon variant="danger" onClick={() => removePartMutation.mutate(part.id)}>
                                                <Trash2 size={16} />
                                            </ActionIcon>
                                        </TableTd>
                                    </TableRow>
                                )) : (
                                    <TableEmpty colSpan={5} message="No parts used" />
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Add Task Modal */}
            <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Task">
                <div className="space-y-4">
                    <NumberInput
                        label="Task Number"
                        value={newTask.task_number}
                        onChange={(v) => setNewTask({ ...newTask, task_number: v || 1 })}
                    />
                    <Input
                        label="Description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <div className="flex justify-end">
                        <Button onClick={() => addTaskMutation.mutate(newTask)} loading={addTaskMutation.isPending}>Add</Button>
                    </div>
                </div>
            </Modal>

            {/* Add Part Modal */}
            <Modal isOpen={partModalOpen} onClose={() => setPartModalOpen(false)} title="Add Spare Part">
                <div className="space-y-4">
                    <Input
                        label="Part Name"
                        value={newPart.part_name}
                        onChange={(e) => setNewPart({ ...newPart, part_name: e.target.value })}
                    />
                    <NumberInput
                        label="Quantity"
                        value={newPart.quantity}
                        onChange={(v) => setNewPart({ ...newPart, quantity: v || 1 })}
                    />
                    <NumberInput
                        label="Unit Cost"
                        prefix="Rp "
                        value={newPart.unit_cost}
                        onChange={(v) => setNewPart({ ...newPart, unit_cost: v || 0 })}
                    />
                    <div className="flex justify-end">
                        <Button onClick={() => addPartMutation.mutate(newPart)} loading={addPartMutation.isPending}>Add</Button>
                    </div>
                </div>
            </Modal>

            {/* Complete Modal */}
            <Modal isOpen={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Work Order">
                <div className="space-y-4">
                    <Input
                        label="Work Performed"
                        value={completeData.work_performed}
                        onChange={(e) => setCompleteData({ ...completeData, work_performed: e.target.value })}
                    />
                    <NumberInput
                        label="Actual Labor Cost"
                        prefix="Rp "
                        value={completeData.actual_cost}
                        onChange={(v) => setCompleteData({ ...completeData, actual_cost: v || 0 })}
                        hint="Parts cost is calculated automatically"
                    />
                    <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                        <AlertCircle size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-300">
                            Completing this WO will change asset status to DEPLOYED.
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="primary" onClick={() => completeMutation.mutate(completeData)} loading={completeMutation.isPending}>
                            Complete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
