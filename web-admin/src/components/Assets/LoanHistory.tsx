import React, { useEffect, useState } from 'react';
import { loanApi, type Loan } from '../../api/loan';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    StatusBadge,
    Button,
    LoadingOverlay,
    useToast,
    ActionIcon,
    Modal,
    Textarea,
    Input
} from '../ui';
import { Check, X, LogOut, LogIn } from 'lucide-react';

interface LoanHistoryProps {
    assetId: string;
}

export const LoanHistory: React.FC<LoanHistoryProps> = ({ assetId }) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(false);
    const { success, error: showError } = useToast();

    // Action State
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'checkout' | 'return' | null>(null);
    const [actionInput, setActionInput] = useState(''); // Reason or Condition
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchLoans();
    }, [assetId]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const data = await loanApi.list({ asset_id: assetId });
            setLoans(data);
        } catch (error) {
            console.error('Failed to fetch loans:', error);
            // showError('Failed to fetch loan history', 'Error'); // Suppress initial error if empty
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (loan: Loan, type: 'approve' | 'reject' | 'checkout' | 'return') => {
        setSelectedLoan(loan);
        setActionType(type);
        setActionInput('');
    };

    const submitAction = async () => {
        if (!selectedLoan || !actionType) return;

        setActionLoading(true);
        try {
            switch (actionType) {
                case 'approve':
                    await loanApi.approve(selectedLoan.id);
                    success('Loan approved', 'Success');
                    break;
                case 'reject':
                    await loanApi.reject(selectedLoan.id, actionInput);
                    success('Loan rejected', 'Success');
                    break;
                case 'checkout':
                    await loanApi.checkout(selectedLoan.id, actionInput || 'Good condition');
                    success('Asset checked out', 'Success');
                    break;
                case 'return':
                    await loanApi.returnLoan(selectedLoan.id, actionInput || 'Good condition');
                    success('Asset returned', 'Success');
                    break;
            }
            fetchLoans();
            setActionType(null);
            setSelectedLoan(null);
        } catch (error: any) {
            showError(error.response?.data?.error || 'Action failed', 'Error');
        } finally {
            setActionLoading(false);
        }
    };

    const getActionTitle = () => {
        switch (actionType) {
            case 'approve': return 'Approve Loan Request';
            case 'reject': return 'Reject Loan Request';
            case 'checkout': return 'Checkout Asset';
            case 'return': return 'Return Asset';
            default: return '';
        }
    };

    return (
        <div className="relative min-h-[200px]">
            <LoadingOverlay visible={loading} />
            <Table>
                <TableHead>
                    <TableRow>
                        <TableTh>Loan Number</TableTh>
                        <TableTh>Borrower/Employee</TableTh>
                        <TableTh>Loan Date</TableTh>
                        <TableTh>Return Date</TableTh>
                        <TableTh>Status</TableTh>
                        <TableTh align="center">Actions</TableTh>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loans.length > 0 ? (
                        loans.map((loan) => (
                            <TableRow key={loan.id}>
                                <TableTd>{loan.loan_number}</TableTd>
                                <TableTd>
                                    <div className="flex flex-col">
                                        <span className="text-foreground font-medium">{loan.employee_name || loan.borrower_name || '-'}</span>
                                        {loan.approver_id && <span className="text-xs text-muted-foreground">Approved by ID: {loan.approver_id.substring(0, 8)}</span>}
                                    </div>
                                </TableTd>
                                <TableTd>{new Date(loan.loan_date).toLocaleDateString()}</TableTd>
                                <TableTd>
                                    <div className="flex flex-col">
                                        <span>Exp: {new Date(loan.expected_return_date).toLocaleDateString()}</span>
                                        {loan.actual_return_date && (
                                            <span className="text-xs text-emerald-400">Act: {new Date(loan.actual_return_date).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </TableTd>
                                <TableTd>
                                    <StatusBadge status={loan.status} />
                                </TableTd>
                                <TableTd align="center">
                                    <div className="flex items-center justify-center gap-1">
                                        {loan.status === 'requested' && (
                                            <>
                                                <ActionIcon variant="success" onClick={() => handleAction(loan, 'approve')} title="Approve">
                                                    <Check size={16} />
                                                </ActionIcon>
                                                <ActionIcon variant="danger" onClick={() => handleAction(loan, 'reject')} title="Reject">
                                                    <X size={16} />
                                                </ActionIcon>
                                            </>
                                        )}
                                        {loan.status === 'approved' && (
                                            <ActionIcon variant="default" onClick={() => handleAction(loan, 'checkout')} title="Checkout">
                                                <LogOut size={16} />
                                            </ActionIcon>
                                        )}
                                        {(loan.status === 'checked_out' || loan.status === 'in_use' || loan.status === 'overdue') && (
                                            <ActionIcon variant="default" onClick={() => handleAction(loan, 'return')} title="Return">
                                                <LogIn size={16} />
                                            </ActionIcon>
                                        )}
                                    </div>
                                </TableTd>
                            </TableRow>
                        ))
                    ) : (
                        <TableEmpty colSpan={6} message="No loan history found." />
                    )}
                </TableBody>
            </Table>

            {/* Action Modal */}
            <Modal
                isOpen={!!actionType}
                onClose={() => setActionType(null)}
                title={getActionTitle()}
            >
                <div className="space-y-4">
                    {actionType === 'reject' && (
                        <Textarea
                            label="Rejection Reason"
                            placeholder="Why is this request rejected?"
                            value={actionInput}
                            onChange={(e) => setActionInput(e.target.value)}
                        />
                    )}
                    {(actionType === 'checkout' || actionType === 'return') && (
                        <Input
                            label={actionType === 'checkout' ? "Condition Before" : "Condition After"}
                            placeholder="e.g. Good, Scratched, New"
                            value={actionInput}
                            onChange={(e) => setActionInput(e.target.value)}
                        />
                    )}
                    {actionType === 'approve' && (
                        <p className="text-muted-foreground">Are you sure you want to approve this loan request?</p>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setActionType(null)}>Cancel</Button>
                        <Button
                            onClick={submitAction}
                            loading={actionLoading}
                            variant={actionType === 'reject' ? 'danger' : 'primary'}
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
