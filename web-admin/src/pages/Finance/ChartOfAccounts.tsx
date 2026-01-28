import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, type ChartOfAccount, type AccountType, type NormalBalance } from '../../api/finance';
import { Card, Button, Input, Select, Textarea, Badge, useToast, Modal } from '../../components/ui';
import {
    FolderPlus,
    FileText,
    ChevronRight,
    ChevronDown,
    Plus,
    Edit2
} from 'lucide-react';

export function ChartOfAccounts() {
    // const { success, error: showError } = useToast(); // Removed unused toast for now
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([
        '00000000-0000-4001-a000-000000000000', // Aset
        '00000000-0000-4002-a000-000000000000', // Kewajiban
        '00000000-0000-4003-a000-000000000000', // Ekuitas
        '00000000-0000-4004-a000-000000000000', // Pendapatan
        '00000000-0000-4005-a000-000000000000', // HPP
        '00000000-0000-4006-a000-000000000000', // Beban
        '00000000-0000-4001-a100-000000000000', // Aset Lancar
        '00000000-0000-4001-a200-000000000000', // Aset Tetap
    ]));

    // Fetch Accounts Tree
    const { data: accountsTree, isLoading } = useQuery({
        queryKey: ['finance', 'accounts-tree'],
        queryFn: financeApi.listTree,
    });

    const toggleExpand = (id: string) => {
        const next = new Set(expandedNodes);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedNodes(next);
    };

    const handleCreate = () => {
        setEditingAccount(null);
        setIsModalOpen(true);
    };

    const handleEdit = (account: ChartOfAccount) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
                    <p className="text-muted-foreground">Manage financial accounts hierarchy</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus size={18} />
                    Add Account
                </Button>
            </div>

            <Card className="border-border bg-card">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading chart of accounts...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border text-muted-foreground">
                                <tr>
                                    <th className="p-4 font-medium">Account Code</th>
                                    <th className="p-4 font-medium">Account Name</th>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium">Balance</th>
                                    <th className="p-4 font-medium">Currency</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accountsTree?.map((node) => (
                                    <AccountRow
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        expanded={expandedNodes}
                                        onToggle={toggleExpand}
                                        onEdit={handleEdit}
                                    />
                                ))}
                            </tbody>
                        </table>
                        {accountsTree?.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                No accounts found. Create your first account.
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <AccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={editingAccount}
                accounts={accountsTree || []}
                refresh={() => queryClient.invalidateQueries({ queryKey: ['finance'] })}
            />
        </div>
    );
}

function AccountRow({
    node,
    level,
    expanded,
    onToggle,
    onEdit
}: {
    node: ChartOfAccount;
    level: number;
    expanded: Set<string>;
    onToggle: (id: string) => void;
    onEdit: (account: ChartOfAccount) => void;
}) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);

    return (
        <>
            <tr className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="p-4 text-primary font-mono">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                        {hasChildren ? (
                            <button onClick={() => onToggle(node.id)} className="text-muted-foreground hover:text-foreground">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        ) : (
                            <span className="w-[14px]" /> // Spacer
                        )}
                        {node.code}
                    </div>
                </td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        {hasChildren ? <FolderPlus size={14} className="text-primary" /> : <FileText size={14} className="text-muted-foreground" />}
                        <span className={hasChildren ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                            {node.name}
                        </span>
                        {!node.is_active && <Badge variant="warning" size="sm">Inactive</Badge>}
                    </div>
                </td>
                <td className="p-4">
                    <AccountTypeBadge type={node.account_type} />
                </td>
                <td className="p-4 text-muted-foreground">
                    <Badge variant="outline" size="sm" className="uppercase text-[10px]">{node.normal_balance}</Badge>
                </td>
                <td className="p-4 text-muted-foreground">
                    {node.currency}
                </td>
                <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(node)}>
                        <Edit2 size={14} />
                    </Button>
                </td>
            </tr>
            {isExpanded && node.children?.map(child => (
                <AccountRow
                    key={child.id}
                    node={child}
                    level={level + 1}
                    expanded={expanded}
                    onToggle={onToggle}
                    onEdit={onEdit}
                />
            ))}
        </>
    );
}

function AccountTypeBadge({ type }: { type: AccountType }) {
    const styles = {
        asset: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        liability: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        equity: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        revenue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        expense: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    return (
        <span className={`px-2 py-1 rounded text-xs border ${styles[type] || 'text-muted-foreground'}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
    );
}

function AccountModal({
    isOpen,
    onClose,
    initialData,
    accounts,
    refresh
}: {
    isOpen: boolean;
    onClose: () => void;
    initialData: ChartOfAccount | null;
    accounts: ChartOfAccount[];
    refresh: () => void;
}) {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);

    // Form State
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('asset');
    const [balance, setBalance] = useState<NormalBalance>('debit');
    const [parentId, setParentId] = useState<string>('');
    const [description, setDescription] = useState('');

    // Update form when initialData changes
    const isEdit = !!initialData;
    useMemo(() => {
        if (initialData) {
            setCode(initialData.code);
            setName(initialData.name);
            setType(initialData.account_type);
            setBalance(initialData.normal_balance);
            setParentId(initialData.parent_id || '');
            setDescription(initialData.description || '');
        } else {
            setCode('');
            setName('');
            setType('asset');
            setBalance('debit');
            setParentId('');
            setDescription('');
        }
    }, [initialData, isOpen]);

    // Helper to flatten accounts for dropdown
    const flattenAccounts = (nodes: ChartOfAccount[], depth = 0): { id: string, label: string }[] => {
        let result: { id: string, label: string }[] = [];
        for (const node of nodes) {
            result.push({
                id: node.id,
                label: `${'\u00A0\u00A0'.repeat(depth)}${node.code} - ${node.name}`
            });
            if (node.children) {
                result = [...result, ...flattenAccounts(node.children, depth + 1)];
            }
        }
        return result;
    };
    const parentOptions = flattenAccounts(accounts);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit && initialData) {
                await financeApi.updateAccount(initialData.id, {
                    name,
                    parent_id: parentId || undefined,
                    description,
                });
                success('Account updated successfully');
            } else {
                await financeApi.createAccount({
                    code,
                    name,
                    account_type: type,
                    normal_balance: balance,
                    parent_id: parentId || undefined,
                    description,
                });
                success('Account created successfully');
            }
            refresh();
            onClose();
        } catch (err: any) {
            showError(err.message || 'Failed to save account');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Account' : 'New Account'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isEdit && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Account Code"
                            required
                            value={code}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                            placeholder="e.g. 1-1000"
                        />
                        <Select
                            label="Parent Account (Optional)"
                            value={parentId}
                            onChange={(value: string) => setParentId(value)}
                            options={[
                                { value: '', label: 'No Parent (Top Level)' },
                                ...parentOptions.map(p => ({ value: p.id, label: p.label }))
                            ]}
                        />
                    </div>
                )}

                <Input
                    label="Account Name"
                    required
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="e.g. Cash on Hand"
                />

                {!isEdit && (
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Account Type"
                            required
                            value={type}
                            onChange={(value: string) => setType(value as AccountType)}
                            options={[
                                { value: 'asset', label: 'Asset' },
                                { value: 'liability', label: 'Liability' },
                                { value: 'equity', label: 'Equity' },
                                { value: 'revenue', label: 'Revenue' },
                                { value: 'expense', label: 'Expense' },
                            ]}
                        />
                        <Select
                            label="Normal Balance"
                            required
                            value={balance}
                            onChange={(value: string) => setBalance(value as NormalBalance)}
                            options={[
                                { value: 'debit', label: 'Debit' },
                                { value: 'credit', label: 'Credit' },
                            ]}
                        />
                    </div>
                )}

                <Textarea
                    label="Description"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                />

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isEdit ? 'Save Changes' : 'Create Account'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
