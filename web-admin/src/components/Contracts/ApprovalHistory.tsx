import { useQuery } from '@tanstack/react-query';
import { contractApi } from '../../api/contract';
import { CheckCircle, XCircle, Clock, User, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalHistoryProps {
    contractId: string;
}

export default function ApprovalHistory({ contractId }: ApprovalHistoryProps) {
    const { data: approvals = [], isLoading } = useQuery({
        queryKey: ['contract-approvals', contractId],
        queryFn: () => contractApi.getApprovalHistory(contractId),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (approvals.length === 0) {
        return (
            <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No approval history yet</p>
            </div>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'approved':
                return <CheckCircle className="h-6 w-6 text-green-600" />;
            case 'rejected':
                return <XCircle className="h-6 w-6 text-red-600" />;
            case 'submitted':
                return <Clock className="h-6 w-6 text-blue-600" />;
            case 'delegated':
                return <Users className="h-6 w-6 text-blue-600" />;
            default:
                return <User className="h-6 w-6 text-gray-600" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'approved':
                return 'bg-green-50 border-green-200';
            case 'rejected':
                return 'bg-red-50 border-red-200';
            case 'submitted':
                return 'bg-blue-50 border-blue-200';
            case 'delegated':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getActionText = (action: string) => {
        switch (action) {
            case 'approved':
                return 'Approved';
            case 'rejected':
                return 'Rejected';
            case 'submitted':
                return 'Submitted for Approval';
            case 'delegated':
                return 'Approval Delegated';
            default:
                return action;
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>

            {/* Timeline */}
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />

                {/* Timeline items */}
                <div className="space-y-6">
                    {approvals.map((approval) => (
                        <div key={approval.id} className="relative flex items-start space-x-4">
                            {/* Icon */}
                            <div className="relative z-10 flex-shrink-0">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${getActionColor(approval.action)}`}>
                                    {getActionIcon(approval.action)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1.5">
                                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {getActionText(approval.action)}
                                                </p>
                                                {approval.approval_level && (
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                        Level {approval.approval_level}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {approval.approver_name || 'System'}
                                                {approval.action === 'delegated' && approval.delegated_to_name && (
                                                    <span className="text-blue-600"> → {approval.delegated_to_name}</span>
                                                )} •{' '}
                                                {format(new Date(approval.created_at), 'MMM dd, yyyy HH:mm')}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${approval.action === 'approved'
                                                ? 'bg-green-100 text-green-800'
                                                : approval.action === 'rejected'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}
                                        >
                                            {approval.action.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Notes */}
                                    {approval.notes && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                                            <p className="text-sm text-gray-700">{approval.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
