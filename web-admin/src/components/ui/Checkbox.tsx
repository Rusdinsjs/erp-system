// Checkbox Component - Pure Tailwind
import { type InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, className = '', ...props }, ref) => {
        return (
            <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
                <div className="relative">
                    <input
                        ref={ref}
                        type="checkbox"
                        className="sr-only peer"
                        {...props}
                    />
                    <div className="w-5 h-5 border-2 border-border rounded bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors">
                        <Check size={14} className="text-primary-foreground opacity-0 peer-checked:opacity-100 m-0.5" />
                    </div>
                </div>
                {label && (
                    <span className="text-sm text-muted-foreground">{label}</span>
                )}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
