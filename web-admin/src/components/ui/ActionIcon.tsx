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
        default: 'text-slate-400 hover:text-white hover:bg-slate-800',
        danger: 'text-slate-400 hover:text-red-400 hover:bg-red-900/20',
        success: 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20',
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
