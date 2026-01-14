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
                    <label className="block text-sm font-medium text-slate-300">
                        {label}
                        {props.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
                            w-full px-4 py-2.5 bg-slate-950/50 border rounded-xl
                            text-white placeholder-slate-500
                            focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 outline-none
                            ${leftIcon ? 'pl-10' : ''}
                            ${rightIcon ? 'pr-10' : ''}
                            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700'}
                            ${className}
                        `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {hint && !error && (
                    <p className="text-xs text-slate-500">{hint}</p>
                )}
                {error && (
                    <p className="text-xs text-red-400">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
