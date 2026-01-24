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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 active:bg-gray-50 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-blue-600 truncate">
                        {contract.contract_number}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                        {contract.client_name || 'Unknown Client'}
                    </p>
                </div>
                <ApprovalStatusBadge status={contract.status} size="sm" />
            </div>

            {/* Date Range */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                <span className="font-medium">{format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium">{format(new Date(contract.end_date), 'MMM d, yyyy')}</span>
            </div>

            {/* Payment Terms */}
            <div className="mb-3">
                <span className="text-xs text-gray-500">Payment: </span>
                <span className="text-xs font-medium text-gray-700 capitalize">
                    {contract.payment_terms?.replace('_', ' ')}
                </span>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => onView(contract)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100 transition-colors tap-target"
                >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                </button>

                {showApprovalActions && (
                    <>
                        {onApprove && (
                            <button
                                onClick={() => onApprove(contract)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg active:bg-green-100 transition-colors tap-target"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Approve</span>
                            </button>
                        )}
                        {onReject && (
                            <button
                                onClick={() => onReject(contract)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg active:bg-red-100 transition-colors tap-target"
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
