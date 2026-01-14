// TagsInput Component - Pure Tailwind
import { useState, type KeyboardEvent, useRef } from 'react';
import { X } from 'lucide-react';

interface TagsInputProps {
    label?: string;
    value?: string[];
    onChange?: (tags: string[]) => void;
    placeholder?: string;
    description?: string;
    error?: string;
    className?: string;
}

export function TagsInput({
    label,
    value = [],
    onChange,
    placeholder = 'Type and press Enter...',
    description,
    error,
    className = '',
}: TagsInputProps) {
    const [inputValue, setInputValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !value.includes(trimmed)) {
                onChange?.([...value, trimmed]);
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            onChange?.(value.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange?.(value.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}

            <div
                className={`
                    flex flex-wrap items-center gap-2 p-2 min-h-[42px]
                    bg-slate-950/50 border rounded-xl transition-all duration-200
                    focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500 focus-within:bg-slate-950
                    ${error ? 'border-red-500' : 'border-slate-700'}
                `}
                onClick={() => containerRef.current?.querySelector('input')?.focus()}
                ref={containerRef}
            >
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 text-sm bg-slate-800 text-slate-200 rounded-md border border-slate-700"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white text-sm placeholder-slate-500 p-0"
                />
            </div>

            {description && !error && (
                <p className="text-xs text-slate-500">{description}</p>
            )}
            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}
        </div>
    );
}
