import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';

interface GlobalSearchProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    initialValue?: string;
    className?: string;
    debounceMs?: number;
}

export function GlobalSearch({
    placeholder = "Search assets by name, code, SN, brand...",
    onSearch,
    initialValue = "",
    className = "",
    debounceMs = 300
}: GlobalSearchProps) {
    const [value, setValue] = useState(initialValue);
    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, onSearch, debounceMs]);

    const handleClear = () => {
        setValue("");
        onSearch("");
    };

    return (
        <div className={`relative group ${className}`}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                <Search size={18} />
            </div>
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="pl-10 pr-10 py-2 bg-slate-800/50 border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all rounded-xl w-full"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
