// Select Component - Pure Tailwind
import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
    onChange?: (value: string) => void;
    onCreate?: () => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, placeholder, className = '', onChange, onCreate, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newValue = e.target.value;
            if (onCreate && newValue === '__CREATE_NEW__') {
                onCreate();
                // We don't call onChange, so the controlled value remains unchanged
                // React will re-render and snap the select back to the original value
                return;
            }
            onChange?.(newValue);
        };

        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-slate-300">
                        {label}
                        {props.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`
                            w-full px-4 py-2.5 pr-10 bg-slate-950/50 border rounded-xl
                            text-white appearance-none cursor-pointer
                            focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 outline-none
                            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700'}
                            ${className}
                        `}
                        onChange={handleChange}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                                className="bg-slate-900 text-white"
                            >
                                {option.label}
                            </option>
                        ))}
                        {onCreate && (
                            <option value="__CREATE_NEW__" className="bg-slate-800 text-cyan-400 font-semibold">
                                + Add New Item...
                            </option>
                        )}
                    </select>
                    <ChevronDown
                        size={18}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
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

Select.displayName = 'Select';
