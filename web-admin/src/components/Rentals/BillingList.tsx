import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Eye, Plus, FileText, Calendar } from 'lucide-react';
import { billingApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import { BillingReviewDetail } from './BillingReviewDetail';
import { BillingPeriodForm } from './BillingPeriodForm';
import {
    Select,
    Button,
    LoadingOverlay,
    ActionIcon,
    StatusBadge,
    Modal
} from '../ui';

export function BillingList() {
    const [selectedRental, setSelectedRental] = useState<string>('');
    const [viewingBillingId, setViewingBillingId] = useState<string | null>(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    const rentalOptions = rentals?.map((r: any) => ({ value: r.id, label: `${r.rental_number} - ${r.client_name}` })) || [];

    const { data: billingPeriods, isLoading } = useQuery({
        queryKey: ['billing', selectedRental],
        queryFn: () => selectedRental ? billingApi.listByRental(selectedRental) : Promise.resolve([]),
        enabled: !!selectedRental
    });

    return (
        <div className="flex flex-col h-full bg-background rounded-b-2xl">
            {/* Contextual Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Receipt size={20} className="text-purple-500" />
                    </div>
                    <div className="w-[350px]">
                        <Select
                            placeholder="Select Rental Asset Ledger"
                            options={rentalOptions}
                            value={selectedRental}
                            onChange={(val) => setSelectedRental(val)}
                            className="bg-background/50 border-border rounded-xl h-11"
                        />
                    </div>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    disabled={!selectedRental}
                    onClick={() => setCreateModalOpen(true)}
                    className="rounded-xl shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-500 h-11 px-6 text-[11px] font-black uppercase tracking-widest disabled:opacity-30 text-white"
                >
                    Manual Invoice Cycle
                </Button>
            </div>

            <div className="relative flex-1 overflow-hidden flex flex-col">
                <LoadingOverlay visible={isLoading} />

                {selectedRental ? (
                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        <table className="w-full text-left text-sm text-foreground border-separate border-spacing-y-2">
                            <thead className="bg-card/80 sticky top-0 z-20 backdrop-blur-md rounded-xl">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Billing Cycle</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Financial Volume</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Lifecycle</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">Invoice Ref</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingPeriods && billingPeriods.length > 0 ? (
                                    billingPeriods.map((bP) => (
                                        <tr key={bP.id} className="group hover:bg-muted/40 transition-all duration-300 bg-card/40 backdrop-blur-sm border border-border shadow-sm">
                                            <td className="px-6 py-4 rounded-l-xl border-y border-l border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:bg-purple-500/10 transition-colors">
                                                        <Calendar size={14} className="text-muted-foreground group-hover:text-purple-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground font-bold tracking-tight uppercase">{bP.period_start} - {bP.period_end}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-border">
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-500 font-black text-lg tracking-tighter italic">
                                                        <span className="text-xs font-normal opacity-50 mr-0.5">Rp</span>
                                                        {bP.total_amount?.toLocaleString('id-ID')}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Settlement Target</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-border">
                                                <StatusBadge status={bP.status} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest shadow-sm shadow-black/5" />
                                            </td>
                                            <td className="px-6 py-4 border-y border-border">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={14} className="text-muted-foreground" />
                                                    <span className="font-mono text-xs text-muted-foreground tracking-wider font-medium">
                                                        {bP.invoice_number || 'PENDING GENERATION'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 rounded-r-xl border-y border-r border-border text-center">
                                                <div className="flex justify-center">
                                                    <ActionIcon
                                                        onClick={() => setViewingBillingId(bP.id)}
                                                        variant="default"
                                                        className="w-10 h-10 rounded-xl hover:bg-primary hover:text-white hover:border-primary transform group-hover:scale-110 transition-all shadow-sm"
                                                    >
                                                        <Eye size={18} className="text-muted-foreground group-hover:text-white" />
                                                    </ActionIcon>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center border border-border rounded-xl bg-card/20 backdrop-blur-sm">
                                            <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                <div className="p-6 bg-muted/50 rounded-full border border-border">
                                                    <Receipt size={48} className="opacity-20" />
                                                </div>
                                                <p className="text-sm font-bold uppercase tracking-widest opacity-50">No billing history found for this ledger</p>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={!selectedRental}
                                                    onClick={() => setCreateModalOpen(true)}
                                                    className="rounded-xl mt-2 hover:scale-105 transition-transform"
                                                >
                                                    Initialize First Cycle
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <div className="w-24 h-24 rounded-full bg-purple-500/10 border border-dashed border-purple-500/30 flex items-center justify-center mb-6 animate-pulse">
                            <Receipt size={48} className="text-purple-500" />
                        </div>
                        <h4 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">Ledger Selection Required</h4>
                        <p className="text-muted-foreground max-w-sm font-medium">Select a rental financial stream from the dropdown above to audit billing cycles.</p>
                    </div>
                )}
            </div>

            {/* Modal for Billing Review */}
            <Modal
                isOpen={!!viewingBillingId}
                onClose={() => setViewingBillingId(null)}
                title="Automated Billing Verification Detail"
                size="lg"
            >
                {viewingBillingId && (
                    <div className="text-slate-300">
                        <BillingReviewDetail
                            billingId={viewingBillingId as string}
                            onClose={() => setViewingBillingId(null)}
                        />
                    </div>
                )}
            </Modal>

            {/* Modal for Creating Billing Period */}
            <Modal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Initialize New Billing Cycle"
            >
                {selectedRental && (
                    <BillingPeriodForm
                        rentalId={selectedRental}
                        onClose={() => setCreateModalOpen(false)}
                        onSuccess={() => setCreateModalOpen(false)}
                    />
                )}
            </Modal>
        </div>
    );
}
