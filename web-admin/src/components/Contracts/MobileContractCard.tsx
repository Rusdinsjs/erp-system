import { format } from 'date-fns';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import type { Contract } from '../../types/contract';
import ApprovalStatusBadge from './ApprovalStatusBadge';

interface MobileContractCardProps {
    contract: Contract;
    onView: (contract: Contract) => void;
    onApprove?: (contract: Contract) => void;
    onReject?: (contract: Contract) => void;
}

export default function MobileContractCard({
    contract,
    onView,
    onApprove,
    onReject,
}: MobileContractCardProps) {
    const showApprovalActions = contract.status === 'pending_approval' && (onApprove || onReject);

    return (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-3 active:bg-muted/50 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-primary truncate">
                        {contract.contract_number}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                        {contract.client_name || 'Unknown Client'}
                    </p>
                </div>
                <ApprovalStatusBadge status={contract.status} size="sm" />
            </div>

            {/* Date Range */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-3 border-b border-border">
                <span className="font-medium text-foreground">{format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
                <span className="text-muted-foreground/50">→</span>
                <span className="font-medium text-foreground">{format(new Date(contract.end_date), 'MMM d, yyyy')}</span>
            </div>

            {/* Payment Terms */}
            <div className="mb-3">
                <span className="text-xs text-muted-foreground">Payment: </span>
                <span className="text-xs font-medium text-foreground capitalize">
                    {contract.payment_terms?.replace('_', ' ')}
                </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onView(contract)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-lg active:bg-primary/20 transition-colors tap-target hover:bg-primary/15"
                >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                </button>

                {showApprovalActions && (
                    <>
                        {onApprove && (
                            <button
                                onClick={() => onApprove(contract)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-success bg-success/10 rounded-lg active:bg-success/20 transition-colors tap-target hover:bg-success/15"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Approve</span>
                            </button>
                        )}
                        {onReject && (
                            <button
                                onClick={() => onReject(contract)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-destructive bg-destructive/10 rounded-lg active:bg-destructive/20 transition-colors tap-target hover:bg-destructive/15"
                            >
                                <XCircle className="h-4 w-4" />
                                <span>Reject</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
