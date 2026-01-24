import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { contractApi } from '../api/contract';
import type { ContractDetail, ContractDocument, ContractApproval } from '../types/contract';
import DocumentUploadModal from '../components/Contracts/DocumentUploadModal';
import ApprovalModal from '../components/Contracts/ApprovalModal';
import ApprovalHistory from '../components/Contracts/ApprovalHistory';
import ApprovalProgress from '../components/Contracts/ApprovalProgress';
import ApprovalStatusBadge from '../components/Contracts/ApprovalStatusBadge';
import ContractTimeline from '../components/Contracts/ContractTimeline';
import RenewalModal from '../components/Contracts/RenewalModal';
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
import DocumentPreviewModal from '../components/Contracts/DocumentPreviewModal';
import PerformanceCharts from '../components/Contracts/PerformanceCharts';
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!contractDetail) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Contract not found</p>
            </div>
        );
    }

    const { contract, performance } = contractDetail;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{contract.contract_number}</h1>
                    <p className="text-gray-600 mt-1">{contract.client_name}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate('/contracts')}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span>Back</span>
                    </button>

                    {/* Approval Buttons */}
                    {contract.status === 'draft' && (
                        <button
                            onClick={() => submitMutation.mutate()}
                            disabled={submitMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    )}

                    {contract.status === 'pending_approval' && (
                        <>
                            <button
                                onClick={() => setApprovalAction('approve')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Approve Contract
                            </button>
                            <button
                                onClick={() => setApprovalAction('reject')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Reject Contract
                            </button>
                            <button
                                onClick={() => setApprovalAction('delegate')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Delegate Approval
                            </button>
                        </>
                    )}

                    {/* Renewal Button */}
                    {(contract.status === 'active' || contract.status === 'expiring' || contract.status === 'expired') && (
                        <button
                            onClick={() => setIsRenewalModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all font-medium"
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
                    <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Total Rentals</p>
                                <p className="text-3xl font-bold text-white mt-2 font-mono">{performance.total_rentals}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <BarChart2 size={24} className="text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Active Rentals</p>
                                <p className="text-3xl font-bold text-white mt-2 font-mono">{performance.active_rentals}</p>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <FileText size={24} className="text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                                <p className="text-3xl font-bold text-white mt-2 font-mono">
                                    Rp {performance.total_revenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <DollarSign size={24} className="text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* MA, PA, UA, EU Charts & Cards */}
                <PerformanceCharts performance={performance} />
            </div>

            {/* Contract Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Start Date</p>
                        <p className="text-gray-900 mt-1 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                            {format(new Date(contract.start_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">End Date</p>
                        <p className="text-gray-900 mt-1 flex items-center">
                            <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                            {format(new Date(contract.end_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Payment Terms</p>
                        <p className="text-gray-900 mt-1">{contract.payment_terms}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Auto Renew</p>
                        <p className="text-gray-900 mt-1">{contract.auto_renew ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Price Lock</p>
                        <p className="text-gray-900 mt-1">{contract.price_lock ? 'Yes' : 'No'}</p>
                    </div>
                    {contract.notes && (
                        <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-600">Notes</p>
                            <p className="text-gray-900 mt-1">{contract.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Contract Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Contract Timeline</h2>
                <ContractTimeline
                    contract={contract}
                    approvals={approvals}
                    documents={documents}
                    renewals={renewals}
                    showDocuments={false}
                />
            </div>
            {/* Related Rentals */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Rentals</h2>

                {contractDetail.related_rentals.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No rentals linked to this contract</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rental No
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Asset
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        End Date
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {contractDetail.related_rentals.map((rental) => (
                                    <tr
                                        key={rental.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => navigate(`/rentals/${rental.id}`)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            {rental.rental_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {rental.asset_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rental.status === 'rented_out' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {rental.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {rental.start_date ? format(new Date(rental.start_date), 'MMM dd, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {rental.expected_end_date ? format(new Date(rental.expected_end_date), 'MMM dd, yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Upload Document</span>
                    </button>
                </div>

                {documents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        File Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Uploaded
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {documents.map((doc: ContractDocument) => (
                                    <tr key={doc.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {doc.file_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {doc.document_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(doc.file_size / 1024).toFixed(2)} KB
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handlePreview(doc)}
                                                className="text-blue-400 hover:text-blue-300 mr-4"
                                                title="Preview"
                                            >
                                                <Eye className="h-5 w-5 inline" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(doc.id, doc.file_name)}
                                                className="text-gray-400 hover:text-white mr-4"
                                                title="Download"
                                            >
                                                <Download className="h-5 w-5 inline" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="text-red-600 hover:text-red-900"
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
