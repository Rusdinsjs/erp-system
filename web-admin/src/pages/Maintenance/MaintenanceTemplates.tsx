import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Trash2, FileText, Settings, Copy, GripVertical,
    ChevronDown, ChevronUp, Printer, History, Filter
} from 'lucide-react';
import { workOrderApi } from '../../api/work-order';
import { categoryApi } from '../../api/category';
import type { TemplateTask } from '../../api/work-order';
import {
    Button,
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    Textarea,
    LoadingOverlay,
    useToast
} from '../../components/ui';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Task Row Component
function SortableTaskRow({
    task,
    isExpanded,
    onToggleExpand,
    onDelete,
}: {
    task: TemplateTask;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <React.Fragment>
            <TableRow
                ref={setNodeRef}
                style={style}
                className={`group hover:bg-muted/20 transition-colors ${isDragging ? 'bg-primary/10' : ''}`}
            >
                <TableTd align="center" className="py-3 w-10">
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                        title="Drag to reorder task"
                    >
                        <GripVertical size={16} />
                    </button>
                </TableTd>
                <TableTd align="center" className="py-3 w-16">
                    <Badge variant="default" className="bg-muted text-muted-foreground border border-border font-mono font-bold">
                        {task.task_number}
                    </Badge>
                </TableTd>
                <TableTd className="text-foreground font-bold px-4 py-3">
                    <div className="flex items-center justify-between">
                        <span>{task.description}</span>
                        {(task.instructions || task.expected_result) && (
                            <button
                                type="button"
                                onClick={onToggleExpand}
                                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium ml-2 shrink-0"
                            >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {isExpanded ? 'Hide details' : 'Show details'}
                            </button>
                        )}
                    </div>
                </TableTd>
                <TableTd align="center" className="py-3 w-20">
                    <ActionIcon
                        variant="danger"
                        onClick={onDelete}
                        className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white rounded-lg w-8 h-8"
                    >
                        <Trash2 size={16} />
                    </ActionIcon>
                </TableTd>
            </TableRow>

            {/* Expandable row detail */}
            {isExpanded && (task.instructions || task.expected_result) && (
                <TableRow className="bg-muted/10 border-b border-border/50">
                    <TableTd colSpan={4} className="px-12 py-3">
                        <div className="bg-background/80 border border-border rounded-xl p-3 text-xs space-y-2">
                            {task.instructions && (
                                <div>
                                    <span className="font-bold text-primary uppercase tracking-wider text-[10px] block mb-0.5">Instructions:</span>
                                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{task.instructions}</p>
                                </div>
                            )}
                            {task.expected_result && (
                                <div className={task.instructions ? "border-t border-border/50 pt-2" : ""}>
                                    <span className="font-bold text-emerald-500 uppercase tracking-wider text-[10px] block mb-0.5">Expected Result:</span>
                                    <p className="text-foreground font-medium">{task.expected_result}</p>
                                </div>
                            )}
                        </div>
                    </TableTd>
                </TableRow>
            )}
        </React.Fragment>
    );
}

export default function MaintenanceTemplates() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Modals state
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Expansion state for tasks
    const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

    // Filtering
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    // Form states
    const [newTemplate, setNewTemplate] = useState<{ name: string; description: string; asset_category_id: string }>({
        name: '',
        description: '',
        asset_category_id: '',
    });

    const [newTask, setNewTask] = useState<{
        task_number: number;
        description: string;
        instructions: string;
        expected_result: string;
    }>({
        task_number: 1,
        description: '',
        instructions: '',
        expected_result: '',
    });

    const [duplicateData, setDuplicateData] = useState<{ id: string; name: string }>({ id: '', name: '' });

    // Local state for sortable tasks to enable smooth drag & drop
    const [tasksList, setTasksList] = useState<TemplateTask[]>([]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Queries
    const { data: templates, isLoading: templatesLoading } = useQuery({
        queryKey: ['maintenance-templates'],
        queryFn: () => workOrderApi.getTemplates(),
    });

    const { data: categories } = useQuery({
        queryKey: ['asset-categories'],
        queryFn: () => categoryApi.list(),
    });

    const { data: selectedTemplate, isLoading: templateLoading } = useQuery({
        queryKey: ['maintenance-template', selectedTemplateId],
        queryFn: () => workOrderApi.getTemplate(selectedTemplateId!),
        enabled: !!selectedTemplateId,
    });

    const { data: versionHistory, isLoading: versionHistoryLoading } = useQuery({
        queryKey: ['maintenance-template-versions', selectedTemplateId],
        queryFn: () => workOrderApi.getTemplateVersions(selectedTemplateId!),
        enabled: !!selectedTemplateId && historyModalOpen,
    });

    // Update tasksList when selectedTemplate changes
    useEffect(() => {
        if (selectedTemplate?.tasks) {
            setTasksList(selectedTemplate.tasks);
        }
    }, [selectedTemplate]);

    // Mutations
    const createTemplateMutation = useMutation({
        mutationFn: (data: typeof newTemplate) => workOrderApi.createTemplate({
            name: data.name,
            description: data.description || undefined,
            asset_category_id: data.asset_category_id || undefined,
        }),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] });
            setTemplateModalOpen(false);
            setNewTemplate({ name: '', description: '', asset_category_id: '' });
            setSelectedTemplateId(res.id);
            success('Template created successfully', 'Success');
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to create template', 'Error');
        }
    });

    const deleteTemplateMutation = useMutation({
        mutationFn: (id: string) => workOrderApi.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] });
            if (selectedTemplateId) setSelectedTemplateId(null);
            success('Template deleted', 'Success');
        },
    });

    const duplicateTemplateMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => workOrderApi.duplicateTemplate(id, name),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] });
            setDuplicateModalOpen(false);
            setSelectedTemplateId(res.id);
            success('Template copied successfully', 'Success');
        },
        onError: (err: any) => {
            showError(err.message || 'Failed to copy template', 'Error');
        }
    });

    const addTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => workOrderApi.addTemplateTask(selectedTemplateId!, {
            task_number: data.task_number,
            description: data.description,
            instructions: data.instructions || undefined,
            expected_result: data.expected_result || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-template', selectedTemplateId] });
            setTaskModalOpen(false);
            setNewTask({
                task_number: (selectedTemplate?.tasks.length || 0) + 2,
                description: '',
                instructions: '',
                expected_result: '',
            });
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

    const reorderTasksMutation = useMutation({
        mutationFn: (taskIds: string[]) => workOrderApi.reorderTemplateTasks(selectedTemplateId!, taskIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-template', selectedTemplateId] });
        },
    });

    // Handle Drag End
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = tasksList.findIndex(t => t.id === active.id);
        const newIndex = tasksList.findIndex(t => t.id === over.id);

        const newTasks = arrayMove(tasksList, oldIndex, newIndex).map((t, idx) => ({
            ...t,
            task_number: idx + 1,
        }));

        setTasksList(newTasks);
        reorderTasksMutation.mutate(newTasks.map(t => t.id));
    };

    // Toggle Task Expansion
    const toggleExpandTask = (taskId: string) => {
        setExpandedTaskIds(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    // Filter templates by category
    const filteredTemplates = templates?.filter(t => {
        if (!categoryFilter) return true;
        return t.asset_category_id === categoryFilter;
    });

    // Print SOP Checklist PDF
    const handlePrintSOP = () => {
        if (!selectedTemplate) return;

        const categoryName = categories?.find(c => c.id === selectedTemplate.asset_category_id)?.name || 'General Operations';

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>SOP Checklist - ${selectedTemplate.name}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.5; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
                    .title { font-size: 24px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; margin: 0; }
                    .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; font-size: 12px; }
                    .meta-item { display: flex; flex-direction: column; }
                    .meta-label { font-weight: bold; color: #475569; text-transform: uppercase; font-size: 10px; }
                    .meta-val { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
                    th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                    td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                    .checkbox { width: 18px; h-18px; border: 2px solid #475569; border-radius: 4px; display: inline-block; }
                    .instructions { font-size: 11px; color: #334155; background: #f8fafc; padding: 8px; border-radius: 6px; border-left: 3px solid #2563eb; margin-top: 5px; }
                    .expected { font-size: 11px; color: #047857; font-weight: 600; margin-top: 4px; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
                    .sig-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; color: #475569; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 class="title">${selectedTemplate.name}</h1>
                    <div class="subtitle">Standard Operating Procedure (SOP) Maintenance Checklist</div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Asset Category</span>
                        <span class="meta-val">${categoryName}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Version</span>
                        <span class="meta-val">v${selectedTemplate.version || 1}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Description</span>
                        <span class="meta-val">${selectedTemplate.description || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Total Checklist Items</span>
                        <span class="meta-val">${tasksList.length} Tasks</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">Status</th>
                            <th style="width: 40px; text-align: center;">Seq</th>
                            <th>Task Description & Instructions</th>
                            <th style="width: 150px;">Notes / Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasksList.map(task => `
                            <tr>
                                <td style="text-align: center; padding-top: 15px;"><div class="checkbox"></div></td>
                                <td style="text-align: center; font-weight: bold; padding-top: 14px;">${task.task_number}</td>
                                <td>
                                    <div style="font-weight: bold; font-size: 13px;">${task.description}</div>
                                    ${task.instructions ? `<div class="instructions"><strong>Steps:</strong> ${task.instructions.replace(/\n/g, '<br/>')}</div>` : ''}
                                    ${task.expected_result ? `<div class="expected">✔ Expected: ${task.expected_result}</div>` : ''}
                                </td>
                                <td></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="signatures">
                    <div class="sig-box">
                        Field Technician Signature & Date
                    </div>
                    <div class="sig-box">
                        Supervisor Approval Signature & Date
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    if (templatesLoading) return <LoadingOverlay visible />;

    return (
        <div className="space-y-6 p-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            {/* Header section */}
            <div className="relative mb-8">
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">
                            Maintenance <span className="text-primary">Templates (SOP)</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                            <span className="w-8 h-[1px] bg-primary/50"></span>
                            Define, version, and print standardized operational checklist templates.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Templates List Column */}
                <Card className="lg:col-span-1 bg-card/60 backdrop-blur-xl border border-border shadow-2xl p-6 rounded-3xl relative overflow-hidden group">
                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available Templates</h2>
                            <span className="text-xs text-muted-foreground font-mono">{filteredTemplates?.length || 0} items</span>
                        </div>

                        {/* Category Filter Dropdown */}
                        <div className="relative mb-4">
                            <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-1.5">
                                <Filter size={14} className="text-muted-foreground" />
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="bg-transparent text-xs text-foreground font-medium w-full outline-none cursor-pointer"
                                >
                                    <option value="">All Categories</option>
                                    {categories?.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                            {filteredTemplates?.map((template) => {
                                const catName = categories?.find(c => c.id === template.asset_category_id)?.name;

                                return (
                                    <div
                                        key={template.id}
                                        onClick={() => {
                                            setSelectedTemplateId(template.id);
                                            setNewTask(prev => ({ ...prev, task_number: 1 }));
                                        }}
                                        className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 relative group ${selectedTemplateId === template.id
                                            ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                                            : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40 hover:border-border/80 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`p-2.5 rounded-xl transition-colors shrink-0 mt-0.5 ${selectedTemplateId === template.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    <Settings size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-bold text-sm tracking-tight truncate ${selectedTemplateId === template.id ? 'text-primary' : 'text-foreground'}`}>
                                                            {template.name}
                                                        </p>
                                                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-mono">
                                                            v{template.version || 1}
                                                        </Badge>
                                                    </div>

                                                    {/* Category & Task count Badge */}
                                                    <p className="text-[11px] font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                                                        <span>Kategori: <strong className="text-foreground">{catName || 'General'}</strong></span>
                                                    </p>

                                                    <p className="text-[10px] text-muted-foreground/80 mt-1 truncate">
                                                        {template.description || 'No description provided'}
                                                    </p>

                                                    {/* Usage analytics display */}
                                                    <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                                                        <span>Used: <strong className="text-foreground">{template.usage_count || 0}x</strong></span>
                                                        <span>Last: <strong className="text-foreground">{template.last_used_at ? new Date(template.last_used_at).toLocaleDateString() : 'Never'}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action buttons (Copy / Delete) */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ActionIcon
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Copy Template"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        setDuplicateData({ id: template.id, name: `${template.name} (Copy)` });
                                                        setDuplicateModalOpen(true);
                                                    }}
                                                    className="hover:bg-primary/20 hover:text-primary rounded-lg w-7 h-7"
                                                >
                                                    <Copy size={14} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="danger"
                                                    size="sm"
                                                    title="Delete Template"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this template?')) deleteTemplateMutation.mutate(template.id);
                                                    }}
                                                    className="hover:bg-destructive hover:text-white rounded-lg w-7 h-7"
                                                >
                                                    <Trash2 size={14} />
                                                </ActionIcon>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredTemplates?.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground font-medium text-sm italic">
                                    No templates found matching category filter.
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Selected Template Tasks & Detail Column */}
                <Card className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border shadow-2xl p-6 rounded-3xl overflow-hidden relative">
                    {selectedTemplateId ? (
                        <div className="space-y-6 relative z-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-foreground tracking-tight">{selectedTemplate?.name}</h2>
                                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/30 font-mono font-bold">
                                            v{selectedTemplate?.version || 1}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground font-medium text-sm mt-1">{selectedTemplate?.description || 'No description'}</p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<History size={16} />}
                                        onClick={() => setHistoryModalOpen(true)}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground"
                                    >
                                        History
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<Printer size={16} />}
                                        onClick={handlePrintSOP}
                                        className="text-xs font-bold text-primary hover:bg-primary/10"
                                    >
                                        Print SOP
                                    </Button>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<Plus size={16} />}
                                        onClick={() => {
                                            setNewTask({
                                                task_number: (selectedTemplate?.tasks.length || 0) + 1,
                                                description: '',
                                                instructions: '',
                                                expected_result: '',
                                            });
                                            setTaskModalOpen(true);
                                        }}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-bold tracking-wider text-xs"
                                    >
                                        Add Task
                                    </Button>
                                </div>
                            </div>

                            {templateLoading ? <LoadingOverlay visible /> : (
                                <div className="overflow-hidden rounded-2xl border border-border">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <Table className="w-full text-left text-sm text-foreground">
                                            <TableHead className="bg-muted/30 border-b border-border">
                                                <TableRow>
                                                    <TableTh className="w-10 text-center px-2 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order</TableTh>
                                                    <TableTh className="w-16 text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seq</TableTh>
                                                    <TableTh className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Task & Step Instructions</TableTh>
                                                    <TableTh className="w-20 text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableTh>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody className="divide-y divide-border/50">
                                                <SortableContext
                                                    items={tasksList.map(t => t.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {tasksList.map((task: TemplateTask) => (
                                                        <SortableTaskRow
                                                            key={task.id}
                                                            task={task}
                                                            isExpanded={!!expandedTaskIds[task.id]}
                                                            onToggleExpand={() => toggleExpandTask(task.id)}
                                                            onDelete={() => deleteTaskMutation.mutate(task.id)}
                                                        />
                                                    ))}
                                                </SortableContext>

                                                {tasksList.length === 0 && (
                                                    <TableRow>
                                                        <TableTd colSpan={4}>
                                                            <TableEmpty message="Click 'Add Task' to build your checklist template." colSpan={4} />
                                                        </TableTd>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </DndContext>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-32 text-center relative z-10">
                            <div className="w-24 h-24 bg-muted/50 border border-border rounded-full flex items-center justify-center mb-6 text-muted-foreground shadow-inner">
                                <FileText size={48} className="opacity-50" />
                            </div>
                            <h3 className="text-2xl font-black text-foreground tracking-tight">Select a Template</h3>
                            <p className="text-muted-foreground max-w-sm mt-3 font-medium">
                                Choose a maintenance template from the left or create a new one to manage checklist items.
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Create Template Modal */}
            <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create Maintenance Template" size="md">
                <div className="space-y-5 p-6">
                    <Input
                        label="Template Name"
                        placeholder="e.g. Servis Berkala 5.000 KM"
                        value={newTemplate.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Asset Category (optional)</label>
                        <select
                            value={newTemplate.asset_category_id}
                            onChange={(e) => setNewTemplate({ ...newTemplate, asset_category_id: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Categories (General)</option>
                            {categories?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <Textarea
                        label="Description"
                        placeholder="Brief explanation of when to use this template"
                        value={newTemplate.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => createTemplateMutation.mutate(newTemplate)}
                            loading={createTemplateMutation.isPending}
                        >
                            Create Template
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Task Modal */}
            <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Task to Template" size="md">
                <div className="space-y-5 p-6">
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

                    <Textarea
                        label="Instructions (optional)"
                        placeholder="Step-by-step instructions (e.g. 1. Matikan mesin 2. Buka drat bawah)"
                        value={newTask.instructions}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTask({ ...newTask, instructions: e.target.value })}
                    />

                    <Input
                        label="Expected Result (optional)"
                        placeholder="e.g. Oil level at max mark"
                        value={newTask.expected_result}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, expected_result: e.target.value })}
                    />

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

            {/* Duplicate / Copy Modal */}
            <Modal isOpen={duplicateModalOpen} onClose={() => setDuplicateModalOpen(false)} title="Duplicate Template" size="md">
                <div className="space-y-5 p-6">
                    <Input
                        label="New Template Name"
                        value={duplicateData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuplicateData({ ...duplicateData, name: e.target.value })}
                        required
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setDuplicateModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={() => duplicateTemplateMutation.mutate(duplicateData)}
                            loading={duplicateTemplateMutation.isPending}
                        >
                            Copy Template
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Version History Modal */}
            <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title="Template Version History" size="md">
                <div className="p-6 space-y-4">
                    {versionHistoryLoading ? <LoadingOverlay visible /> : (
                        <div className="space-y-3">
                            {versionHistory?.map(ver => (
                                <div key={ver.id} className="p-3 border border-border rounded-xl bg-muted/20 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">{ver.name}</span>
                                            <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                v{ver.version || 1}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Created: {new Date(ver.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedTemplateId(ver.id);
                                            setHistoryModalOpen(false);
                                        }}
                                        className="text-xs font-bold text-primary"
                                    >
                                        View
                                    </Button>
                                </div>
                            ))}
                            {versionHistory?.length === 0 && (
                                <p className="text-center py-6 text-xs text-muted-foreground">No prior version history found.</p>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
