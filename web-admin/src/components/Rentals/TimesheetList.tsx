// TimesheetList Component - Pure Tailwind
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Check, X, Plus } from 'lucide-react';
import { timesheetApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import { CreateTimesheetModal } from './CreateTimesheetModal';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    Select,
    LoadingOverlay,
    ActionIcon,
    StatusBadge,
    Button
} from '../ui';

interface TimesheetListProps {
    rentalId?: string;
}

export function TimesheetList({ rentalId }: TimesheetListProps) {
    const [selectedRentalInternal, setSelectedRentalInternal] = useState<string>('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const activeRentalId = rentalId || selectedRentalInternal;

    // Fetch Active Rentals for Dropdown (only if no prop provided)
    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active'),
        enabled: !rentalId
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.client_name}` })) || [];

    // Fetch Timesheets
    const { data: timesheets, isLoading } = useQuery({
        queryKey: ['timesheets', activeRentalId],
        queryFn: () => activeRentalId ? timesheetApi.listByRental(activeRentalId) : Promise.resolve([]),
        enabled: !!activeRentalId
    });

    return (
        <div className="space-y-4">
            <div className="relative min-h-[100px]">
                <LoadingOverlay visible={isLoading} />

                <div className="flex justify-between items-end mb-6">
                    {!rentalId ? (
                        <div className="max-w-sm w-full">
                            <Select
                                placeholder="Select Rental Asset"
                                options={rentalOptions}
                                value={selectedRentalInternal}
                                onChange={(val) => setSelectedRentalInternal(val)}
                            />
                        </div>
                    ) : <div></div>}

                    {activeRentalId && (
                        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateModalOpen(true)}>
                            Add Entry
                        </Button>
                    )}
                </div>

                {activeRentalId ? (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Date</TableTh>
                                <TableTh>Asset</TableTh>
                                <TableTh>Operating Hours</TableTh>
                                <TableTh>Standby</TableTh>
                                <TableTh>Volume</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh className="text-right">Actions</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {timesheets && timesheets.length > 0 ? (
                                timesheets.map((ts) => (
                                    <TableRow key={ts.id}>
                                        <TableTd>{ts.work_date}</TableTd>
                                        <TableTd>{(ts as any).asset_name || '-'}</TableTd>
                                        <TableTd>{ts.operating_hours}</TableTd>
                                        <TableTd>{ts.standby_hours}</TableTd>
                                        <TableTd>
                                            {ts.production_volume ? (
                                                <span className="font-medium text-emerald-400">
                                                    {ts.production_volume} <span className="text-slate-500 text-xs">{ts.production_unit}</span>
                                                </span>
                                            ) : '-'}
                                        </TableTd>
                                        <TableTd>
                                            <StatusBadge status={ts.status} />
                                        </TableTd>
                                        <TableTd className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ActionIcon title="View Details">
                                                    <Eye size={16} />
                                                </ActionIcon>
                                                {ts.status === 'submitted' && (
                                                    <>
                                                        <ActionIcon variant="success" title="Verify">
                                                            <Check size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon variant="danger" title="Reject">
                                                            <X size={16} />
                                                        </ActionIcon>
                                                    </>
                                                )}
                                                {ts.status === 'verified' && (
                                                    <ActionIcon className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Supervisor Approve">
                                                        <Check size={16} />
                                                    </ActionIcon>
                                                )}
                                            </div>
                                        </TableTd>
                                    </TableRow>
                                ))
                            ) : (
                                !isLoading && <TableEmpty colSpan={6} message="No timesheets found" />
                            )}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-slate-500 py-8">Select a rental to view timesheets</p>
                )}
            </div>

            {activeRentalId && (
                <CreateTimesheetModal
                    isOpen={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    rentalId={activeRentalId}
                />
            )}
        </div>
    );
}
