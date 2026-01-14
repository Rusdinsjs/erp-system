// Reports Page - Pure Tailwind
import React, { useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { reportsApi } from '../api/reports';
import {
    Button,
    Card,
    DateInput,
    useToast,
} from '../components/ui';

const Reports: React.FC = () => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);
    const { success, error: showError } = useToast();

    const downloadFile = (data: Blob, filename: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    const handleExportAssets = async () => {
        try {
            setLoadingAssets(true);
            const data = await reportsApi.exportAssets();
            downloadFile(data, `asset_inventory_${new Date().toISOString().split('T')[0]}.csv`);
            success('Asset inventory exported successfully', 'Success');
        } catch (error) {
            showError('Failed to export asset inventory', 'Error');
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleExportMaintenance = async () => {
        if (!startDate || !endDate) {
            showError('Please select both start and end dates', 'Error');
            return;
        }

        try {
            setLoadingMaintenance(true);
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];
            const data = await reportsApi.exportMaintenance(start, end);
            downloadFile(data, `maintenance_logs_${start}_to_${end}.csv`);
            success('Maintenance logs exported successfully', 'Success');
        } catch (error) {
            showError('Failed to export maintenance logs', 'Error');
        } finally {
            setLoadingMaintenance(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Reports & Exports</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Asset Inventory Card */}
                <Card padding="lg">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Asset Inventory</h3>
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <FileSpreadsheet size={24} className="text-slate-400" />
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">
                        Export the full list of assets including their current status, location, and financial details.
                    </p>

                    <Button
                        variant="primary"
                        leftIcon={<Download size={14} />}
                        onClick={handleExportAssets}
                        loading={loadingAssets}
                        className="w-full"
                    >
                        Export CSV
                    </Button>
                </Card>

                {/* Maintenance Logs Card */}
                <Card padding="lg">
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Maintenance Logs</h3>
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <FileSpreadsheet size={24} className="text-slate-400" />
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-6">
                        Export maintenance history within a specific date range.
                    </p>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <DateInput
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Start Date"
                            />
                            <DateInput
                                label="End Date"
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="End Date"
                            />
                        </div>

                        <Button
                            variant="primary"
                            leftIcon={<Download size={14} />}
                            onClick={handleExportMaintenance}
                            loading={loadingMaintenance}
                            disabled={!startDate || !endDate}
                            className="w-full"
                        >
                            Export CSV
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
