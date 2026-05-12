import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractApi } from '../../api/contract';
import { X, CheckCircle, XCircle, Users } from 'lucide-react';
import { usersApi, type UserSummary } from '../../api/users';
import { useQuery } from '@tanstack/react-query';

interface ApprovalModalProps {
    contractId?: string;
    contractIds?: string[];
    contractNumber?: string;
    action: 'approve' | 'reject' | 'bulk_approve' | 'bulk_reject' | 'delegate';
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ApprovalModal({
    contractId,
    contractIds,
    contractNumber,
    action,
    isOpen,
    onClose,
    onSuccess,
}: ApprovalModalProps) {
    const [notes, setNotes] = useState('');
    const [delegatedTo, setDelegatedTo] = useState<string>('');
    const queryClient = useQueryClient();

    const approvalMutation = useMutation<any, Error, any>({
        mutationFn: (request: any): Promise<any> => {
            if (action === 'approve') {
                return contractApi.approveContract(contractId!, request);
            } else if (action === 'reject') {
                return contractApi.rejectContract(contractId!, request);
            } else if (action === 'bulk_approve') {
                return contractApi.bulkApprove({ ids: contractIds!, notes: request.notes });
            } else if (action === 'delegate') {
                return contractApi.delegate(contractId!, {
                    delegated_to: delegatedTo,
                    notes: request.notes
                });
            } else {
                return contractApi.bulkReject({ ids: contractIds!, notes: request.notes });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            if (contractId) {
                queryClient.invalidateQueries({ queryKey: ['contract-detail', contractId] });
                queryClient.invalidateQueries({ queryKey: ['contract-approvals', contractId] });
            }
            if (onSuccess) onSuccess();
            handleClose();
            let actionText = 'processed';
            if (action.includes('approve')) actionText = 'approved';
            if (action.includes('reject')) actionText = 'rejected';
            if (action === 'delegate') actionText = 'delegated';

            alert(`Contract(s) ${actionText} successfully`);
        },
        onError: (error: unknown) => {
            console.error('Approval action failed:', error);
            alert(`Failed to perform bulk action. Please try again.`);
        },
    });

    const handleClose = () => {
        setNotes('');
        setDelegatedTo('');
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isReject = action.includes('reject');

        if (isReject && !notes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        if (action === 'delegate' && !delegatedTo) {
            alert('Please select a user to delegate to');
            return;
        }

        approvalMutation.mutate({
            notes: notes || undefined,
        });
    };

    if (!isOpen) return null;

    const isApprove = action.includes('approve');
    const isDelegate = action === 'delegate';

    let title = 'Process Contract';
    if (isApprove) title = 'Approve Contract';
    if (action.includes('reject')) title = 'Reject Contract';
    if (isDelegate) title = 'Delegate Approval';

    let buttonColor = 'bg-blue-600 hover:bg-blue-700';
    if (isApprove) buttonColor = 'bg-green-600 hover:bg-green-700';
    if (action.includes('reject')) buttonColor = 'bg-red-600 hover:bg-red-700';

    let Icon = CheckCircle;
    if (action.includes('reject')) Icon = XCircle;
    if (isDelegate) Icon = Users;

    // Fetch users for delegation
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersApi.list(1, 100),
        enabled: isDelegate && isOpen,
    });
    const users: UserSummary[] = usersData?.data || [];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <Icon className={`h-6 w-6 ${isApprove ? 'text-green-600' : action.includes('reject') ? 'text-red-600' : 'text-blue-600'}`} />
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">
                                {isDelegate
                                    ? `Select a user to delegate approval for contract `
                                    : `Are you sure you want to ${action.replace('_', ' ')} contract `
                                }
                                <span className="font-semibold text-gray-900">{contractNumber}</span>?
                            </p>
                        </div>

                        {/* User Select for Delegation */}
                        {isDelegate && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Delegate To <span className="text-red-600">*</span>
                                </label>
                                <select
                                    value={delegatedTo}
                                    onChange={(e) => setDelegatedTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Select a user...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.role_code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes {action === 'reject' && <span className="text-red-600">*</span>}
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={
                                    action === 'approve'
                                        ? 'Add any approval notes (optional)...'
                                        : 'Please provide a reason for rejection...'
                                }
                                required={action === 'reject'}
                            />
                        </div>

                        {/* Warning for rejection */}
                        {action === 'reject' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> Rejecting this contract will return it to draft status.
                                    The contract creator will need to make changes and resubmit for approval.
                                </p>
                            </div>
                        )}

                        {/* Loading state */}
                        {approvalMutation.isPending && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-blue-700">Processing...</span>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={approvalMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={approvalMutation.isPending}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
                            >
                                {approvalMutation.isPending
                                    ? 'Processing...'
                                    : isApprove
                                        ? 'Approve Contract'
                                        : action.includes('reject')
                                            ? 'Reject Contract'
                                            : 'Delegate Approval'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
