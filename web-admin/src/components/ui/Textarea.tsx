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
                    <label className="block text-sm font-medium text-muted-foreground">
                        {label}
                        {props.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={`
                        w-full px-4 py-3 bg-background border rounded-xl
                        text-foreground placeholder-muted-foreground/50 resize-none
                        focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 outline-none
                        ${error ? 'border-destructive focus:ring-destructive/20' : 'border-border'}
                        ${className}
                    `}
                    {...props}
                />
                {hint && !error && (
                    <p className="text-xs text-muted-foreground">{hint}</p>
                )}
                {error && (
                    <p className="text-xs text-destructive">{error}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
