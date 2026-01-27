import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '../../api/http';
import { Modal, Button, Input, Select, Textarea, useToast, Tabs, TabsList, TabsTrigger, TabsContent, TagsInput } from '../ui';

interface CreateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newCategoryId: string) => void;
}

const MAIN_CATEGORIES = [
    'ASET INTI (RENTAL)',
    'ASET OPERASIONAL',
    'ASET TETAP INFRASTRUKTUR'
];

export function CreateCategoryModal({ isOpen, onClose, onSuccess }: CreateCategoryModalProps) {
    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        parent_id: '',
        main_category: '', // Optional/Auto-inferred?
        description: '',
        attributes: [] as string[],
        asset_account_id: '',
        expense_account_id: '',
        accumulated_depreciation_account_id: '',
    });

    // We need parent categories for the dropdown
    // Re-using the query key from elsewhere to hit cache if available
    const { data: treeData } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return res.data.data as any[];
        },
        staleTime: 5 * 60 * 1000,
        enabled: isOpen // Only fetch when open
    });

    // Fetch accounts for mapping
    const { data: accountsData } = useQuery({
        queryKey: ['finance-accounts'],
        queryFn: async () => {
            const res = await api.get('/finance/accounts');
            return res.data.data as any[];
        },
        staleTime: 5 * 60 * 1000,
        enabled: isOpen
    });

    const accountOptions = useMemo(() => {
        return (accountsData || []).map(acc => ({
            value: acc.id,
            label: `${acc.code} - ${acc.name}`
        }));
    }, [accountsData]);

    // Helper to flatten
    const flatCategories = useMemo(() => {
        const flatten = (nodes: any[]): { value: string; label: string }[] => {
            return nodes.reduce((acc, node) => {
                const current = { value: node.id, label: `${node.code} - ${node.name}` };
                const children = node.children ? flatten(node.children) : [];
                return [...acc, current, ...children];
            }, [] as { value: string; label: string }[]);
        };
        return treeData ? flatten(treeData) : [];
    }, [treeData]);

    const mutation = useMutation({
        mutationFn: (values: any) => api.post('/categories', values),
        onSuccess: (res) => {
            const newCategory = res.data;
            success('Category created successfully', 'Success');
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            queryClient.invalidateQueries({ queryKey: ['categories-flat'] });

            onSuccess(newCategory.id || newCategory.data?.id); // Adjust based on API response structure
            handleClose();
        },
        onError: (err: any) => {
            showError(err.response?.data?.error || 'Failed to create category', 'Error');
        }
    });

    const [activeTab, setActiveTab] = useState('general');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        mutation.mutate({
            ...formData,
            parent_id: formData.parent_id || null,
            main_category: formData.main_category || null,
            description: formData.description || null,
            // Defaults for other fields as this is a "Quick Add"
            display_order: 0,
            sub_category_letter: null,
            function_description: null,
            depreciation_method: 'straight_line',
            depreciation_period_months: null,
            example_assets: [],
            // attributes is already in formData
            asset_account_id: formData.asset_account_id || null,
            expense_account_id: formData.expense_account_id || null,
            accumulated_depreciation_account_id: formData.accumulated_depreciation_account_id || null,
        });
    };

    const handleClose = () => {
        setFormData({
            code: '',
            name: '',
            parent_id: '',
            main_category: '',
            description: '',
            attributes: [],
            asset_account_id: '',
            expense_account_id: '',
            accumulated_depreciation_account_id: '',
        });
        setActiveTab('general');
        onClose();
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create New Category (Quick Add)"
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="accounting">Accounting</TabsTrigger>
                        <TabsTrigger value="attributes">Attributes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Code"
                                placeholder="e.g. IT-LPT"
                                value={formData.code}
                                onChange={(e) => updateField('code', e.target.value)}
                                required
                            />
                            <Input
                                label="Name"
                                placeholder="e.g. Laptop"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                required
                            />
                        </div>

                        <Select
                            label="Parent Category"
                            options={flatCategories}
                            value={formData.parent_id}
                            onChange={(val) => updateField('parent_id', val)}
                            placeholder="Select parent (Optional)"
                        />

                        <Select
                            label="Main Category Class (Optional)"
                            options={MAIN_CATEGORIES.map(c => ({ value: c, label: c }))}
                            value={formData.main_category}
                            onChange={(val) => updateField('main_category', val)}
                            placeholder="Select class if root..."
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            rows={2}
                        />
                    </TabsContent>

                    <TabsContent value="accounting" className="space-y-4">
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 mb-4">
                            <h3 className="text-sm font-medium text-blue-400 mb-1">GL Account Mapping</h3>
                            <p className="text-xs text-slate-400">
                                Link this category to the General Ledger for automated journal entries (CAPEX/OPEX).
                            </p>
                        </div>

                        <Select
                            label="Asset Control Account (CAPEX)"
                            options={accountOptions}
                            value={formData.asset_account_id}
                            onChange={(val) => updateField('asset_account_id', val)}
                            placeholder="Select asset account (e.g. 12101)"
                        />

                        <Select
                            label="Depreciation Expense Account (OPEX)"
                            options={accountOptions}
                            value={formData.expense_account_id}
                            onChange={(val) => updateField('expense_account_id', val)}
                            placeholder="Select expense account"
                        />

                        <Select
                            label="Accumulated Depreciation Account"
                            options={accountOptions}
                            value={formData.accumulated_depreciation_account_id}
                            onChange={(val) => updateField('accumulated_depreciation_account_id', val)}
                            placeholder="Select accumulated account"
                        />
                    </TabsContent>

                    <TabsContent value="attributes" className="space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 mb-4">
                            <h3 className="text-sm font-medium text-white mb-1">Custom Attribute Template</h3>
                            <p className="text-xs text-slate-400">
                                Define specific technical specs to track for assets in this category.
                            </p>
                        </div>

                        <TagsInput
                            label="Attribute Names"
                            placeholder="Type name (e.g. RAM, Color) and press Enter"
                            value={formData.attributes}
                            onChange={(tags) => updateField('attributes', tags)}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 mt-6">
                    <Button variant="ghost" type="button" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={mutation.isPending}
                        leftIcon={<Save size={16} />}
                    >
                        Create Category
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
