// SearchInput Component - Pure Tailwind
import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, placeholder = 'Search...', className = '', onClear }, ref) => {
        const handleClear = () => {
            onChange('');
            onClear?.();
        };

        return (
            <div className={`relative ${className}`}>
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                    ref={ref}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="
                        w-full pl-10 pr-10 py-2.5 bg-slate-950/50 border border-slate-700 rounded-xl
                        text-white placeholder-slate-500
                        focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-950
                        transition-all duration-200 outline-none
                    "
                />
                {value && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        );
    }
);

SearchInput.displayName = 'SearchInput';
