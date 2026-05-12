import { CheckCircle, Clock, XCircle, AlertCircle, FileCheck, Ban } from 'lucide-react';
import type { Contract } from '../../types/contract';

interface ApprovalStatusBadgeProps {
    status: Contract['status'];
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    currentStep?: number;
    totalSteps?: number;
}

export default function ApprovalStatusBadge({
    status,
    size = 'md',
    showIcon = true,
    currentStep,
    totalSteps,
}: ApprovalStatusBadgeProps) {
    const getStatusConfig = (status: Contract['status']) => {
        switch (status) {
            case 'draft':
                return {
                    label: 'Draft',
                    color: 'bg-gray-100 text-gray-700 border-gray-300',
                    icon: FileCheck,
                };
            case 'pending_approval':
                return {
                    label: 'Pending Approval',
                    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    icon: Clock,
                };
            case 'active':
                return {
                    label: 'Active',
                    color: 'bg-green-100 text-green-800 border-green-300',
                    icon: CheckCircle,
                };
            case 'expiring':
                return {
                    label: 'Expiring Soon',
                    color: 'bg-orange-100 text-orange-800 border-orange-300',
                    icon: AlertCircle,
                };
            case 'expired':
                return {
                    label: 'Expired',
                    color: 'bg-red-100 text-red-800 border-red-300',
                    icon: XCircle,
                };
            case 'renewed':
                return {
                    label: 'Renewed',
                    color: 'bg-blue-100 text-blue-800 border-blue-300',
                    icon: CheckCircle,
                };
            case 'terminated':
                return {
                    label: 'Terminated',
                    color: 'bg-gray-700 text-white border-gray-800',
                    icon: Ban,
                };
            default:
                return {
                    label: status,
                    color: 'bg-gray-100 text-gray-700 border-gray-300',
                    icon: FileCheck,
                };
        }
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    // Show approval level if pending and steps are provided
    const showApprovalLevel = status === 'pending_approval' && currentStep !== undefined && totalSteps !== undefined;
    const label = showApprovalLevel
        ? `${config.label} (${currentStep}/${totalSteps})`
        : config.label;

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.color} ${sizeClasses[size]}`}
        >
            {showIcon && <Icon className={iconSizes[size]} />}
            {label}
        </span>
    );
}
