import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    label?: string;
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select items...'
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const removeValue = (e: React.MouseEvent, valToRemove: string) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== valToRemove));
    };

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-muted-foreground">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full min-h-[46px] px-3 py-2 bg-background border rounded-xl
                        text-foreground cursor-pointer flex items-center justify-between
                        focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary
                        transition-all duration-200 border-border
                    `}
                >
                    <div className="flex flex-wrap gap-1.5">
                        {value.length === 0 && (
                            <span className="text-muted-foreground/50 ml-1">{placeholder}</span>
                        )}
                        {value.map(val => {
                            const option = options.find(o => o.value === val);
                            return (
                                <span
                                    key={val}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm border border-primary/20"
                                >
                                    {option?.label || val}
                                    <X
                                        size={14}
                                        className="hover:text-primary-foreground hover:bg-primary rounded-full transition-all cursor-pointer"
                                        onClick={(e) => removeValue(e, val)}
                                    />
                                </span>
                            );
                        })}
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform duration-200 ml-2 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto global-scrollbar">
                        <div className="p-1 space-y-0.5">
                            {options.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className={`
                                            flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm
                                            transition-colors duration-150
                                            ${isSelected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                                        `}
                                    >
                                        <div className={`
                                            w-4 h-4 rounded border flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-primary border-primary' : 'border-border group-hover:border-muted-foreground'}
                                        `}>
                                            {isSelected && <Check size={12} className="text-primary-foreground" />}
                                        </div>
                                        {option.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
