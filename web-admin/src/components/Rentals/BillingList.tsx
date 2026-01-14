// BillingList Component - Pure Tailwind
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Eye } from 'lucide-react';
import { billingApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import { BillingReviewDetail } from './BillingReviewDetail';
import {
    Table, TableHead, TableBody, TableRow, TableTh,
    Select,
    Button,
    LoadingOverlay,
    ActionIcon,
    StatusBadge,
    Modal
} from '../ui';

export function BillingList() {
    const [selectedRental, setSelectedRental] = useState<string>('');
    const [viewingBillingId, setViewingBillingId] = useState<string | null>(null);

    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.asset_name}` })) || [];

    const { data: billingPeriods, isLoading } = useQuery({
        queryKey: ['billing', selectedRental],
        queryFn: () => selectedRental ? billingApi.listByRental(selectedRental) : Promise.resolve([]),
        enabled: !!selectedRental
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="w-[300px]">
                    <Select
                        placeholder="Select Rental Asset"
                        options={rentalOptions}
                        value={selectedRental}
                        onChange={(val) => setSelectedRental(val)}
                    />
                </div>
                <Button
                    leftIcon={<Receipt size={16} />}
                    disabled={!selectedRental}
                >
                    Generate New Billing Period
                </Button>
            </div>

            <div className="relative min-h-[100px]">
                <LoadingOverlay visible={isLoading} />

                {selectedRental && (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableTh>Period</TableTh>
                                <TableTh>Total Amount</TableTh>
                                <TableTh>Status</TableTh>
                                <TableTh>Invoice No.</TableTh>
                                <TableTh className="text-right">Action</TableTh>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {billingPeriods?.map((bP) => (
                                <TableRow key={bP.id}>
                                    <td className="px-4 py-3 text-slate-200">{bP.period_start} - {bP.period_end}</td>
                                    <td className="px-4 py-3 text-slate-200">{bP.total_amount?.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-200">
                                        <StatusBadge status={bP.status} />
                                    </td>
                                    <td className="px-4 py-3 text-slate-200">{bP.invoice_number || '-'}</td>
                                    <td className="px-4 py-3 text-slate-200 text-right">
                                        <div className="flex justify-end">
                                            <ActionIcon
                                                title="Verify Details"
                                                onClick={() => setViewingBillingId(bP.id)}
                                            >
                                                <Eye size={16} />
                                            </ActionIcon>
                                        </div>
                                    </td>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Modal for Billing Review */}
            <Modal
                isOpen={!!viewingBillingId}
                onClose={() => setViewingBillingId(null)}
                title="Automated Billing Verification Detail"
                size="lg"
            >
                {viewingBillingId && (
                    <div className="text-slate-300">
                        <BillingReviewDetail
                            billingId={viewingBillingId}
                            onClose={() => setViewingBillingId(null)}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
