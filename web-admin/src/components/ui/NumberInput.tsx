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
            const cleaned = v.replace(/[^\d.-]/g, '');
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
                    <label className="block text-sm font-medium text-slate-300">
                        {label}
                        {props.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                )}
                <div className="relative flex">
                    {prefix && (
                        <span className="inline-flex items-center px-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-slate-400 text-sm">
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
                            flex-1 w-full px-4 py-2.5 bg-slate-950/50 border text-white 
                            placeholder-slate-500 outline-none
                            focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                            ${prefix ? 'rounded-l-none' : 'rounded-l-xl'}
                            ${suffix ? 'rounded-r-none' : 'rounded-r-xl'}
                            ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700'}
                            ${className}
                        `}
                        {...props}
                    />
                    {suffix && (
                        <span className="inline-flex items-center px-3 bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl text-slate-400 text-sm">
                            {suffix}
                        </span>
                    )}
                    {!suffix && (
                        <div className="flex flex-col border-l-0">
                            <button
                                type="button"
                                onClick={increment}
                                className="px-2 h-1/2 bg-slate-800 border border-l-0 border-slate-700 rounded-tr-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={decrement}
                                className="px-2 h-1/2 bg-slate-800 border border-l-0 border-t-0 border-slate-700 rounded-br-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <Minus size={12} />
                            </button>
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

NumberInput.displayName = 'NumberInput';
