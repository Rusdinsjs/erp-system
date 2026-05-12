// BillingHistory Component - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Mail } from 'lucide-react';
import { rentalBillingApi } from '../../api/rental-billing';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableTd, TableEmpty,
    LoadingOverlay,
    ActionIcon,
    StatusBadge,
    useToast
} from '../ui';

interface BillingHistoryProps {
    rentalId: string;
}

export function BillingHistory({ rentalId }: BillingHistoryProps) {
    const { success, error: showError } = useToast();
    const { data: billingPeriods, isLoading } = useQuery({
        queryKey: ['rental-billings', rentalId],
        queryFn: () => rentalBillingApi.listByRental(rentalId),
        enabled: !!rentalId
    });

    const handleDownload = async (billingId: string, invoiceNum?: string) => {
        try {
            const blob = await rentalBillingApi.downloadPdf(rentalId, billingId);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${invoiceNum || billingId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            success("Download started");
        } catch (err) {
            console.error(err);
            showError("Failed to download invoice");
        }
    };

    const handleEmail = async (billingId: string) => {
        const email = prompt("Enter email address to send invoice to:", "client@example.com");
        if (!email) return;

        try {
            await rentalBillingApi.emailInvoice(rentalId, billingId, email);
            success("Invoice sent via email");
        } catch (err) {
            console.error(err);
            showError("Failed to send email");
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative min-h-[100px]">
                <LoadingOverlay visible={isLoading} />
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Period</TableTh>
                            <TableTh>Operating Hours</TableTh>
                            <TableTh>Amount</TableTh>
                            <TableTh>Status</TableTh>
                            <TableTh className="text-right">Actions</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {billingPeriods && billingPeriods.length > 0 ? (
                            billingPeriods.map((bp) => (
                                <TableRow key={bp.id}>
                                    <TableTd>
                                        <div className="font-medium text-foreground">{bp.period_start} - {bp.period_end}</div>
                                    </TableTd>
                                    <TableTd>{bp.total_operating_hours || 0} hrs</TableTd>
                                    <TableTd>Rp {(bp.total_amount || 0).toLocaleString()}</TableTd>
                                    <TableTd>
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={bp.status} />
                                            {bp.invoice_number && (
                                                <span className="text-xs text-muted-foreground">Inv: {bp.invoice_number}</span>
                                            )}
                                        </div>
                                    </TableTd>
                                    <TableTd className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ActionIcon title="View Details">
                                                <Eye size={16} />
                                            </ActionIcon>
                                            {(bp.status === 'invoiced' || bp.status === 'paid' || bp.invoice_number) && (
                                                <>
                                                    <ActionIcon
                                                        className="text-primary hover:bg-primary/20"
                                                        title="Download Invoice"
                                                        onClick={() => handleDownload(bp.id, bp.invoice_number)}
                                                    >
                                                        <Download size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        className="text-orange-500 hover:bg-orange-500/10"
                                                        title="Email Invoice"
                                                        onClick={() => handleEmail(bp.id)}
                                                    >
                                                        <Mail size={16} />
                                                    </ActionIcon>
                                                </>
                                            )}
                                        </div>
                                    </TableTd>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && <TableEmpty colSpan={5} message="No billing history found." />
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
