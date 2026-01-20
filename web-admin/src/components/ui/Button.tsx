// Common UI Components - Pure Tailwind
// Button Component
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.95]';

    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 focus:ring-blue-500',
        secondary: 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500',
        outline: 'border border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white focus:ring-gray-500',
        ghost: 'hover:bg-gray-800 text-gray-400 hover:text-white focus:ring-gray-500',
        danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500 shadow-lg shadow-red-500/20',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm', // Slightly larger touch target
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    );
}
