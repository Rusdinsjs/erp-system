import { CheckCircle, Circle, XCircle } from 'lucide-react';

interface ApprovalProgressProps {
    currentStep: number;
    totalSteps: number;
    status: string;
}

export default function ApprovalProgress({ currentStep, totalSteps, status }: ApprovalProgressProps) {
    const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

    const getStepStatus = (step: number) => {
        if (status === 'rejected') {
            return step <= currentStep ? 'rejected' : 'pending';
        }
        if (status === 'active') {
            return 'approved';
        }
        if (step < currentStep) {
            return 'approved';
        }
        if (step === currentStep) {
            return status === 'pending_approval' ? 'current' : 'pending';
        }
        return 'pending';
    };

    const getStepColor = (stepStatus: string) => {
        switch (stepStatus) {
            case 'approved':
                return 'bg-green-500 border-green-500';
            case 'current':
                return 'bg-blue-500 border-blue-500 animate-pulse';
            case 'rejected':
                return 'bg-red-500 border-red-500';
            default:
                return 'bg-gray-300 border-gray-300';
        }
    };

    const getStepIcon = (stepStatus: string) => {
        switch (stepStatus) {
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-white" />;
            case 'rejected':
                return <XCircle className="w-5 h-5 text-white" />;
            default:
                return <Circle className="w-5 h-5 text-white" />;
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Approval Progress</h3>

            <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                    const stepStatus = getStepStatus(step);
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={step} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStepColor(stepStatus)}`}
                                >
                                    {getStepIcon(stepStatus)}
                                </div>
                                <span className="text-xs text-gray-400 mt-2">Level {step}</span>
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                                <div className="flex-1 h-0.5 mx-2 bg-gray-700">
                                    <div
                                        className={`h-full transition-all duration-500 ${stepStatus === 'approved' ? 'bg-green-500' : 'bg-gray-700'
                                            }`}
                                        style={{
                                            width: stepStatus === 'approved' ? '100%' : '0%',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status Text */}
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
                    {status === 'active' && 'All approvals completed ✓'}
                    {status === 'pending_approval' && `Awaiting approval at level ${currentStep}`}
                    {status === 'rejected' && `Rejected at level ${currentStep}`}
                    {status === 'draft' && 'Not yet submitted for approval'}
                </p>
            </div>
        </div>
    );
}
