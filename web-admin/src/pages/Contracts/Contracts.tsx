import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock, FileText, Eye, Edit2, Trash2, BarChart2, X } from 'lucide-react';
import { contractApi } from '../../api/contract'
import type { Contract } from '../../types/contract';
import ContractForm from '../../components/Contracts/ContractForm';
import { Card, Modal, Button, useToast, TableSkeleton, Skeleton } from '../../components/ui';
import { format } from 'date-fns';

import AdvancedFilterPanel, { type FilterOptions } from '../../components/Contracts/AdvancedFilterPanel';
import ApprovalStatusBadge from '../../components/Contracts/ApprovalStatusBadge';
import MobileContractCard from '../../components/Contracts/MobileContractCard';
import ApprovalModal from '../../components/Contracts/ApprovalModal';

const Contracts: React.FC = () => {
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Advanced Filters State
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        status: [] as string[],
        paymentTerms: [] as string[],
        dateRange: { start: '', end: '' },
        valueRange: { min: '', max: '' },
        performanceMetrics: { ma: '', pa: '', ua: '', eu: '' },
    });

    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'bulk_approve' | 'bulk_reject' | null>(null);

    const queryClient = useQueryClient();
    const { success, error: showError } = useToast();

    // Fetch contracts
    const { data: contracts = [], isLoading, refetch } = useQuery({
        queryKey: ['contracts'],
        queryFn: () => contractApi.list()
    });

    // Fetch expiring contracts
    const { data: expiringContracts = [] } = useQuery({
        queryKey: ['contracts', 'expiring'],
        queryFn: () => contractApi.listExpiring()
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: contractApi.delete,
        onSuccess: () => {
            success('Contract deleted successfully', 'Success');
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            setIsDeleteConfirmOpen(false);
            setSelectedContract(null);
        },
        onError: () => {
            showError('Failed to delete contract', 'Error');
        }
    });

    // Filtering Logic
    const filteredContracts = (contracts as Contract[]).filter((c: Contract) => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                c.contract_number.toLowerCase().includes(searchLower) ||
                (c.client_name || '').toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        // Status filter (Multi-select)
        if (filters.status.length > 0) {
            if (!filters.status.includes(c.status)) return false;
        }

        // Payment Terms filter (Multi-select)
        if (filters.paymentTerms.length > 0) {
            if (!filters.paymentTerms.includes(c.payment_terms)) return false;
        }

        // Date Range filter
        if (filters.dateRange.start) {
            if (new Date(c.start_date) < new Date(filters.dateRange.start)) return false;
        }
        if (filters.dateRange.end) {
            if (new Date(c.end_date) > new Date(filters.dateRange.end)) return false;
        }

        return true;
    });

    const handleResetFilters = () => {
        setFilters({
            search: '',
            status: [],
            paymentTerms: [],
            dateRange: { start: '', end: '' },
            valueRange: { min: '', max: '' },
            performanceMetrics: { ma: '', pa: '', ua: '', eu: '' },
        });
    };

    const handleViewDetails = (contract: Contract) => {
        navigate(`/contracts/${contract.id}`);
    };

    const handleEdit = (contract: Contract) => {
        setSelectedContract(contract);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (contract: Contract) => {
        setSelectedContract(contract);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedContract) {
            deleteMutation.mutate(selectedContract.id);
        }
    };

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredContracts.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkApprove = () => {
        setApprovalAction('bulk_approve');
    };

    const handleBulkReject = () => {
        setApprovalAction('bulk_reject');
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                            <FileText size={24} className="text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Contract Management</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">Monitor rental agreements, performance, and lifecycle approvals.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/contract-analytics')}
                        className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl shadow-lg 
                                 shadow-purple-500/20 flex items-center justify-center gap-2 transition-all duration-200 font-semibold"
                    >
                        <BarChart2 size={20} />
                        Analytics
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl shadow-lg 
                                 shadow-[0_0_15px_rgba(var(--primary),0.2)] flex items-center justify-center gap-2 transition-all duration-200 font-semibold"
                    >
                        <Plus size={20} />
                        Create New Contract
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Active Contracts Card */}
                <Card className="relative overflow-hidden group p-6 bg-card border-border">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Active Contracts</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">
                                {(contracts as Contract[]).filter((c: Contract) => c.status === 'active').length}
                            </h3>
                        </div>
                        <div className="p-3 bg-success/20 rounded-xl">
                            <CheckCircle className="text-success" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-success">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        Currently operational
                    </div>
                </Card>

                {/* Expiring Soon Card */}
                <Card className="relative overflow-hidden group p-6 bg-card border-border">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-muted-foreground text-sm font-medium">Expiring Soon</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">
                                {(expiringContracts as Contract[]).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-warning/20 rounded-xl">
                            <Clock className="text-warning" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Requires attention this month
                    </div>
                </Card>
            </div>

            {/* Filter Panel */}
            <AdvancedFilterPanel
                filters={filters}
                setFilters={setFilters}
                onReset={handleResetFilters}
            />

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between p-4 mb-4 bg-primary/10 border border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex items-center gap-4">
                        <span className="text-primary font-semibold px-3 py-1 bg-primary/10 rounded-lg">
                            {selectedIds.size} Selected
                        </span>
                        <div className="h-6 w-px bg-border" />
                        <p className="text-muted-foreground text-sm hidden md:block">Perform bulk actions on selected contracts</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleBulkApprove}
                            className="bg-success/10 text-success border-success/20 hover:bg-success/20"
                        >
                            <CheckCircle size={18} className="mr-2" />
                            Bulk Approve
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleBulkReject}
                            className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                        >
                            <X size={18} className="mr-2" />
                            Bulk Reject
                        </Button>
                        <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <Card className="overflow-hidden p-0 border-border bg-card/50 backdrop-blur-xl">

                {/* Contracts Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <input
                                        type="checkbox"
                                        className="rounded border-border bg-card text-primary focus:ring-primary"
                                        checked={selectedIds.size === filteredContracts.length && filteredContracts.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract Number</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Terms</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-4">
                                        <TableSkeleton rows={5} cols={7} />
                                    </td>
                                </tr>
                            ) : filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <div className="bg-muted/50 p-4 rounded-full mb-3">
                                                <FileText size={32} />
                                            </div>
                                            <p className="text-lg font-medium text-foreground">No contracts found</p>
                                            <p className="text-sm">Try adjusting your filters or create a new contract.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract: Contract) => (
                                    <tr
                                        key={contract.id}
                                        className={`hover:bg-muted/30 transition-colors duration-150 group ${selectedIds.has(contract.id) ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="rounded border-border bg-card text-primary focus:ring-primary"
                                                checked={selectedIds.has(contract.id)}
                                                onChange={() => handleToggleSelect(contract.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-primary font-medium group-hover:text-primary/80 transition-colors">
                                                {contract.contract_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">
                                                {contract.client_name || 'Unknown Client'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-muted-foreground">
                                                <span className="text-gray-300">{format(new Date(contract.start_date), 'MMM d, yyyy')}</span>
                                                <span className="mx-2 text-muted-foreground/50">→</span>
                                                <span className="text-gray-300">{format(new Date(contract.end_date), 'MMM d, yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <ApprovalStatusBadge
                                                status={contract.status}
                                                size="sm"
                                                currentStep={contract.current_approval_step}
                                                totalSteps={contract.total_approval_steps}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {contract.payment_terms.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleViewDetails(contract)}
                                                    className="text-primary hover:text-primary/80 transition-colors p-1.5 hover:bg-primary/10 rounded-lg"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(contract)}
                                                    className="text-warning hover:text-warning/80 transition-colors p-1.5 hover:bg-warning/10 rounded-lg"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(contract)}
                                                    className="text-destructive hover:text-destructive/80 transition-colors p-1.5 hover:bg-destructive/10 rounded-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Hidden on Desktop) */}
                <div className="md:hidden space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col gap-3 py-4">
                            <Skeleton className="h-32 w-full rounded-2xl" />
                            <Skeleton className="h-32 w-full rounded-2xl" />
                            <Skeleton className="h-32 w-full rounded-2xl" />
                        </div>
                    ) : filteredContracts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <div className="bg-muted p-4 rounded-full mb-3">
                                <FileText size={32} />
                            </div>
                            <p className="text-lg font-medium text-foreground">No contracts found</p>
                            <p className="text-sm">Try adjusting your filters or create a new contract.</p>
                        </div>
                    ) : (
                        filteredContracts.map((contract: Contract) => (
                            <MobileContractCard
                                key={contract.id}
                                contract={contract}
                                onView={handleViewDetails}
                                onApprove={
                                    contract.status === 'pending_approval'
                                        ? (c) => {
                                            setSelectedContract(c);
                                            setApprovalAction('approve');
                                        }
                                        : undefined
                                }
                                onReject={
                                    contract.status === 'pending_approval'
                                        ? (c) => {
                                            setSelectedContract(c);
                                            setApprovalAction('reject');
                                        }
                                        : undefined
                                }
                            />
                        ))
                    )}
                </div>
            </Card>

            {/* Approval Modal */}
            {approvalAction && (
                <ApprovalModal
                    contractId={selectedContract?.id}
                    contractIds={approvalAction.startsWith('bulk_') ? Array.from(selectedIds) : undefined}
                    contractNumber={selectedContract?.contract_number || `${selectedIds.size} contracts`}
                    action={approvalAction}
                    isOpen={!!approvalAction}
                    onClose={() => {
                        setApprovalAction(null);
                        setSelectedContract(null);
                    }}
                    onSuccess={() => {
                        setSelectedIds(new Set());
                        refetch();
                    }}
                />
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <ContractForm
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        refetch();
                    }}
                />
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedContract && (
                <ContractForm
                    contract={selectedContract}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedContract(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedContract(null);
                        refetch();
                    }}
                />
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Contract Details"
                size="lg"
            >
                {selectedContract && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract Number</p>
                                <p className="text-foreground font-mono">{selectedContract.contract_number}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Client</p>
                                <p className="text-foreground">{selectedContract.client_name || 'Unknown Client'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Start Date</p>
                                <p className="text-foreground">{format(new Date(selectedContract.start_date), 'MMMM d, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">End Date</p>
                                <p className="text-foreground">{format(new Date(selectedContract.end_date), 'MMMM d, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</p>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${selectedContract.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                                    selectedContract.status === 'draft' ? 'bg-muted text-muted-foreground border-border' :
                                        selectedContract.status === 'expiring' ? 'bg-warning/10 text-warning border-warning/20' :
                                            selectedContract.status === 'expired' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                                'bg-primary/10 text-primary border-primary/20'
                                    }`}>
                                    {selectedContract.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Payment Terms</p>
                                <p className="text-foreground">{selectedContract.payment_terms.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Auto Renew</p>
                                <p className="text-foreground">{selectedContract.auto_renew ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Price Lock</p>
                                <p className="text-foreground">{selectedContract.price_lock ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                        {selectedContract.notes && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Notes</p>
                                <p className="text-foreground bg-muted p-3 rounded-lg">{selectedContract.notes}</p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4 border-t border-border">
                            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                                Close
                            </Button>
                            <Button onClick={() => {
                                setIsDetailModalOpen(false);
                                handleEdit(selectedContract);
                            }}>
                                Edit Contract
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Delete Contract"
            >
                {selectedContract && (
                    <div className="space-y-4">
                        <p className="text-foreground">
                            Are you sure you want to delete contract <span className="font-mono text-primary">{selectedContract.contract_number}</span>?
                        </p>
                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeleteConfirm}
                                loading={deleteMutation.isPending}
                            >
                                Delete Contract
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Contracts;
