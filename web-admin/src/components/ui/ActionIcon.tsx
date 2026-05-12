// Action Icon Button - Pure Tailwind
import { type ButtonHTMLAttributes } from 'react';

interface ActionIconProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'default' | 'danger' | 'success';
    size?: 'sm' | 'md';
}

export function ActionIcon({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}: ActionIconProps) {
    const variants = {
        default: 'text-muted-foreground hover:text-foreground hover:bg-muted',
        danger: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
        success: 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10',
    };

    const sizes = {
        sm: 'p-1.5',
        md: 'p-2',
    };

    return (
        <button
            type="button"
            className={`
                inline-flex items-center justify-center rounded-lg
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `}
            {...props}
        >
            {children}
        </button>
    );
}
