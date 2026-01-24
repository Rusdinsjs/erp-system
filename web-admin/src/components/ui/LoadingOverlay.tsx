import { LoadingSpinner } from './LoadingSpinner';
import classNames from 'classnames';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
    fullScreen?: boolean;
    className?: string;
}

export function LoadingOverlay({
    visible,
    message,
    fullScreen = false,
    className
}: LoadingOverlayProps) {
    if (!visible) return null;

    const baseClasses = "flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm z-50 transition-opacity duration-200";
    const positionClasses = fullScreen ? "fixed inset-0" : "absolute inset-0";

    return (
        <div className={classNames(baseClasses, positionClasses, className)}>
            <LoadingSpinner size="lg" />
            {message && (
                <p className="mt-4 text-sm font-medium text-gray-200 animate-pulse">{message}</p>
            )}
        </div>
    );
}
