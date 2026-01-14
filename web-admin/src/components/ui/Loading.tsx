// Loading Components - Pure Tailwind

// Spinner
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-3',
    };

    return (
        <div
            className={`
                ${sizes[size]} 
                border-cyan-500 border-t-transparent 
                rounded-full animate-spin
                ${className}
            `}
        />
    );
}

// Loading Overlay
interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
    if (!visible) return null;

    return (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Spinner size="lg" />
            {message && (
                <p className="mt-3 text-sm text-slate-400">{message}</p>
            )}
        </div>
    );
}

// Page Loading
export function PageLoading() {
    return (
        <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
            <span className="ml-3 text-slate-500">Loading...</span>
        </div>
    );
}

// Skeleton
interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`
                animate-pulse bg-slate-800 rounded-lg
                ${className}
            `}
        />
    );
}
