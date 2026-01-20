// RentalList Component - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rentalApi } from '../../api/rental';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Button,
    Badge,
    LoadingOverlay,
    ActionIcon,
    Pagination
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Active Rentals</h2>
                <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/rentals/new')}>
                    New Rental
                </Button>
            </div>

            <div className="relative min-h-[100px]">
                <LoadingOverlay visible={isLoading} />

                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Rental No.</TableTh>
                            <TableTh>Client</TableTh>
                            <TableTh>Assets</TableTh>
                            <TableTh>Period</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedRentals && paginatedRentals.length > 0 ? (
                            paginatedRentals.map((rental) => (
                                <TableRow key={rental.id}>
                                    <TableTd>{rental.rental_number}</TableTd>
                                    <TableTd>{rental.client_name}</TableTd>
                                    <TableTd>
                                        <div className="text-sm">
                                            {rental.items?.length || 0} Item(s)
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        <div className="flex flex-col">
                                            <span className="text-white">{rental.start_date}</span>
                                            <span className="text-xs text-slate-500">{rental.expected_end_date || 'Open'}</span>
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant="info">{rental.status}</Badge>
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <ActionIcon
                                            onClick={() => navigate(`/rentals/${rental.id}`)}
                                        >
                                            <Eye size={16} />
                                        </ActionIcon>
                                    </TableTd>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && <TableEmpty colSpan={7} message="No active rentals found" />
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Pagination Controls */}
            {!isLoading && totalItems > 0 && (
                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <p className="text-sm text-slate-500">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
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
