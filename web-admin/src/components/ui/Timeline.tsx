// Timeline Component - Pure Tailwind
import type { ReactNode } from 'react';

interface TimelineProps {
    children: ReactNode;
    className?: string;
}

export function Timeline({ children, className = '' }: TimelineProps) {
    return (
        <div className={`space-y-0 ${className}`}>
            {children}
        </div>
    );
}

interface TimelineItemProps {
    bullet?: ReactNode;
    title: ReactNode;
    children?: ReactNode;
    active?: boolean;
    lineVariant?: 'dashed' | 'solid' | 'dotted';
    className?: string;
    isLast?: boolean;
}

export function TimelineItem({
    bullet,
    title,
    children,
    active = false,
    lineVariant = 'solid',
    className = '',
    isLast = false,
    bulletClassName = '',
}: TimelineItemProps & { bulletClassName?: string }) {
    return (
        <div className={`relative flex gap-4 pb-8 ${isLast ? 'pb-0' : ''} ${className}`}>
            {/* Line */}
            {!isLast && (
                <div
                    className={`
                        absolute top-8 left-[15px] w-0.5 h-[calc(100%-8px)] bg-slate-800
                        ${lineVariant === 'dashed' ? 'border-l-2 border-dashed border-slate-800 bg-transparent' : ''}
                    `}
                />
            )}

            {/* Bullet */}
            <div
                className={`
                    relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 
                    ${bulletClassName ? bulletClassName : (active
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-900 border-slate-700 text-slate-500')
                    }
                `}
            >
                {bullet}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
                <div className="font-medium text-white mb-1">
                    {title}
                </div>
                <div className="text-sm text-slate-400">
                    {children}
                </div>
            </div>
        </div>
    );
}
