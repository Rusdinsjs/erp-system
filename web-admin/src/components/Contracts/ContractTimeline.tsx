import {
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    Upload,
    AlertCircle,
    RefreshCw,
    Ban,
    Calendar,
    Play
} from 'lucide-react';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import type { Contract, ContractApproval, ContractDocument, RenewalResponse } from '../../types/contract';

export interface TimelineEvent {
    id: string;
    type: 'created' | 'submitted' | 'approved' | 'rejected' | 'activated' | 'document_uploaded' | 'expiring' | 'expired' | 'renewed' | 'terminated';
    date: string;
    title: string;
    description?: string;
    icon: typeof FileText;
    color: string;
    bgColor: string;
    borderColor: string;
    metadata?: Record<string, any>;
}

interface ContractTimelineProps {
    contract: Contract;
    approvals?: ContractApproval[];
    documents?: ContractDocument[];
    renewals?: RenewalResponse[];
    showDocuments?: boolean;
}

const getEventConfig = (type: TimelineEvent['type']) => {
    switch (type) {
        case 'created':
            return {
                icon: FileText,
                color: 'text-muted-foreground',
                bgColor: 'bg-muted',
                borderColor: 'border-border',
            };
        case 'submitted':
            return {
                icon: Clock,
                color: 'text-primary',
                bgColor: 'bg-primary/10',
                borderColor: 'border-primary/30',
            };
        case 'approved':
            return {
                icon: CheckCircle,
                color: 'text-success',
                bgColor: 'bg-success/10',
                borderColor: 'border-success/30',
            };
        case 'rejected':
            return {
                icon: XCircle,
                color: 'text-destructive',
                bgColor: 'bg-destructive/10',
                borderColor: 'border-destructive/30',
            };
        case 'activated':
            return {
                icon: Play,
                color: 'text-success',
                bgColor: 'bg-success/10',
                borderColor: 'border-success/30',
            };
        case 'document_uploaded':
            return {
                icon: Upload,
                color: 'text-purple-500',
                bgColor: 'bg-purple-500/10',
                borderColor: 'border-purple-500/30',
            };
        case 'expiring':
            return {
                icon: AlertCircle,
                color: 'text-warning',
                bgColor: 'bg-warning/10',
                borderColor: 'border-warning/30',
            };
        case 'expired':
            return {
                icon: XCircle,
                color: 'text-destructive',
                bgColor: 'bg-destructive/10',
                borderColor: 'border-destructive/30',
            };
        case 'renewed':
            return {
                icon: RefreshCw,
                color: 'text-primary',
                bgColor: 'bg-primary/10',
                borderColor: 'border-primary/30',
            };
        case 'terminated':
            return {
                icon: Ban,
                color: 'text-muted-foreground',
                bgColor: 'bg-muted',
                borderColor: 'border-muted',
            };
        default:
            return {
                icon: Calendar,
                color: 'text-muted-foreground',
                bgColor: 'bg-muted',
                borderColor: 'border-border',
            };
    }
};

const generateTimelineEvents = (
    contract: Contract,
    approvals?: ContractApproval[],
    documents?: ContractDocument[],
    renewals?: RenewalResponse[],
    showDocuments = false
): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Contract Created
    events.push({
        id: 'created',
        type: 'created',
        date: contract.created_at,
        title: 'Contract Created',
        description: `Contract ${contract.contract_number} was created`,
        ...getEventConfig('created'),
    });

    // 2. Approval Events
    if (approvals && approvals.length > 0) {
        approvals.forEach((approval) => {
            const type = approval.action === 'approved' ? 'approved' :
                approval.action === 'rejected' ? 'rejected' : 'submitted';

            events.push({
                id: `approval-${approval.id}`,
                type,
                date: approval.created_at,
                title: approval.action === 'submitted' ? 'Submitted for Approval' :
                    approval.action === 'approved' ? 'Contract Approved' :
                        'Contract Rejected',
                description: approval.notes || `${approval.action} by ${approval.approver_name || 'System'}`,
                ...getEventConfig(type),
                metadata: { approver: approval.approver_name },
            });
        });
    }

    // 3. Contract Activation (start_date)
    if (contract.status !== 'draft' && contract.start_date) {
        const startDate = new Date(contract.start_date);
        const now = new Date();

        if (isBefore(startDate, now) || contract.status === 'active') {
            events.push({
                id: 'activated',
                type: 'activated',
                date: contract.start_date,
                title: 'Contract Activated',
                description: `Contract became active`,
                ...getEventConfig('activated'),
            });
        }
    }

    // 4. Document Uploads (optional)
    if (showDocuments && documents && documents.length > 0) {
        documents.slice(0, 3).forEach((doc) => { // Limit to first 3 documents
            events.push({
                id: `doc-${doc.id}`,
                type: 'document_uploaded',
                date: doc.uploaded_at,
                title: 'Document Uploaded',
                description: doc.file_name,
                ...getEventConfig('document_uploaded'),
                metadata: { fileName: doc.file_name, type: doc.document_type },
            });
        });
    }

    // 5. Expiring Warning (30 days before end_date)
    if (contract.end_date) {
        const endDate = new Date(contract.end_date);
        const expiringDate = addDays(endDate, -30);
        const now = new Date();

        if (isAfter(now, expiringDate) && isBefore(now, endDate)) {
            events.push({
                id: 'expiring',
                type: 'expiring',
                date: expiringDate.toISOString(),
                title: 'Expiring Soon',
                description: `Contract expires in ${differenceInDays(endDate, now)} days`,
                ...getEventConfig('expiring'),
            });
        }
    }

    // 6. Contract End Event
    if (contract.end_date) {
        const endDate = new Date(contract.end_date);
        const now = new Date();

        if (contract.status === 'expired' || isAfter(now, endDate)) {
            events.push({
                id: 'expired',
                type: 'expired',
                date: contract.end_date,
                title: 'Contract Expired',
                description: 'Contract has ended',
                ...getEventConfig('expired'),
            });
        } else if (contract.status === 'renewed') {
            events.push({
                id: 'renewed',
                type: 'renewed',
                date: contract.end_date,
                title: 'Contract Renewed',
                description: 'Contract was renewed',
                ...getEventConfig('renewed'),
            });
        } else if (contract.status === 'terminated') {
            events.push({
                id: 'terminated',
                type: 'terminated',
                date: contract.end_date,
                title: 'Contract Terminated',
                description: 'Contract was terminated early',
                ...getEventConfig('terminated'),
            });
        }
    }

    // 7. Renewals
    if (renewals && renewals.length > 0) {
        renewals.forEach((renewal) => {
            events.push({
                id: `renewal-${renewal.id}`,
                type: 'renewed',
                date: renewal.renewed_at,
                title: 'Contract Renewed',
                description: `Type: ${renewal.renewal_type.toUpperCase()}${renewal.notes ? ` - ${renewal.notes}` : ''}`,
                ...getEventConfig('renewed'),
                metadata: {
                    type: renewal.renewal_type,
                    previousEnd: format(new Date(renewal.previous_end_date), 'MMM dd, yyyy'),
                    newEnd: format(new Date(renewal.new_end_date), 'MMM dd, yyyy')
                },
            });
        });
    }

    // Sort events chronologically
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export default function ContractTimeline({
    contract,
    approvals,
    documents,
    renewals,
    showDocuments = false
}: ContractTimelineProps) {
    const events = generateTimelineEvents(contract, approvals, documents, renewals, showDocuments);
    const now = new Date();

    // Calculate progress percentage
    const startDate = new Date(contract.start_date || contract.created_at);
    const endDate = new Date(contract.end_date || addDays(startDate, 365));
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(now, startDate);
    const progressPercentage = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="relative">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{format(startDate, 'MMM dd, yyyy')}</span>
                    <span className="font-medium text-foreground">{Math.round(progressPercentage)}% Complete</span>
                    <span>{format(endDate, 'MMM dd, yyyy')}</span>
                </div>
            </div>

            {/* Timeline Events */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                {/* Events */}
                <div className="space-y-6">
                    {events.map((event) => {
                        const Icon = event.icon;
                        const isPast = isBefore(new Date(event.date), now);
                        const isCurrent = !isPast && event.id === events.find(e => isAfter(new Date(e.date), now))?.id;

                        return (
                            <div key={event.id} className="relative flex items-start space-x-4 group">
                                {/* Icon */}
                                <div className={`relative z-10 flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 ${event.borderColor} ${event.bgColor} ${isPast ? 'opacity-100' : 'opacity-50'} transition-all group-hover:scale-110 group-hover:opacity-100`}>
                                    <Icon className={`h-6 w-6 ${event.color}`} />
                                    {isCurrent && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 min-w-0 pt-1.5 ${isPast ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100 transition-opacity`}>
                                    <div className={`bg-card border ${event.borderColor} rounded-lg p-4 shadow-sm group-hover:shadow-md transition-shadow`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className={`text-sm font-semibold ${event.color}`}>
                                                    {event.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                                                </p>
                                            </div>
                                            {isCurrent && (
                                                <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                                    Current
                                                </span>
                                            )}
                                        </div>

                                        {event.description && (
                                            <p className="text-sm text-foreground mt-2">
                                                {event.description}
                                            </p>
                                        )}

                                        {event.metadata && (
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(event.metadata).map(([key, value]) => (
                                                        <span key={key} className="text-xs text-muted-foreground">
                                                            <span className="font-medium">{key}:</span> {value}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{events.length}</p>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{elapsedDays}</p>
                    <p className="text-xs text-muted-foreground">Days Elapsed</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{Math.max(totalDays - elapsedDays, 0)}</p>
                    <p className="text-xs text-muted-foreground">Days Remaining</p>
                </div>
            </div>
        </div>
    );
}
