import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { contractApi } from '../../api/contract';
import type { ContractDetail, ContractDocument, ContractApproval } from '../../types/contract';
import DocumentUploadModal from '../../components/Contracts/DocumentUploadModal';
import ApprovalModal from '../../components/Contracts/ApprovalModal';
import ApprovalHistory from '../../components/Contracts/ApprovalHistory';
import ApprovalProgress from '../../components/Contracts/ApprovalProgress';
import ApprovalStatusBadge from '../../components/Contracts/ApprovalStatusBadge';
import ContractTimeline from '../../components/Contracts/ContractTimeline';
import RenewalModal from '../../components/Contracts/RenewalModal';
import {
    ArrowLeft,
    FileText,
    Calendar,
    DollarSign,
    BarChart2,
    Plus,
    Download,
    Trash2,
    Eye,
    RefreshCw,
} from 'lucide-react';
import DocumentPreviewModal from '../../components/Contracts/DocumentPreviewModal';
import PerformanceCharts from '../../components/Contracts/PerformanceCharts';
import { format } from 'date-fns';

export default function ContractDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'delegate' | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{
        label: string;
        url: string;
        mimeType: string;
    } | null>(null);

    // Fetch contract details
    const { data: contractDetail, isLoading } = useQuery<ContractDetail>({
        queryKey: ['contract-detail', id],
        queryFn: () => contractApi.getDetails(id!),
        enabled: !!id,
    });

    // Fetch documents
    const { data: documents = [] } = useQuery<ContractDocument[]>({
        queryKey: ['contract-documents', id],
        queryFn: () => contractApi.listDocuments(id!),
        enabled: !!id,
    });

    // Fetch approval history
    const { data: approvals = [] } = useQuery<ContractApproval[]>({
        queryKey: ['contract-approvals', id],
        queryFn: () => contractApi.getApprovalHistory(id!),
        enabled: !!id,
    });

    // Fetch renewals
    const { data: renewals = [] } = useQuery({
        queryKey: ['contract-renewals', id],
        queryFn: () => contractApi.listRenewals(id!),
        enabled: !!id,
    });

    // Submit for approval mutation
    const submitMutation = useMutation({
        mutationFn: () => contractApi.submitForApproval(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract-detail', id] });
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            alert('Contract submitted for approval successfully');
        },
        onError: (error: unknown) => {
            console.error('Submit failed:', error);
            alert('Failed to submit contract for approval');
        },
    });

    const handleDownload = async (documentId: string, fileName: string) => {
        try {
            const blob = await contractApi.downloadDocument(documentId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download document');
        }
    };

    const handlePreview = async (doc: ContractDocument) => {
        try {
            const blob = await contractApi.downloadDocument(doc.id);
            const url = window.URL.createObjectURL(blob);
            setPreviewDoc({
                label: doc.file_name,
                url,
                mimeType: doc.mime_type || (doc.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            });
        } catch (error) {
            console.error('Preview failed:', error);
            alert('Failed to preview document');
        }
    };

    const handleDelete = async (documentId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await contractApi.deleteDocument(documentId);
            queryClient.invalidateQueries({ queryKey: ['contract-documents', id] });
            alert('Document deleted successfully');
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete document');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!contractDetail) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Contract not found</p>
            </div>
        );
    }

    const { contract, performance } = contractDetail;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{contract.contract_number}</h1>
                    <p className="text-muted-foreground mt-1">{contract.client_name}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/contracts')}
                        className="flex items-center space-x-2 px-4 py-2 text-foreground bg-card border border-border rounded-lg hover:bg-muted"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back</span>
                    </button>

                    {/* Approval Buttons */}
                    {contract.status === 'draft' && (
                        <button
                            onClick={() => submitMutation.mutate()}
                            disabled={submitMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    )}

                    {contract.status === 'pending_approval' && (
                        <>
                            <button
                                onClick={() => setApprovalAction('approve')}
                                className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90"
                            >
                                Approve Contract
                            </button>
                            <button
                                onClick={() => setApprovalAction('reject')}
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                            >
                                Reject Contract
                            </button>
                            <button
                                onClick={() => setApprovalAction('delegate')}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                            >
                                Delegate Approval
                            </button>
                        </>
                    )}

                    {/* Renewal Button */}
                    {(contract.status === 'active' || contract.status === 'expiring' || contract.status === 'expired') && (
                        <button
                            onClick={() => setIsRenewalModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-md shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all font-medium"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Renew Contract</span>
                        </button>
                    )}

                    <ApprovalStatusBadge status={contract.status} size="md" />
                </div>
            </div>

            {/* Approval Progress Indicator */}
            {(contract.status === 'pending_approval' || contract.status === 'active' || contract.status === 'rejected') && (
                <ApprovalProgress
                    currentStep={contract.current_approval_step}
                    totalSteps={contract.total_approval_steps}
                    status={contract.status}
                />
            )}

            {/* Performance Metrics */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Rentals</p>
                                <p className="text-3xl font-bold text-foreground mt-2 font-mono">{performance.total_rentals}</p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <BarChart2 size={24} className="text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Rentals</p>
                                <p className="text-3xl font-bold text-foreground mt-2 font-mono">{performance.active_rentals}</p>
                            </div>
                            <div className="p-3 bg-success/10 rounded-xl">
                                <FileText size={24} className="text-success" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold text-foreground mt-2 font-mono">
                                    Rp {performance.total_revenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <DollarSign size={24} className="text-purple-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* MA, PA, UA, EU Charts & Cards */}
                <PerformanceCharts performance={performance} />
            </div>

            {/* Contract Information */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Contract Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="text-foreground mt-1 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                            {format(new Date(contract.start_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">End Date</p>
                        <p className="text-foreground mt-1 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                            {format(new Date(contract.end_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Terms</p>
                        <p className="text-foreground mt-1">{contract.payment_terms}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Auto Renew</p>
                        <p className="text-foreground mt-1">{contract.auto_renew ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Price Lock</p>
                        <p className="text-foreground mt-1">{contract.price_lock ? 'Yes' : 'No'}</p>
                    </div>
                    {contract.notes && (
                        <div className="md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Notes</p>
                            <p className="text-foreground mt-1">{contract.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Contract Timeline */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Contract Timeline</h2>
                <ContractTimeline
                    contract={contract}
                    approvals={approvals}
                    documents={documents}
                    renewals={renewals}
                    showDocuments={false}
                />
            </div>
            {/* Related Rentals */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Related Rentals</h2>

                {contractDetail.related_rentals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No rentals linked to this contract</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Rental No
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Asset
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        End Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Total Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {contractDetail.related_rentals.map((rental) => (
                                    <tr
                                        key={rental.id}
                                        className="hover:bg-muted/50 cursor-pointer"
                                        onClick={() => navigate(`/rentals/${rental.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                            {rental.rental_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            {rental.asset_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rental.status === 'rented_out' ? 'bg-success/10 text-success' : 'bg-muted/50 text-muted-foreground'
                                                }`}>
                                                {rental.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {rental.start_date ? format(new Date(rental.start_date), 'MMM dd, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {rental.expected_end_date ? format(new Date(rental.expected_end_date), 'MMM dd, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-right font-medium">
                                            Rp {rental.total_amount?.toLocaleString() || '0'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Documents */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Documents</h2>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Upload Document</span>
                    </button>
                </div>

                {documents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No documents uploaded yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        File Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Uploaded
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {documents.map((doc: ContractDocument) => (
                                    <tr key={doc.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {doc.file_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {doc.document_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {(doc.file_size / 1024).toFixed(2)} KB
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handlePreview(doc)}
                                                className="text-primary hover:text-primary/80 mr-4"
                                                title="Preview"
                                            >
                                                <Eye className="h-5 w-5 inline" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.file_name)}
                                                className="text-muted-foreground hover:text-foreground mr-4"
                                                title="Download"
                                            >
                                                <Download className="h-5 w-5 inline" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="text-destructive hover:text-destructive/80"
                                            >
                                                <Trash2 className="h-5 w-5 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approval History */}
            {contract && (
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                    <ApprovalHistory contractId={contract.id} />
                </div>
            )}

            {/* Renewal Modal */}
            {contract && (
                <RenewalModal
                    contractId={contract.id}
                    contractNumber={contract.contract_number}
                    isOpen={isRenewalModalOpen}
                    onClose={() => setIsRenewalModalOpen(false)}
                />
            )}

            {/* Modals */}
            {approvalAction && contract && (
                <ApprovalModal
                    contractId={contract.id}
                    contractNumber={contract.contract_number}
                    action={approvalAction}
                    isOpen={!!approvalAction}
                    onClose={() => setApprovalAction(null)}
                />
            )}

            <DocumentUploadModal
                contractId={id!}
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['contract-documents', id] });
                }}
            />

            {/* Document Preview Modal */}
            {previewDoc && (
                <DocumentPreviewModal
                    fileLabel={previewDoc.label}
                    fileUrl={previewDoc.url}
                    mimeType={previewDoc.mimeType}
                    isOpen={!!previewDoc}
                    onClose={() => {
                        if (previewDoc.url) window.URL.revokeObjectURL(previewDoc.url);
                        setPreviewDoc(null);
                    }}
                />
            )}
        </div>
    );
}
