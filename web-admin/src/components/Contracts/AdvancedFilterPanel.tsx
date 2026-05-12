import React from 'react';
import { Search, Filter, X, ChevronDown, Calendar, Users, DollarSign, TrendingUp, Save, Bookmark } from 'lucide-react';

export interface FilterOptions {
    search: string;
    status: string[];
    paymentTerms: string[];
    dateRange: {
        start: string;
        end: string;
    };
    valueRange: {
        min: string;
        max: string;
    };
    performanceMetrics: {
        ma: string;
        pa: string;
        ua: string;
        eu: string;
    };
}

interface AdvancedFilterPanelProps {
    filters: FilterOptions;
    setFilters: (filters: FilterOptions) => void;
    onReset: () => void;
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
    filters,
    setFilters,
    onReset,
}) => {
    const statuses = ['draft', 'pending_approval', 'active', 'expiring', 'expired'];

    const toggleStatus = (status: string) => {
        const newStatus = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        setFilters({ ...filters, status: newStatus });
    };

    // Save/Load presets from localStorage
    const savePreset = () => {
        const presetName = prompt('Enter preset name:');
        if (!presetName) return;

        const presets = JSON.parse(localStorage.getItem('contractFilterPresets') || '{}');
        presets[presetName] = filters;
        localStorage.setItem('contractFilterPresets', JSON.stringify(presets));
        alert(`Preset "${presetName}" saved!`);
    };

    const loadPreset = () => {
        const presets = JSON.parse(localStorage.getItem('contractFilterPresets') || '{}');
        const presetNames = Object.keys(presets);

        if (presetNames.length === 0) {
            alert('No saved presets found');
            return;
        }

        const presetName = prompt(`Available presets:\n${presetNames.join('\n')}\n\nEnter preset name to load:`);
        if (!presetName || !presets[presetName]) return;

        setFilters(presets[presetName]);
    };

    return (
        <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm mb-8 animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Filter size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Advanced Search & Filtering</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={savePreset}
                        className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors flex items-center gap-1.5"
                        title="Save current filters as preset"
                    >
                        <Save size={14} />
                        Save Preset
                    </button>
                    <button
                        onClick={loadPreset}
                        className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5"
                        title="Load saved preset"
                    >
                        <Bookmark size={14} />
                        Load Preset
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-2" />
                    <button
                        onClick={onReset}
                        className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Reset all filters
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                {/* Search Term */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Search size={14} />
                        Search Contract or Client
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Enter contract # or client name..."
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters({ ...filters, search: '' })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Multi-select */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <ChevronDown size={14} />
                        Contract Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {statuses.map(s => (
                            <button
                                key={s}
                                onClick={() => toggleStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 border
                                    ${filters.status.includes(s)
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-gray-900/50 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                                    }`}
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Calendar size={14} />
                        Contract Period
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <input
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) => setFilters({
                                    ...filters,
                                    dateRange: { ...filters.dateRange, start: e.target.value }
                                })}
                                className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transitions-all [color-scheme:dark]"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) => setFilters({
                                    ...filters,
                                    dateRange: { ...filters.dateRange, end: e.target.value }
                                })}
                                className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transitions-all [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Second Row - Value Range & Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Value Range */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <DollarSign size={14} />
                        Contract Value Range (Rp Millions)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            value={filters.valueRange.min}
                            onChange={(e) => setFilters({
                                ...filters,
                                valueRange: { ...filters.valueRange, min: e.target.value }
                            })}
                            placeholder="Min"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <input
                            type="number"
                            value={filters.valueRange.max}
                            onChange={(e) => setFilters({
                                ...filters,
                                valueRange: { ...filters.valueRange, max: e.target.value }
                            })}
                            placeholder="Max"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <TrendingUp size={14} />
                        Min Performance Threshold (%)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        <input
                            type="number"
                            value={filters.performanceMetrics.ma}
                            onChange={(e) => setFilters({
                                ...filters,
                                performanceMetrics: { ...filters.performanceMetrics, ma: e.target.value }
                            })}
                            placeholder="MA"
                            min="0"
                            max="100"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-2 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <input
                            type="number"
                            value={filters.performanceMetrics.pa}
                            onChange={(e) => setFilters({
                                ...filters,
                                performanceMetrics: { ...filters.performanceMetrics, pa: e.target.value }
                            })}
                            placeholder="PA"
                            min="0"
                            max="100"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-2 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <input
                            type="number"
                            value={filters.performanceMetrics.ua}
                            onChange={(e) => setFilters({
                                ...filters,
                                performanceMetrics: { ...filters.performanceMetrics, ua: e.target.value }
                            })}
                            placeholder="UA"
                            min="0"
                            max="100"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-2 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <input
                            type="number"
                            value={filters.performanceMetrics.eu}
                            onChange={(e) => setFilters({
                                ...filters,
                                performanceMetrics: { ...filters.performanceMetrics, eu: e.target.value }
                            })}
                            placeholder="EU"
                            min="0"
                            max="100"
                            className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-2 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Sub-Filters / Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-500" />
                        <span className="text-xs text-gray-500">Quick Filters:</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setFilters({ ...filters, status: ['pending_approval'] })}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Action Required
                        </button>
                        <button
                            onClick={() => setFilters({ ...filters, status: ['expiring'] })}
                            className="text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1.5"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            Expiring Soon
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Active Filters:</span>
                    <div className="flex gap-2">
                        {filters.status.length > 0 && (
                            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                {filters.status.length} Statuses
                            </span>
                        )}
                        {(filters.dateRange.start || filters.dateRange.end) && (
                            <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                Custom Period
                            </span>
                        )}
                        {(filters.valueRange.min || filters.valueRange.max) && (
                            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                Value Range
                            </span>
                        )}
                        {(filters.performanceMetrics.ma || filters.performanceMetrics.pa || filters.performanceMetrics.ua || filters.performanceMetrics.eu) && (
                            <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                Performance
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedFilterPanel;
