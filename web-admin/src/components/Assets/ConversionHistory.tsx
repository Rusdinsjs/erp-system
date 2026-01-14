// ConversionHistory Component - Pure Tailwind
import React, { useEffect, useState } from 'react';
import { conversionApi, type AssetConversion } from '../../api/conversion';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableEmpty,
    Badge,
    LoadingOverlay,
    useToast,
} from '../ui';

interface ConversionHistoryProps {
    assetId: string;
}

export const ConversionHistory: React.FC<ConversionHistoryProps> = ({ assetId }) => {
    const [loading, setLoading] = useState(false);
    const [conversions, setConversions] = useState<AssetConversion[]>([]);
    const { error: showError } = useToast();

    useEffect(() => {
        fetchHistory();
    }, [assetId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await conversionApi.getAssetConversions(assetId);
            setConversions(data);
        } catch (error) {
            showError('Failed to fetch conversion history', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status: string): 'default' | 'info' | 'success' | 'danger' | 'warning' => {
        switch (status) {
            case 'approved': return 'info';
            case 'executed': return 'success';
            case 'rejected': return 'danger';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    if (conversions.length === 0 && !loading) {
        return <p className="text-slate-400 text-center py-4">No conversion history found.</p>;
    }

    return (
        <div className="relative min-h-[100px]">
            <LoadingOverlay visible={loading} />
            <Table>
                <TableHead>
                    <TableRow>
                        <TableTh>Date</TableTh>
                        <TableTh>Request #</TableTh>
                        <TableTh>Title</TableTh>
                        <TableTh>Status</TableTh>
                        <TableTh>Cost</TableTh>
                        <TableTh>Requested By</TableTh>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {conversions.length > 0 ? conversions.map((item) => (
                        <TableRow key={item.id}>
                            <td className="px-4 py-3 text-slate-200">
                                {new Date(item.created_at || '').toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                                {item.request_number}
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                                {item.title}
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                                <Badge variant={getStatusVariant(item.status)}>
                                    {item.status}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                                {item.conversion_cost > 0
                                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.conversion_cost)
                                    : '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-200">
                                {item.requested_by}
                            </td>
                        </TableRow>
                    )) : (
                        <TableEmpty colSpan={6} message="No conversion history found." />
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
