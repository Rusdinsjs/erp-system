
interface ProgressProps {
    value: number;
    color?: 'blue' | 'green' | 'orange' | 'cyan' | 'emerald';
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    className?: string;
}

export function Progress({
    value,
    color = 'blue',
    size = 'md',
    showValue = false,
    className = ''
}: ProgressProps) {
    const clampedValue = Math.min(100, Math.max(0, value));

    const colorClasses = {
        blue: 'bg-blue-500 shadow-blue-500/50',
        green: 'bg-green-500 shadow-green-500/50',
        orange: 'bg-orange-500 shadow-orange-500/50',
        cyan: 'bg-cyan-500 shadow-cyan-500/50',
        emerald: 'bg-emerald-500 shadow-emerald-500/50',
    };

    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-4',
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="flex justify-between items-center mb-1">
                {showValue && (
                    <span className="text-xs font-bold text-slate-400">
                        {Math.round(clampedValue)}% Complete
                    </span>
                )}
            </div>
            <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`${colorClasses[color]} h-full rounded-full transition-all duration-500 ease-out shadow-sm`}
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
        </div>
    );
}
