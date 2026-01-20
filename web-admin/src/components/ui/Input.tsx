// Input Component - Pure Tailwind
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-gray-300">
                        {label}
                        {props.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
                            w-full px-4 py-3 bg-gray-900 border rounded-xl
                            text-white placeholder-gray-600
                            focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-gray-900
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 outline-none
                            ${leftIcon ? 'pl-10' : ''}
                            ${rightIcon ? 'pr-10' : ''}
                            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-700'}
                            ${className}
                        `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {hint && !error && (
                    <p className="text-xs text-gray-500">{hint}</p>
                )}
                {error && (
                    <p className="text-xs text-red-400">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
