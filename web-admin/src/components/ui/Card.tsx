// Card Component - Pure Tailwind
import { type ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={`
                bg-gray-900/50 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/40 ring-1 ring-white/10 rounded-2xl
                ${paddings[padding]}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// Card Header
interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
    return (
        <div className={`pb-4 border-b border-white/5 mb-4 ${className}`}>
            {children}
        </div>
    );
}

// Card Title
interface CardTitleProps {
    children: ReactNode;
    className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
    return (
        <h3 className={`text-lg font-semibold text-white tracking-tight ${className}`}>
            {children}
        </h3>
    );
}

// Card Content
interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return <div className={className}>{children}</div>;
}

// Card Footer
interface CardFooterProps {
    children: ReactNode;
    className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
    return (
        <div className={`pt-4 border-t border-white/5 mt-4 ${className}`}>
            {children}
        </div>
    );
}
