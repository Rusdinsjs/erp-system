import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { journalApi, type CreateJournalEntryRequest } from '../../api/journal';
import { financeApi, type ChartOfAccount } from '../../api/finance';

interface JournalLineItem {
    account_id: string;
    description: string;
    debit: string; // Use string for input handling
    credit: string;
}

export function JournalEntryForm() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<JournalLineItem[]>([
        { account_id: '', description: '', debit: '', credit: '' },
        { account_id: '', description: '', debit: '', credit: '' },
    ]);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await financeApi.listAccounts();
            setAccounts(data);
        } catch (error) {
            toast.error('Failed to load accounts');
        }
    };

    const addLine = () => {
        setLines([...lines, { account_id: '', description: '', debit: '', credit: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length <= 2) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: keyof JournalLineItem, value: string) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // Auto-clear other side
        if (field === 'debit' && value && parseFloat(value) > 0) {
            newLines[index].credit = '';
        }
        if (field === 'credit' && value && parseFloat(value) > 0) {
            newLines[index].debit = '';
        }

        setLines(newLines);
    };

    const calculateTotals = () => {
        const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
        const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
        return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
    };

    const { totalDebit, totalCredit, difference } = calculateTotals();
    const isBalanced = Math.abs(difference) < 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isBalanced) {
            toast.error(`Journal is not balanced. Difference: ${Math.abs(difference).toLocaleString()}`);
            return;
        }

        if (totalDebit === 0) {
            toast.error('Total amount cannot be zero');
            return;
        }

        // Validation: Check for empty accounts
        if (lines.some(l => !l.account_id)) {
            toast.error('All lines must have an account selected');
            return;
        }

        try {
            setSubmitting(true);
            const payload: CreateJournalEntryRequest = {
                date,
                description,
                reference,
                lines: lines.map(l => ({
                    account_id: l.account_id,
                    description: l.description,
                    debit: parseFloat(l.debit) || 0,
                    credit: parseFloat(l.credit) || 0,
                }))
            };

            await journalApi.create(payload);
            toast.success('Journal entry created successfully');
            navigate('/finance/journals');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create journal entry');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/finance/journals')}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-foreground">New Journal Entry</h2>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">Date</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">Reference</label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. INV-001"
                            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <label className="block text-sm font-medium text-muted-foreground">Description</label>
                        <textarea
                            required
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Transaction description"
                            className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Lines Section */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-semibold text-foreground">Journal Lines</h3>
                    </div>

                    <div className="p-4">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs uppercase text-muted-foreground font-medium tracking-wider">
                                    <th className="pb-3 w-[35%]">Account</th>
                                    <th className="pb-3">Line Description</th>
                                    <th className="pb-3 w-[15%]">Debit</th>
                                    <th className="pb-3 w-[15%]">Credit</th>
                                    <th className="pb-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="space-y-2">
                                {lines.map((line, index) => (
                                    <tr key={index} className="group">
                                        <td className="pr-3 py-1">
                                            <select
                                                value={line.account_id}
                                                onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.code} - {acc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="pr-3 py-1">
                                            <input
                                                type="text"
                                                value={line.description}
                                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                placeholder="Optional description"
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                                            />
                                        </td>
                                        <td className="pr-3 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.debit}
                                                onChange={(e) => updateLine(index, 'debit', e.target.value)}
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none text-right placeholder-muted-foreground"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="pr-3 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.credit}
                                                onChange={(e) => updateLine(index, 'credit', e.target.value)}
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:ring-1 focus:ring-primary outline-none text-right placeholder-muted-foreground"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="py-1 text-center">
                                            {lines.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(index)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <button
                            type="button"
                            onClick={addLine}
                            className="mt-4 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                            <Plus size={16} /> Add Line
                        </button>
                    </div>

                    {/* Totals Footer */}
                    <div className={`px-6 py-4 border-t border-border ${isBalanced ? 'bg-card' : 'bg-destructive/10'}`}>
                        <div className="flex justify-between items-center max-w-2xl ml-auto mr-12">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Total Debit</p>
                                <p className="text-lg font-bold text-foreground font-mono">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Total Credit</p>
                                <p className="text-lg font-bold text-foreground font-mono">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Difference</p>
                                <p className={`text-lg font-bold font-mono ${isBalanced ? 'text-green-500' : 'text-destructive'}`}>
                                    {Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        {!isBalanced && (
                            <div className="flex justify-end mt-2 mr-12 text-destructive text-sm items-center gap-2">
                                <AlertCircle size={14} />
                                Entry must be balanced to save
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={() => navigate('/finance/journals')}
                        className="px-6 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isBalanced || submitting || totalDebit === 0}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-primary-foreground font-medium transition-all ${!isBalanced || submitting || totalDebit === 0
                            ? 'bg-muted cursor-not-allowed opacity-50'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                            }`}
                    >
                        <Save size={18} />
                        {submitting ? 'Saving...' : 'Save Journal'}
                    </button>
                </div>
            </form>
        </div>
    );
}
