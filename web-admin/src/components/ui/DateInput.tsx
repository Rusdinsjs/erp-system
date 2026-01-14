// DateInput Component - Pure Tailwind
import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    label?: string;
    error?: string;
    hint?: string;
    value?: Date | string | null;
    onChange?: (date: Date | null) => void;
    required?: boolean;
    disabled?: boolean;
    clearable?: boolean;
    className?: string;
    placeholder?: string;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
    ({
        label,
        error,
        hint,
        value,
        onChange,
        required,
        disabled,
        className = '',
        placeholder = 'Select date...',
    }, ref) => {
        // Convert value to string format for input
        const stringValue = value
            ? (value instanceof Date ? value.toISOString().split('T')[0] : value)
            : '';

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            if (val) {
                onChange?.(new Date(val));
            } else {
                onChange?.(null);
            }
        };

        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-slate-300">
                        {label}
                        {required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        type="date"
                        value={stringValue}
                        onChange={handleChange}
                        disabled={disabled}
                        required={required}
                        placeholder={placeholder}
                        className={`
                            w-full px-4 py-2.5 pl-10 bg-slate-950/50 border rounded-xl
                            text-white placeholder-slate-500
                            focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 outline-none
                            [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert
                            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700'}
                            ${className}
                        `}
                    />
                    <Calendar
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
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

DateInput.displayName = 'DateInput';
