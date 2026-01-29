import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRenewalApi, type TaxRenewal } from '../../api/tax-renewals';
import { Card, Button, Badge } from '../../components/ui';
import { CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

// Simple Tabs Component (if not available in UI lib)
const Tabs = ({ tabs, activeTab, onChange }: { tabs: string[], activeTab: string, onChange: (t: string) => void }) => (
    <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
            <button
                key={tab}
                onClick={() => onChange(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
            >
                {tab}
            </button>
        ))}
    </div>
);

export function TaxRenewals() {
    const [activeTab, setActiveTab] = useState('Needs Attention');
    const queryClient = useQueryClient();

    // Fetch data based on active tab
    // We map tab names to statuses
    const statusMap: Record<string, string | undefined> = {
        'Needs Attention': 'PENDING_INPUT',
        'Approvals': 'PENDING_APPROVAL',
        'Payment': 'APPROVED', // Or INVOICED
        'History': 'COMPLETED'
    };

    const { data: renewals, isLoading } = useQuery({
        queryKey: ['tax-renewals', activeTab],
        queryFn: () => taxRenewalApi.list(statusMap[activeTab]),
    });

    // Mutations
    const submitCostMutation = useMutation({
        mutationFn: ({ id, cost, notes }: { id: string, cost: number, notes: string }) =>
            taxRenewalApi.submitCost(id, { renewal_cost: cost, notes }),
        onSuccess: () => {
            toast.success('Cost submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
        }
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => taxRenewalApi.approve(id),
        onSuccess: () => {
            toast.success('Renewal approved');
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
        }
    });

    const completeMutation = useMutation({
        mutationFn: ({ id, date }: { id: string, date: string }) =>
            taxRenewalApi.complete(id, { new_expiry_date: date }),
        onSuccess: () => {
            toast.success('Renewal completed');
            queryClient.invalidateQueries({ queryKey: ['tax-renewals'] });
        }
    });

    // Handle Actions
    const handleInputCost = (renewal: TaxRenewal) => {
        const costStr = prompt(`Enter renewal cost for ${renewal.document_type}:`);
        if (costStr) {
            const cost = parseFloat(costStr);
            if (!isNaN(cost)) {
                submitCostMutation.mutate({ id: renewal.id, cost, notes: 'Input via Web Admin' });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tax & Document Renewals</h1>
                    <p className="text-muted-foreground">Manage vehicle document expirations and renewals.</p>
                </div>
            </div>

            <Card padding="lg">
                <Tabs
                    tabs={['Needs Attention', 'Approvals', 'Payment', 'History']}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />

                {isLoading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : !renewals || renewals.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                        No records found in this section.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                                <tr>
                                    <th className="px-4 py-3">Asset</th>
                                    <th className="px-4 py-3">Document</th>
                                    <th className="px-4 py-3">Expiry</th>
                                    <th className="px-4 py-3">Cost</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renewals.map((item) => (
                                    <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                                        <td className="px-4 py-3 font-medium">{item.asset_id}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={
                                                item.document_type === 'STNK' ? 'info' :
                                                    item.document_type === 'TAX' ? 'warning' :
                                                        item.document_type === 'HEAVY_EQUIPMENT_TAX' ? 'danger' : 'default'
                                            }>
                                                {item.document_type}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {dayjs(item.current_expiry).format('DD MMM YYYY')}
                                        </td>
                                        <td className="px-4 py-3 text-foreground">
                                            {item.renewal_cost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.renewal_cost) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.status === 'PENDING_INPUT' ? 'bg-red-500/10 text-red-400' :
                                                item.status === 'PENDING_APPROVAL' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    item.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                                        'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {activeTab === 'Needs Attention' && (
                                                <Button size="sm" onClick={() => handleInputCost(item)}>
                                                    Input Cost
                                                </Button>
                                            )}
                                            {activeTab === 'Approvals' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300">Reject</Button>
                                                    <Button size="sm" onClick={() => approveMutation.mutate(item.id)}>Approve</Button>
                                                </div>
                                            )}
                                            {activeTab === 'Payment' && (
                                                <Button size="sm" onClick={() => {
                                                    const date = prompt('Enter new expiry date (YYYY-MM-DD):', dayjs(item.current_expiry).add(1, 'year').format('YYYY-MM-DD'));
                                                    if (date) completeMutation.mutate({ id: item.id, date });
                                                }}>
                                                    Complete
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
