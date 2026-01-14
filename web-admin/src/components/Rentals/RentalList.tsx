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
    ActionIcon
} from '../ui';

export function RentalList() {
    const navigate = useNavigate();
    const { data: rentals, isLoading } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

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
                            <TableTh>Asset</TableTh>
                            <TableTh>Client</TableTh>
                            <TableTh>Period</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh>Rate</TableTh>
                            <TableTh className="text-right">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rentals && rentals.length > 0 ? (
                            rentals.map((rental) => (
                                <TableRow key={rental.id}>
                                    <TableTd>{rental.rental_number}</TableTd>
                                    <TableTd>{rental.asset_name}</TableTd>
                                    <TableTd>{rental.client_name}</TableTd>
                                    <TableTd>
                                        <div className="flex flex-col">
                                            <span className="text-white">{rental.start_date}</span>
                                            <span className="text-xs text-slate-500">{rental.expected_end_date || 'Open'}</span>
                                        </div>
                                    </TableTd>
                                    <TableTd>
                                        <Badge variant="info">{rental.status}</Badge>
                                    </TableTd>
                                    <TableTd>
                                        {rental.daily_rate?.toLocaleString()} / day
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
        </div>
    );
}
