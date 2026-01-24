import classNames from 'classnames';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={classNames("animate-pulse rounded-md bg-gray-900/50", className)}
            {...props}
        />
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
    return (
        <div className="w-full space-y-4">
            <div className="flex space-x-4 border-b border-gray-800 pb-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={`head-${i}`} className="h-6 w-full" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={`row-${r}`} className="flex space-x-4 py-2">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={`cell-${r}-${c}`} className="h-8 w-full" />
                    ))}
                </div>
            ))}
        </div>
    );
}
