import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Truck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rentalApi } from '../../api/rental';
import {
    Button,
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
        <div className="flex flex-col h-full bg-background rounded-b-2xl">
            {/* Contextual Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/40 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Truck size={20} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Inventory</h4>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Ongoing Rental Operations</p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={() => navigate('/rentals/new')}
                    className="rounded-xl shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-500 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-white"
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
                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {paginatedRentals && paginatedRentals.length > 0 ? (
                                paginatedRentals.map((rental) => (
                                    <div
                                        key={rental.id}
                                        onClick={() => navigate(`/rentals/${rental.id}`)}
                                        className="group cursor-pointer relative bg-card/40 border border-border hover:border-emerald-500/40 rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden backdrop-blur-xl flex flex-col"
                                    >
                                        {/* Decorative Gradient Blob */}
                                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-colors duration-500 pointer-events-none" />

                                        <div className="relative z-10 flex flex-col h-full">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-4">
                                                <div>
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Order Ref</span>
                                                    <div className="font-mono text-xl font-bold text-foreground group-hover:text-emerald-500 transition-colors uppercase tracking-tight">
                                                        #{rental.rental_number}
                                                    </div>
                                                </div>
                                                <StatusBadge status={rental.status} className="px-3 py-1.5 text-[10px] uppercase font-black tracking-widest shadow-lg shadow-black/5" />
                                            </div>

                                            {/* Body */}
                                            <div className="flex-1 space-y-6">
                                                {/* Client Info */}
                                                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50 group-hover:bg-muted/30 transition-colors">
                                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0">
                                                        <User size={20} className="text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Client Entity</span>
                                                        <span className="text-foreground font-bold tracking-tight inline-block line-clamp-1 group-hover:translate-x-1 transition-transform">
                                                            {rental.client_name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest block mb-1">Utilization</span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-2xl font-black text-emerald-500 tracking-tighter">{rental.items?.length || 0}</span>
                                                            <span className="text-[10px] font-bold text-emerald-500/60 uppercase">Assets</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex flex-col justify-center">
                                                        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-1">Operating Window</span>
                                                        <div className="flex items-center gap-1.5 text-foreground mb-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <span className="text-xs font-bold">{rental.start_date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                                            <span className="text-[10px] font-medium italic line-clamp-1">{rental.expected_end_date || 'Indefinite'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="mt-6 pt-4 border-t border-border/50 flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                <ActionIcon
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/rentals/${rental.id}`); }}
                                                    variant="default"
                                                    className="rounded-xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 w-10 h-10 border border-border shadow-lg shadow-black/5"
                                                >
                                                    <Eye size={16} />
                                                </ActionIcon>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !isLoading && (
                                    <div className="col-span-full py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <div className="p-6 bg-muted/20 rounded-full border border-border/50 shadow-inner">
                                                <Truck size={48} className="opacity-20" />
                                            </div>
                                            <p className="text-sm font-bold uppercase tracking-widest opacity-50 mt-4">No active rentals found in the system</p>
                                            <Button
                                                variant="secondary"
                                                onClick={() => navigate('/rentals/new')}
                                                className="rounded-xl px-8 mt-2 hover:scale-105 transition-transform"
                                            >
                                                Initialize New Order
                                            </Button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Pagination Controls */}
            {!isLoading && totalItems > 0 && (
                <div className="flex justify-between items-center px-8 py-5 border-t border-border bg-card/40 backdrop-blur-md">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Data Stream: <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)}</span>
                        <span className="mx-2 opacity-20">/</span>
                        Total Records: <span className="text-primary">{totalItems}</span>
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
