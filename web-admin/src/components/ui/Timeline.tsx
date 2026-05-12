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
                        absolute top-8 left-[15px] w-0.5 h-[calc(100%-8px)] bg-border
                        ${lineVariant === 'dashed' ? 'border-l-2 border-dashed border-border bg-transparent' : ''}
                    `}
                />
            )}

            {/* Bullet */}
            <div
                className={`
                    relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 
                    ${bulletClassName ? bulletClassName : (active
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-card border-border text-muted-foreground')
                    }
                `}
            >
                {bullet}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
                <div className="font-medium text-foreground mb-1">
                    {title}
                </div>
                <div className="text-sm text-muted-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}
