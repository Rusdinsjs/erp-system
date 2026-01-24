import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Truck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rentalApi } from '../../api/rental';
import {
    Button,
    Badge,
    ActionIcon,
    Pagination,
    StatusBadge,
    TableSkeleton
} from '../ui';

import { useState } from 'react';

export function RentalList() {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: rentals, isLoading } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    // Client-side pagination logic
    const totalItems = rentals?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedRentals = rentals?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="flex flex-col h-full bg-gray-900/10">
            {/* Contextual Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gray-950/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Truck size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Active Inventory</h4>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Ongoing Rental Operations</p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => navigate('/rentals/new')}
                    className="rounded-xl shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 h-11 px-6 text-[11px] font-black uppercase tracking-widest"
                >
                    New Rental Order
                </Button>
            </div>

            <div className="relative flex-1 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="p-4">
                        <TableSkeleton rows={10} cols={6} />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-gray-300 border-separate border-spacing-0">
                            <thead className="bg-gray-950/80 sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Order Ref</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Client Entity</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Utilization</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Operating Window</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Lifecycle</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedRentals && paginatedRentals.length > 0 ? (
                                    paginatedRentals.map((rental) => (
                                        <tr
                                            key={rental.id}
                                            className="group cursor-pointer hover:bg-white/[0.03] transition-all duration-300"
                                            onClick={() => navigate(`/rentals/${rental.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm text-blue-400 font-bold group-hover:text-blue-300 transition-colors">
                                                        #{rental.rental_number}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 uppercase font-medium">Record ID: {rental.id.slice(0, 8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                        <User size={14} className="text-gray-500" />
                                                    </div>
                                                    <span className="text-gray-200 font-bold tracking-tight group-hover:translate-x-1 transition-transform inline-block">
                                                        {rental.client_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="default" className="bg-gray-800/50 border-white/5 text-gray-400 font-bold text-[10px] space-x-1">
                                                    <span className="text-emerald-400">{rental.items?.length || 0}</span>
                                                    <span className="opacity-50">Assets Deployed</span>
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-gray-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-xs font-bold">{rental.start_date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-gray-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                                                        <span className="text-[10px] font-medium italic">{rental.expected_end_date || 'Ongoing / Indefinite'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={rental.status} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-black/20" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <ActionIcon
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/rentals/${rental.id}`); }}
                                                        variant="default"
                                                        className="w-10 h-10 rounded-xl hover:bg-white/10 hover:text-white transition-all transform group-hover:scale-110"
                                                    >
                                                        <Eye size={18} />
                                                    </ActionIcon>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    !isLoading && (
                                        <tr>
                                            <td colSpan={6} className="py-24 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-gray-600">
                                                    <div className="p-6 bg-white/5 rounded-full">
                                                        <Truck size={48} className="opacity-20" />
                                                    </div>
                                                    <p className="text-sm font-bold uppercase tracking-widest opacity-50">No active rentals found in the system</p>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => navigate('/rentals/new')}
                                                        className="rounded-xl"
                                                    >
                                                        Initialize New Order
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Premium Pagination Controls */}
            {!isLoading && totalItems > 0 && (
                <div className="flex justify-between items-center px-8 py-5 border-t border-white/5 bg-gray-950/40 backdrop-blur-md">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Data Stream: <span className="text-white">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)}</span>
                        <span className="mx-2 opacity-20">/</span>
                        Total Records: <span className="text-blue-400">{totalItems}</span>
                    </p>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
