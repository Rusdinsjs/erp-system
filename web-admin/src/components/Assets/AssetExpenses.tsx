import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Check,
    Plus,
    ExternalLink,
    X,
    Upload,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';

import { assetApi, type AssetExpense } from '../../api/assets';
import { useAuthStore } from '../../store/useAuthStore';
import {
    Button,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Badge,
    ActionIcon,
    Modal,
    Input,
    NumberInput,
    DateInput
} from '../ui';

interface AssetExpensesProps {
    assetId: string;
    type: 'OPEX' | 'CAPEX';
}

interface ExpenseItemForm {
    description: string;
    amount: number;
}

export function AssetExpenses({ assetId, type }: AssetExpensesProps) {
    const [opened, setOpened] = useState(false);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const canApprove = ['manager', 'superadmin', 'supervisor'].includes(user?.role || '');

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        date: new Date(),
        vendor_name: '',
        invoice_number: '',
        file: null as File | null,
        items: [{ description: '', amount: 0 }] as ExpenseItemForm[],
    });

    const { data: expenses, isLoading } = useQuery({
        queryKey: ['asset-expenses', assetId],
        queryFn: () => assetApi.getExpenses(assetId),
    });

    // Filter expenses by type
    const filteredExpenses = expenses?.filter((e: AssetExpense) => e.expense_type === type);

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            let proof_url = '';
            if (values.file) {
                const uploadRes = await assetApi.uploadFile(values.file);
                proof_url = uploadRes.url;
            }
            return assetApi.createExpense(assetId, {
                description: values.description,
                items: values.items,
                date: values.date.toISOString().split('T')[0],
                vendor_name: values.vendor_name,
                invoice_number: values.invoice_number,
                proof_url: proof_url || undefined,
                expense_type: type, // Pass the current type
            });
        },
        onSuccess: () => {
            toast.success(`${type} Request submitted successfully`);
            setOpened(false);
            setFormData({
                description: '',
                date: new Date(),
                vendor_name: '',
                invoice_number: '',
                file: null,
                items: [{ description: '', amount: 0 }],
            });
            queryClient.invalidateQueries({ queryKey: ['asset-expenses', assetId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create expense');
        },
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes?: string }) => assetApi.approveExpense(id, notes),
        onSuccess: () => {
            toast.success('Expense approved successfully');
            queryClient.invalidateQueries({ queryKey: ['asset-expenses', assetId] });
            // Invalidate asset details if CAPEX approvals change asset value
            if (type === 'CAPEX') {
                queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
            }
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes: string }) => assetApi.rejectExpense(id, notes),
        onSuccess: () => {
            toast.success('Expense rejected');
            queryClient.invalidateQueries({ queryKey: ['asset-expenses', assetId] });
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.description || !formData.date) {
            toast.error('Please fill in header details');
            return;
        }

        if (formData.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        for (const item of formData.items) {
            if (!item.description || item.amount <= 0) {
                toast.error('All items must have a description and valid amount');
                return;
            }
        }

        createMutation.mutate(formData);
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', amount: 0 }]
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: keyof ExpenseItemForm, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const StatusBadgeComponent = ({ status }: { status: string }) => {
        const variants: Record<string, "warning" | "success" | "danger" | "default"> = {
            PENDING: 'warning',
            APPROVED: 'success',
            REJECTED: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const title = type === 'OPEX' ? 'Operational Expenses' : 'Capital Expenses (CAPEX)';

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <Button onClick={() => setOpened(true)} leftIcon={<Plus size={16} />}>
                    Add {type}
                </Button>
            </div>

            <div className="rounded-md border border-border bg-muted/50 overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Date</TableTh>
                            <TableTh>Description</TableTh>
                            <TableTh>Vendor</TableTh>
                            <TableTh>Total Amount</TableTh>
                            <TableTh>Items</TableTh>
                            <TableTh>Proof</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh>Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableTd colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableTd>
                            </TableRow>
                        ) : filteredExpenses?.length === 0 ? (
                            <TableEmpty colSpan={8} message={`No ${type} records found.`} />
                        ) : (
                            filteredExpenses?.map((expense: AssetExpense) => (
                                <TableRow key={expense.id}>
                                    <TableTd>{expense.date}</TableTd>
                                    <TableTd>
                                        <div className="font-medium text-foreground">{expense.description}</div>
                                        <div className="text-xs text-muted-foreground">{expense.invoice_number}</div>
                                    </TableTd>
                                    <TableTd>{expense.vendor_name || '-'}</TableTd>
                                    <TableTd className="font-bold text-foreground">
                                        Rp {expense.amount.toLocaleString('id-ID')}
                                    </TableTd>
                                    <TableTd>
                                        <div className="text-xs text-muted-foreground">
                                            {expense.items?.length || 0} items
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        {expense.proof_url ? (
                                            <ActionIcon
                                                variant="default"
                                                onClick={() => window.open(expense.proof_url, '_blank')}
                                                title="View Proof"
                                            >
                                                <ExternalLink size={16} />
                                            </ActionIcon>
                                        ) : '-'}
                                    </TableTd>
                                    <TableTd><StatusBadgeComponent status={expense.status} /></TableTd>
                                    <TableTd>
                                        {expense.status === 'PENDING' && canApprove && (
                                            <div className="flex gap-2">
                                                <ActionIcon
                                                    variant="success"
                                                    className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                                    onClick={() => approveMutation.mutate({ id: expense.id })}
                                                    disabled={approveMutation.isPending}
                                                    title="Approve"
                                                >
                                                    <Check size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="danger"
                                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                    onClick={() => {
                                                        const reason = prompt("Reason for rejection:");
                                                        if (reason) rejectMutation.mutate({ id: expense.id, notes: reason });
                                                    }}
                                                    disabled={rejectMutation.isPending}
                                                    title="Reject"
                                                >
                                                    <X size={16} />
                                                </ActionIcon>
                                            </div>
                                        )}
                                    </TableTd>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Modal
                isOpen={opened}
                onClose={() => setOpened(false)}
                title={`Add ${title}`}
                size="half"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Description"
                                placeholder={type === 'OPEX' ? "e.g. Monthly Maintenance" : "e.g. Major Overhaul / Upgrade"}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <DateInput
                            label="Date"
                            value={formData.date}
                            onChange={(date) => date && setFormData({ ...formData, date })}
                            required
                        />
                        <Input
                            label="Vendor Name (Optional)"
                            value={formData.vendor_name}
                            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                        />
                        <Input
                            label="Invoice Number (Optional)"
                            value={formData.invoice_number}
                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        />
                    </div>

                    {/* Items Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-muted-foreground">Expense Items</label>
                            <Button size="sm" variant="ghost" type="button" onClick={addItem} leftIcon={<Plus size={14} />}>
                                Add Item
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Item Description"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="w-32">
                                        <NumberInput
                                            placeholder="Amount"
                                            value={item.amount}
                                            onChange={(val) => updateItem(index, 'amount', Number(val))}
                                            min={0}
                                            required
                                        />
                                    </div>
                                    {formData.items.length > 1 && (
                                        <ActionIcon
                                            variant="danger"
                                            className="mt-1"
                                            onClick={() => removeItem(index)}
                                            title="Remove Item"
                                        >
                                            <Trash2 size={16} />
                                        </ActionIcon>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-border">
                            <div className="text-right">
                                <span className="text-sm text-muted-foreground mr-2">Total Amount:</span>
                                <span className="text-xl font-bold text-foreground">
                                    Rp {totalAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    </div>


                    {/* Proof Upload */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Receipt/Proof</label>
                        <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-center w-full px-4 py-2 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                    <Upload size={16} className="mr-2" />
                                    <span className="text-sm truncate">
                                        {formData.file ? formData.file.name : 'Choose File...'}
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setFormData({ ...formData, file: e.target.files[0] });
                                        }
                                    }}
                                />
                            </label>
                            {formData.file && (
                                <ActionIcon
                                    variant="danger"
                                    onClick={() => setFormData({ ...formData, file: null })}
                                >
                                    <Trash2 size={16} />
                                </ActionIcon>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setOpened(false)} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" loading={createMutation.isPending}>
                            Submit Request
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
