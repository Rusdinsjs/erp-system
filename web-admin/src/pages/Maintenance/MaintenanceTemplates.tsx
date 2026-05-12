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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Maintenance Templates</h1>
                    <p className="text-gray-400">Manage standard checklist templates for recurring maintenance tasks.</p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={20} />}
                    onClick={() => setTemplateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 rounded-xl"
                >
                    Create Template
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Templates List */}
                <Card className="lg:col-span-1">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white px-2">Available Templates</h2>
                        <div className="space-y-2">
                            {templates?.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => {
                                        setSelectedTemplateId(template.id);
                                        setNewTask(prev => ({ ...prev, task_number: 1 }));
                                    }}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedTemplateId === template.id
                                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                                        : 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedTemplateId === template.id ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                                                <Settings size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{template.name}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{template.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <ActionIcon
                                            variant="danger"
                                            size="sm"
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this template?')) deleteTemplateMutation.mutate(template.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </ActionIcon>
                                    </div>
                                </div>
                            ))}
                            {templates?.length === 0 && (
                                <div className="text-center py-8 text-gray-500 italic">No templates yet.</div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Template Detail / Tasks */}
                <Card className="lg:col-span-2">
                    {selectedTemplateId ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">{selectedTemplate?.name}</h2>
                                    <p className="text-gray-400 text-sm">{selectedTemplate?.description}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<Plus size={16} />}
                                    onClick={() => {
                                        setNewTask({ task_number: (selectedTemplate?.tasks.length || 0) + 1, description: '' });
                                        setTaskModalOpen(true);
                                    }}
                                    className="text-blue-400 hover:bg-blue-500/10 rounded-lg"
                                >
                                    Add Task
                                </Button>
                            </div>

                            {templateLoading ? <LoadingOverlay visible /> : (
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableTh className="w-20 text-center">Seq</TableTh>
                                            <TableTh>Description</TableTh>
                                            <TableTh className="w-20 text-center">Action</TableTh>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedTemplate?.tasks.map((task: TemplateTask) => (
                                            <TableRow key={task.id} className="group hover:bg-white/5">
                                                <TableTd align="center">
                                                    <Badge variant="default" className="bg-gray-800 text-gray-400">
                                                        {task.task_number}
                                                    </Badge>
                                                </TableTd>
                                                <TableTd className="text-gray-300 font-medium">{task.description}</TableTd>
                                                <TableTd align="center">
                                                    <ActionIcon
                                                        variant="danger"
                                                        onClick={() => deleteTaskMutation.mutate(task.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </ActionIcon>
                                                </TableTd>
                                            </TableRow>
                                        ))}
                                        {selectedTemplate?.tasks.length === 0 && (
                                            <TableEmpty colSpan={3} message="Click 'Add Task' to build your checklist template." />
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-600">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-xl font-medium text-gray-400">Select a template to view tasks</h3>
                            <p className="text-gray-500 max-w-sm mt-2">Choose a maintenance template from the list on the left or create a new one to start defining standard checklists.</p>
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
