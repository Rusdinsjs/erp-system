// Departments Page - Tree Structure like Categories
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save } from 'lucide-react';
import { departmentApi, type DepartmentTreeNode, type CreateDepartmentRequest } from '../api/departments';
import {
    Button,
    Card,
    Input,
    Textarea,
    Select,
    LoadingOverlay,
    useToast,
    TreeItem,
    ActionIcon
} from '../components/ui';

export function Departments() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [selectedDepartment, setSelectedDepartment] = useState<DepartmentTreeNode | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Form State
    const [formData, setFormData] = useState<CreateDepartmentRequest>({
        parent_id: '',
        code: '',
        name: '',
        description: '',
    });

    const { data: treeData, isLoading } = useQuery({
        queryKey: ['departments-tree'],
        queryFn: departmentApi.tree,
    });

    // Flatten tree for parent selection dropdown
    const flatDepartments = useMemo(() => {
        const flatten = (nodes: DepartmentTreeNode[], depth = 0): { value: string; label: string }[] => {
            return nodes.reduce((acc, node) => {
                const prefix = '\u00A0\u00A0'.repeat(depth);
                const current = { value: node.id, label: `${prefix}${node.code} - ${node.name}` };
                const children = node.children ? flatten(node.children, depth + 1) : [];
                return [...acc, current, ...children];
            }, [] as { value: string; label: string }[]);
        };
        return treeData ? flatten(treeData) : [];
    }, [treeData]);

    const createMutation = useMutation({
        mutationFn: departmentApi.create,
        onSuccess: () => {
            success('Department created', 'Success');
            queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            handleReset();
        },
        onError: (error: any) => {
            showError(error.response?.data?.error || 'Failed to create department', 'Error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: CreateDepartmentRequest }) =>
            departmentApi.update(id, data),
        onSuccess: () => {
            success('Department updated', 'Success');
            queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            setIsEditing(false);
        },
        onError: (error: any) => {
            showError(error.response?.data?.error || 'Failed to update department', 'Error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: departmentApi.delete,
        onSuccess: () => {
            success('Department deleted', 'Success');
            queryClient.invalidateQueries({ queryKey: ['departments-tree'] });
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            if (selectedDepartment?.id === deleteMutation.variables) {
                handleReset();
            }
        },
    });

    const handleReset = () => {
        setSelectedDepartment(null);
        setIsEditing(false);
        setFormData({
            parent_id: '',
            code: '',
            name: '',
            description: '',
        });
    };

    const handleSelectDepartment = (department: DepartmentTreeNode) => {
        setSelectedDepartment(department);
        setIsEditing(true);
        setFormData({
            parent_id: department.parent_id || '',
            code: department.code,
            name: department.name,
            description: department.description || '',
        });
    };

    const handleStartCreate = () => {
        handleReset();
        setIsEditing(false);
    };

    const handleAddChild = (parentId: string) => {
        handleReset();
        setFormData(prev => ({ ...prev, parent_id: parentId }));
        setIsEditing(false);
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code || !formData.name) {
            showError('Code and Name are required', 'Validation Error');
            return;
        }

        const payload: CreateDepartmentRequest = {
            ...formData,
            parent_id: formData.parent_id || undefined,
        };

        if (selectedDepartment && isEditing) {
            updateMutation.mutate({ id: selectedDepartment.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this department? This will also delete all child departments.')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTree = (nodes: DepartmentTreeNode[], depth = 0) => {
        return nodes.map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expanded[node.id];

            return (
                <TreeItem
                    key={node.id}
                    label={
                        <span className="flex items-center justify-between w-full">
                            <span>{node.name} <span className="text-slate-500 text-xs">({node.code})</span></span>
                        </span>
                    }
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggle={(e) => toggleExpand(node.id, e)}
                    isActive={selectedDepartment?.id === node.id}
                    onClick={() => handleSelectDepartment(node)}
                    depth={depth}
                    actions={
                        <>
                            <ActionIcon
                                size="sm"
                                className="text-blue-400 hover:text-blue-300"
                                onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}
                                title="Add child department"
                            >
                                <Plus size={14} />
                            </ActionIcon>
                            <ActionIcon
                                variant="danger"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={(e) => handleDelete(node.id, e)}
                                title="Delete department"
                            >
                                <Trash2 size={14} />
                            </ActionIcon>
                        </>
                    }
                >
                    {hasChildren && isExpanded && renderTree(node.children!, depth + 1)}
                </TreeItem>
            );
        });
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            <div className="grid grid-cols-12 gap-6 h-full">
                {/* Tree View */}
                <div className="col-span-12 md:col-span-4 h-full flex flex-col">
                    <Card padding="md" className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h2 className="text-lg font-bold text-white">Departments</h2>
                            <Button size="sm" leftIcon={<Plus size={14} />} onClick={handleStartCreate}>
                                New Root
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 relative">
                            <LoadingOverlay visible={isLoading} />
                            {treeData && treeData.length > 0 ? (
                                <div className="space-y-1">
                                    {renderTree(treeData)}
                                </div>
                            ) : !isLoading && (
                                <p className="text-slate-500 text-center py-8">No departments found. Create one to get started.</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Edit Form */}
                <div className="col-span-12 md:col-span-8 h-full">
                    <Card padding="lg" className="h-full overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {selectedDepartment && isEditing ? `Edit: ${selectedDepartment.name}` : 'Create New Department'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Code"
                                    placeholder="e.g. FIN-01"
                                    required
                                    value={formData.code}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                />
                                <Input
                                    label="Name"
                                    placeholder="Department Name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>

                            <Select
                                label="Parent Department"
                                placeholder="Select parent (optional for root)"
                                options={[
                                    { value: '', label: '— None (Root Department) —' },
                                    ...flatDepartments.filter(d => d.value !== selectedDepartment?.id)
                                ]}
                                value={formData.parent_id || ''}
                                onChange={(val) => handleChange('parent_id', val)}
                            />

                            <Textarea
                                label="Description"
                                placeholder="Optional description..."
                                rows={3}
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <Button variant="outline" onClick={handleReset} type="button">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    leftIcon={<Save size={16} />}
                                    loading={createMutation.isPending || updateMutation.isPending}
                                >
                                    {selectedDepartment && isEditing ? 'Update Department' : 'Create Department'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
