import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLogQuery } from '../api/audit';
import { Search, Filter, History, User, Database, ArrowRight } from 'lucide-react';
import {
    Card,
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Pagination,
    TableSkeleton,
    Badge
} from '../components/ui';
import clsx from 'clsx'; // Assuming clsx is installed or available, otherwise use template literals

// Helper for highlighting JSON diffs
const JsonDiffViewer = ({ data }: { data: any }) => {
    if (!data) return <span className="text-gray-500 italic">No changes recorded</span>;
    return (
        <pre className="text-xs bg-black/40 p-2 rounded border border-white/5 overflow-x-auto max-h-32 text-gray-300">
            {JSON.stringify(data, null, 2)}
        </pre>
    );
};

export function AuditLogs() {
    const [page, setPage] = useState(1);
    const [entityType, setEntityType] = useState<string>('');
    const [actionFilter, setActionFilter] = useState<string>('');

    const query: AuditLogQuery = {
        page,
        per_page: 20,
        entity_type: entityType || undefined,
        action: actionFilter || undefined,
    };

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', page, entityType, actionFilter],
        queryFn: () => auditApi.getLogs(query),
    });

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'UPDATE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <History className="text-blue-500" />
                        System Audit Logs
                    </h1>
                    <p className="text-gray-400 mt-2">Track all system activities and data changes</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-gray-900/50 border-white/5">
                <div className="flex gap-4 items-end">
                    <div className="w-64">
                        <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
                        <div className="relative">
                            <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="e.g. assets, users..."
                                value={entityType}
                                onChange={(e) => setEntityType(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="w-48">
                        <label className="text-xs text-gray-500 mb-1 block">Action</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="relative min-h-[400px]">
                    {isLoading ? (
                        <div className="p-6">
                            <TableSkeleton rows={10} cols={5} />
                        </div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableTh>Timestamp</TableTh>
                                    <TableTh>User</TableTh>
                                    <TableTh>Action</TableTh>
                                    <TableTh>Entity</TableTh>
                                    <TableTh>Changes</TableTh>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data?.data.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-gray-800/50">
                                        <TableTd>
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">
                                                    {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </TableTd>
                                        <TableTd>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-800 rounded-full">
                                                    <User size={14} className="text-gray-400" />
                                                </div>
                                                <span className="text-sm text-gray-300">{log.user_name || 'System'}</span>
                                            </div>
                                        </TableTd>
                                        <TableTd>
                                            <Badge className={getActionColor(log.action)}>
                                                {log.action}
                                            </Badge>
                                        </TableTd>
                                        <TableTd>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-gray-300 font-mono">{log.entity_type}</span>
                                                <span className="text-xs text-gray-500 font-mono">{log.entity_id.slice(0, 8)}...</span>
                                            </div>
                                        </TableTd>
                                        <TableTd className="w-1/3">
                                            <JsonDiffViewer data={log.changes} />
                                        </TableTd>
                                    </TableRow>
                                ))}
                                {(!data?.data || data.data.length === 0) && (
                                    <TableEmpty colSpan={5} message="No audit logs found matching criteria" />
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {data && data.total_pages > 1 && (
                    <div className="p-4 border-t border-white/5 bg-gray-900/30 flex justify-end">
                        <Pagination
                            currentPage={page}
                            totalPages={data.total_pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
