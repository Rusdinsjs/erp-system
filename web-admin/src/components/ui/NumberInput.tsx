// NumberInput Component - Pure Tailwind
import { type InputHTMLAttributes, forwardRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    label?: string;
    error?: string;
    hint?: string;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: number | string;
    onChange?: (value: number | undefined) => void;
    thousandSeparator?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({
        label,
        error,
        hint,
        prefix,
        suffix,
        min,
        max,
        step = 1,
        value,
        onChange,
        thousandSeparator = false,
        className = '',
        ...props
    }, ref) => {
        const [displayValue, setDisplayValue] = useState<string>(() => {
            if (value === undefined || value === '') return '';
            if (thousandSeparator) {
                return Number(value).toLocaleString('id-ID');
            }
            return String(value);
        });

        const parseValue = (v: string): number | undefined => {
            if (!v) return undefined;
            // For id-ID locale, dot is thousand separator, comma is decimal
            // But if thousandSeparator is true, we should be careful.
            // A simple way to handle id-ID dots as thousand separators:
            // Remove dots and replace comma with dot for parseFloat
            let cleaned = v;
            if (thousandSeparator) {
                cleaned = v.replace(/\./g, '').replace(/,/g, '.');
            } else {
                cleaned = v.replace(/[^\d.-]/g, '');
            }
            const num = parseFloat(cleaned);
            return isNaN(num) ? undefined : num;
        };

        const formatValue = (v: number | undefined): string => {
            if (v === undefined) return '';
            if (thousandSeparator) {
                return v.toLocaleString('id-ID');
            }
            return String(v);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = e.target.value;
            setDisplayValue(rawValue);

            const numValue = parseValue(rawValue);
            onChange?.(numValue);
        };

        const handleBlur = () => {
            const numValue = parseValue(displayValue);
            if (numValue !== undefined) {
                let finalValue = numValue;
                if (min !== undefined && finalValue < min) finalValue = min;
                if (max !== undefined && finalValue > max) finalValue = max;
                setDisplayValue(formatValue(finalValue));
                onChange?.(finalValue);
            }
        };

        const increment = () => {
            const current = parseValue(displayValue) ?? 0;
            const newValue = Math.min(current + step, max ?? Infinity);
            setDisplayValue(formatValue(newValue));
            onChange?.(newValue);
        };

        const decrement = () => {
            const current = parseValue(displayValue) ?? 0;
            const newValue = Math.max(current - step, min ?? -Infinity);
            setDisplayValue(formatValue(newValue));
            onChange?.(newValue);
        };

        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-muted-foreground">
                        {label}
                        {props.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                )}
                <div className="relative flex">
                    {prefix && (
                        <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-xl text-muted-foreground text-sm">
                            {prefix}
                        </span>
                    )}
                    <input
                        ref={ref}
                        type="text"
                        inputMode="decimal"
                        value={displayValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`
                            flex-1 w-full px-4 py-2.5 bg-background border text-foreground 
                            placeholder-muted-foreground/50 outline-none
                            focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                            ${prefix ? 'rounded-l-none' : 'rounded-l-xl'}
                            ${suffix ? 'rounded-r-none' : 'rounded-r-xl'}
                            ${error ? 'border-destructive focus:ring-destructive/20' : 'border-border'}
                            ${className}
                        `}
                        {...props}
                    />
                    {suffix && (
                        <span className="inline-flex items-center px-3 bg-muted border border-l-0 border-border rounded-r-xl text-muted-foreground text-sm">
                            {suffix}
                        </span>
                    )}
                    {!suffix && (
                        <div className="flex flex-col border-l-0">
                            <button
                                type="button"
                                onClick={increment}
                                className="px-2 h-1/2 bg-muted border border-l-0 border-border rounded-tr-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={decrement}
                                className="px-2 h-1/2 bg-muted border border-l-0 border-t-0 border-border rounded-br-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Minus size={12} />
                            </button>
                        </div>
                    )}
                </div>
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

NumberInput.displayName = 'NumberInput';
