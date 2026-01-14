import { useEffect, useState } from 'react';
import { Plus, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type JournalEntry, journalApi } from '../../api/journal';


export function JournalEntries() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const data = await journalApi.list();
            setEntries(data);
        } catch (error) {
            console.error('Failed to load journals', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Journal Entries</h2>
                    <p className="text-slate-400">Manage general ledger transactions</p>
                </div>
                <button
                    onClick={() => navigate('/finance/journals/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    <Plus size={16} />
                    New Journal
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-slate-200 uppercase font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Number</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Loading journals...
                                    </td>
                                </tr>
                            ) : entries.length > 0 ? (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{entry.transaction_number}</td>
                                        <td className="px-6 py-4">
                                            {/* Fallback formatting if date-fns fails or entry.date is weird */}
                                            {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{entry.description}</td>
                                        <td className="px-6 py-4">{entry.reference || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === 'posted'
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-slate-500/10 text-slate-400'
                                                    }`}
                                            >
                                                {entry.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                className="p-1 hover:bg-slate-700/50 rounded-lg text-blue-400 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={32} className="opacity-50" />
                                            <p>No journal entries found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
