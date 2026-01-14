// Categories Page - Pure Tailwind
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save } from 'lucide-react';
import { api } from '../api/client';
import {
    Button,
    Card,
    Input,
    Textarea,
    NumberInput,
    Select,
    LoadingOverlay,
    Tabs, TabsList, TabsTrigger, TabsContent,
    useToast,
    TreeItem,
    TagsInput,
    ActionIcon
} from '../components/ui';

interface Category {
    id: string;
    parent_id: string | null;
    code: string;
    name: string;
    description: string | null;
    main_category: string | null;
    sub_category_letter: string | null;
    function_description: string | null;
    display_order: number;
    depreciation_method: string | null;
    depreciation_period_months: number | null;
    example_assets: string[] | null;
    full_path?: string;
    children?: Category[];
}

interface CategoryRequest {
    parent_id: string | null;
    code: string;
    name: string;
    description: string;
    main_category: string;
    sub_category_letter: string;
    function_description: string;
    display_order: number;
    depreciation_method: string;
    depreciation_period_months: number | null;
    example_assets: string[];
}

const MAIN_CATEGORIES = [
    'ASET INTI (RENTAL)',
    'ASET OPERASIONAL',
    'ASET TETAP INFRASTRUKTUR'
];

export function Categories() {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Form State
    const [formData, setFormData] = useState({
        parent_id: '' as string,
        code: '',
        name: '',
        description: '',
        main_category: '',
        sub_category_letter: '',
        function_description: '',
        display_order: 0,
        depreciation_method: 'straight_line',
        depreciation_period_months: '' as string | number, // Allow string for empty input
        example_assets: [] as string[],
    });

    const { data: treeData, isLoading } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return res.data.data as Category[];
        },
    });

    // Flatten tree for parent selection
    const flatCategories = useMemo(() => {
        const flatten = (nodes: Category[], depth = 0): { value: string; label: string }[] => {
            return nodes.reduce((acc, node) => {
                const current = { value: node.id, label: `${node.code} - ${node.name}` };
                const children = node.children ? flatten(node.children, depth + 1) : [];
                return [...acc, current, ...children];
            }, [] as { value: string; label: string }[]);
        };
        return treeData ? flatten(treeData) : [];
    }, [treeData]);

    const createMutation = useMutation({
        mutationFn: (values: CategoryRequest) => api.post('/categories', values),
        onSuccess: () => {
            success('Category created', 'Success');
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            handleReset();
        },
        onError: (error: any) => {
            showError(error.response?.data?.error || 'Failed to create category', 'Error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: CategoryRequest }) => api.put(`/categories/${id}`, values),
        onSuccess: () => {
            success('Category updated', 'Success');
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            setIsEditing(false);
        },
        onError: (error: any) => {
            showError(error.response?.data?.error || 'Failed to update category', 'Error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/categories/${id}`),
        onSuccess: () => {
            success('Category deleted', 'Success');
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            if (selectedCategory?.id === deleteMutation.variables) {
                handleReset();
            }
        },
    });

    const handleReset = () => {
        setSelectedCategory(null);
        setIsEditing(false);
        setFormData({
            parent_id: '',
            code: '',
            name: '',
            description: '',
            main_category: '',
            sub_category_letter: '',
            function_description: '',
            display_order: 0,
            depreciation_method: 'straight_line',
            depreciation_period_months: '',
            example_assets: [],
        });
    };

    const handleSelectCategory = (category: Category) => {
        setSelectedCategory(category);
        setIsEditing(true);
        setFormData({
            parent_id: category.parent_id || '',
            code: category.code,
            name: category.name,
            description: category.description || '',
            main_category: category.main_category || '',
            sub_category_letter: category.sub_category_letter || '',
            function_description: category.function_description || '',
            display_order: category.display_order || 0,
            depreciation_method: category.depreciation_method || 'straight_line',
            depreciation_period_months: category.depreciation_period_months ?? '',
            example_assets: category.example_assets || [],
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

        const payload: CategoryRequest = {
            ...formData,
            parent_id: formData.parent_id || null,
            depreciation_period_months: formData.depreciation_period_months === '' ? null : Number(formData.depreciation_period_months),
        };

        if (selectedCategory && isEditing) {
            updateMutation.mutate({ id: selectedCategory.id, values: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this category?')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTree = (nodes: Category[], depth = 0) => {
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
                    isActive={selectedCategory?.id === node.id}
                    onClick={() => handleSelectCategory(node)}
                    depth={depth}
                    actions={
                        <>
                            <ActionIcon
                                size="sm"
                                className="text-blue-400 hover:text-blue-300"
                                onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}
                            >
                                <Plus size={14} />
                            </ActionIcon>
                            <ActionIcon
                                variant="danger"
                                size="sm"
                                className="text-red-400 hover:text-red-300"
                                onClick={(e) => handleDelete(node.id, e)}
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
                            <h2 className="text-lg font-bold text-white">Categories</h2>
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
                                <p className="text-slate-500 text-center py-8">No categories found</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Edit Form */}
                <div className="col-span-12 md:col-span-8 h-full">
                    <Card padding="lg" className="h-full overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {selectedCategory && isEditing ? `Edit Category: ${selectedCategory.name}` : 'Create New Category'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <Tabs defaultValue="general">
                                <TabsList>
                                    <TabsTrigger value="general">General</TabsTrigger>
                                    <TabsTrigger value="classification">Classification</TabsTrigger>
                                    <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
                                </TabsList>

                                <TabsContent value="general" className="mt-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Code"
                                            placeholder="e.g. A01"
                                            required
                                            value={formData.code}
                                            onChange={(e) => handleChange('code', e.target.value)}
                                        />
                                        <Input
                                            label="Name"
                                            placeholder="Category Name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                        />
                                    </div>

                                    <Select
                                        label="Parent Category"
                                        placeholder="Select parent (optional)"
                                        options={flatCategories}
                                        value={formData.parent_id}
                                        onChange={(val) => handleChange('parent_id', val)}
                                    />

                                    <Textarea
                                        label="Description"
                                        placeholder="Additional details..."
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                    />
                                </TabsContent>

                                <TabsContent value="classification" className="mt-6 space-y-4">
                                    <Select
                                        label="Main Category"
                                        placeholder="Select Main Category Class"
                                        options={MAIN_CATEGORIES.map(c => ({ value: c, label: c }))}
                                        value={formData.main_category}
                                        onChange={(val) => handleChange('main_category', val)}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Sub-Category Letter"
                                            placeholder="e.g. A, B, C"
                                            maxLength={5}
                                            value={formData.sub_category_letter}
                                            onChange={(e) => handleChange('sub_category_letter', e.target.value)}
                                        />
                                        <NumberInput
                                            label="Display Order"
                                            value={formData.display_order}
                                            onChange={(val) => handleChange('display_order', val)}
                                        />
                                    </div>

                                    <Textarea
                                        label="Function/Role Description"
                                        placeholder="Role in asset management..."
                                        rows={2}
                                        value={formData.function_description}
                                        onChange={(e) => handleChange('function_description', e.target.value)}
                                    />

                                    <TagsInput
                                        label="Example Assets"
                                        placeholder="Enter representative assets and press Enter"
                                        value={formData.example_assets}
                                        onChange={(tags) => handleChange('example_assets', tags)}
                                    />
                                </TabsContent>

                                <TabsContent value="depreciation" className="mt-6 space-y-4">
                                    <Select
                                        label="Depreciation Method"
                                        options={[
                                            { value: 'straight_line', label: 'Straight Line' },
                                            { value: 'declining_balance', label: 'Declining Balance' },
                                            { value: 'none', label: 'No Depreciation' },
                                        ]}
                                        value={formData.depreciation_method}
                                        onChange={(val) => handleChange('depreciation_method', val)}
                                    />

                                    <NumberInput
                                        label="Useful Life (Months)"
                                        placeholder="0"
                                        min={0}
                                        value={formData.depreciation_period_months === '' ? 0 : Number(formData.depreciation_period_months)}
                                        onChange={(val) => handleChange('depreciation_period_months', val)}
                                        hint="Standard useful life for assets in this category"
                                    />
                                </TabsContent>
                            </Tabs>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800">
                                <Button variant="outline" onClick={handleReset} type="button">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    leftIcon={<Save size={16} />}
                                    loading={createMutation.isPending || updateMutation.isPending}
                                >
                                    {selectedCategory && isEditing ? 'Update Category' : 'Create Category'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
