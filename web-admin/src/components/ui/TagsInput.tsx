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
                <label className="block text-sm font-medium text-muted-foreground">
                    {label}
                </label>
            )}

            <div
                className={`
                    flex flex-wrap items-center gap-2 p-2 min-h-[42px]
                    bg-background border rounded-xl transition-all duration-200
                    focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-background
                    ${error ? 'border-destructive' : 'border-border'}
                `}
                onClick={() => containerRef.current?.querySelector('input')?.focus()}
                ref={containerRef}
            >
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 text-sm bg-muted text-foreground rounded-md border border-border"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
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
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-foreground text-sm placeholder-muted-foreground/50 p-0"
                />
            </div>

            {description && !error && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
