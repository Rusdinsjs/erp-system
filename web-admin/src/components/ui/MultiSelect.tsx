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
                <label className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full min-h-[46px] px-3 py-2 bg-gray-900 border rounded-xl
                        text-white cursor-pointer flex items-center justify-between
                        focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500
                        transition-all duration-200 border-gray-700
                    `}
                >
                    <div className="flex flex-wrap gap-1.5">
                        {value.length === 0 && (
                            <span className="text-gray-500 ml-1">{placeholder}</span>
                        )}
                        {value.map(val => {
                            const option = options.find(o => o.value === val);
                            return (
                                <span
                                    key={val}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-sm border border-blue-500/30"
                                >
                                    {option?.label || val}
                                    <X
                                        size={14}
                                        className="hover:text-white transition-colors cursor-pointer"
                                        onClick={(e) => removeValue(e, val)}
                                    />
                                </span>
                            );
                        })}
                    </div>
                    <ChevronDown
                        size={18}
                        className={`text-gray-500 transition-transform duration-200 ml-2 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
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
                                            ${isSelected ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                                        `}
                                    >
                                        <div className={`
                                            w-4 h-4 rounded border flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600 group-hover:border-gray-500'}
                                        `}>
                                            {isSelected && <Check size={12} className="text-white" />}
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
