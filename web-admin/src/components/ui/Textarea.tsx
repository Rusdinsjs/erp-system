// Textarea Component - Pure Tailwind
import { type TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className = '', ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-slate-300">
                        {label}
                        {props.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={`
                        w-full px-4 py-3 bg-slate-950/50 border rounded-xl
                        text-white placeholder-slate-500 resize-none
                        focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 outline-none
                        ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700'}
                        ${className}
                    `}
                    {...props}
                />
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

Textarea.displayName = 'Textarea';
