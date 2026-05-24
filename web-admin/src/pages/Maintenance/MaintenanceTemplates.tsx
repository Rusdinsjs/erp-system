import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Settings } from 'lucide-react';
import { workOrderApi } from '../../api/work-order';
import type { TemplateTask } from '../../api/work-order';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    LoadingOverlay,
    useToast
} from '../../components/ui';

export default function MaintenanceTemplates() {
    const queryClient = useQueryClient();
    const { success } = useToast();
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Form states
    const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
    const [newTask, setNewTask] = useState({ task_number: 1, description: '' });

    // Queries
    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ['maintenance-templates'],
        queryFn: () => workOrderApi.getTemplates(),
    });

    const { data: selectedTemplate, isLoading: templateLoading } = useQuery({
        queryKey: ['maintenance-template', selectedTemplateId],
        queryFn: () => workOrderApi.getTemplate(selectedTemplateId!),
        enabled: !!selectedTemplateId,
    });

    // Mutations
    const createTemplateMutation = useMutation({
        mutationFn: (data: typeof newTemplate) => workOrderApi.createTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] });
            setTemplateModalOpen(false);
            setNewTemplate({ name: '', description: '' });
            success('Template created', 'Success');
        },
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: (id: string) => workOrderApi.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] });
            if (selectedTemplateId) setSelectedTemplateId(null);
            success('Template deleted', 'Success');
        },
    });

    const addTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => workOrderApi.addTemplateTask(selectedTemplateId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-template', selectedTemplateId] });
            setTaskModalOpen(false);
            setNewTask({ task_number: (selectedTemplate?.tasks.length || 0) + 2, description: '' });
            success('Task added to template', 'Success');
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: (taskId: string) => workOrderApi.deleteTemplateTask(selectedTemplateId!, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-template', selectedTemplateId] });
            success('Task removed from template', 'Success');
        },
    });

    if (templatesLoading) return <LoadingOverlay visible />;

    return (
        <div className="space-y-6 p-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            <div className="relative mb-8">
                {/* Decorative background element */}
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="flex justify-between items-end relative z-10">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">
                            Maintenance <span className="text-primary">Templates</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                            <span className="w-8 h-[1px] bg-primary/50"></span>
                            Manage standard checklist templates for recurring maintenance tasks.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={20} />}
                        onClick={() => setTemplateModalOpen(true)}
                        className="rounded-xl shadow-lg shadow-blue-500/20 text-white font-bold tracking-wider"
                    >
                        Create Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Templates List */}
                {/* Templates List */}
                <Card className="lg:col-span-1 bg-card/60 backdrop-blur-xl border border-border shadow-2xl p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform duration-700 group-hover:scale-150 pointer-events-none" />
                    <div className="space-y-6 relative z-10">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Available Templates</h2>
                        <div className="space-y-3">
                            {templates?.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => {
                                        setSelectedTemplateId(template.id);
                                        setNewTask(prev => ({ ...prev, task_number: 1 }));
                                    }}
                                    className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 ${selectedTemplateId === template.id
                                        ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                                        : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl transition-colors ${selectedTemplateId === template.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:text-primary'}`}>
                                                <Settings size={20} />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm tracking-tight ${selectedTemplateId === template.id ? 'text-primary' : 'text-foreground'}`}>{template.name}</p>
                                                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground truncate max-w-[150px] mt-1">{template.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <ActionIcon
                                            variant="danger"
                                            size="sm"
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this template?')) deleteTemplateMutation.mutate(template.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white rounded-lg w-8 h-8"
                                        >
                                            <Trash2 size={14} />
                                        </ActionIcon>
                                    </div>
                                </div>
                            ))}
                            {templates?.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground font-medium text-sm italic">No templates yet.</div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Template Detail / Tasks */}
                <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border shadow-2xl p-6 rounded-3xl overflow-hidden relative">
                    {selectedTemplateId ? (
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-start border-b border-border/50 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">{selectedTemplate?.name}</h2>
                                    <p className="text-muted-foreground font-medium text-sm">{selectedTemplate?.description}</p>
                                </div>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Plus size={16} />}
                                    onClick={() => {
                                        setNewTask({ task_number: (selectedTemplate?.tasks.length || 0) + 1, description: '' });
                                        setTaskModalOpen(true);
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-bold tracking-wider text-xs"
                                >
                                    Add Task
                                </Button>
                            </div>

                            {templateLoading ? <LoadingOverlay visible /> : (
                                <div className="overflow-hidden rounded-2xl border border-border">
                                    <Table className="w-full text-left text-sm text-foreground">
                                        <TableHead className="bg-muted/30 border-b border-border">
                                            <TableRow>
                                                <TableTh className="w-20 text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seq</TableTh>
                                                <TableTh className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</TableTh>
                                                <TableTh className="w-20 text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableTh>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody className="divide-y divide-border/50">
                                            {selectedTemplate?.tasks.map((task: TemplateTask) => (
                                                <TableRow key={task.id} className="group hover:bg-muted/20 transition-colors">
                                                    <TableTd align="center" className="py-4">
                                                        <Badge variant="default" className="bg-muted text-muted-foreground border border-border font-mono font-bold">
                                                            {task.task_number}
                                                        </Badge>
                                                    </TableTd>
                                                    <TableTd className="text-foreground font-bold px-6 py-4">{task.description}</TableTd>
                                                    <TableTd align="center" className="py-4">
                                                        <ActionIcon
                                                            variant="danger"
                                                            onClick={() => deleteTaskMutation.mutate(task.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white rounded-lg w-8 h-8"
                                                        >
                                                            <Trash2 size={16} />
                                                        </ActionIcon>
                                                    </TableTd>
                                                </TableRow>
                                            ))}
                                            {selectedTemplate?.tasks.length === 0 && (
                                                <TableRow>
                                                    <TableTd colSpan={3}>
                                                        <TableEmpty message="Click 'Add Task' to build your checklist template." colSpan={3} />
                                                    </TableTd>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-32 text-center relative z-10">
                            <div className="w-24 h-24 bg-muted/50 border border-border rounded-full flex items-center justify-center mb-6 text-muted-foreground shadow-inner">
                                <FileText size={48} className="opacity-50" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground tracking-tight">Select a Template</h3>
                            <p className="text-muted-foreground max-w-sm mt-3 font-medium">Choose a maintenance template from the list on the left or create a new one to start defining standard checklists.</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Template Modal */}
            <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create Maintenance Template" size="md">
                <div className="space-y-6 p-6">
                    <Input
                        label="Template Name"
                        placeholder="e.g. Servis Berkala 5.000 KM"
                        value={newTemplate.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Description"
                        placeholder="Brief explanation of when to use this template"
                        value={newTemplate.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => createTemplateMutation.mutate(newTemplate)}
                            loading={createTemplateMutation.isPending}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Task Modal */}
            <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Task to Template" size="md">
                <div className="space-y-6 p-6">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <Input
                                label="Seq #"
                                type="number"
                                value={newTask.task_number}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, task_number: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="col-span-3">
                            <Input
                                label="Task Description"
                                placeholder="e.g. Ganti Oli Mesin"
                                value={newTask.description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, description: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => addTaskMutation.mutate(newTask)}
                            loading={addTaskMutation.isPending}
                        >
                            Add Task
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
