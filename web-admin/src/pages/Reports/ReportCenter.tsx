import React, { useState } from 'react';
import {
    LayoutDashboard,
    Fuel,
    Wrench,
    Truck,
    FileDown,
    Loader2
} from 'lucide-react';
import { api } from '../../api/http';
import { useToast } from '../../components/ui';
import { reportsApi } from '../../api/reports';
import OverviewTab from './OverviewTab';
import FuelReportsTab from './FuelReportsTab';
import WorkOrderReportsTab from './WorkOrderReportsTab';
import LoanRentalReportsTab from './LoanRentalReportsTab';

const ReportCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [exporting, setExporting] = useState(false);
    const { success, error: showError } = useToast();

    const handleExportPdf = async () => {
        try {
            setExporting(true);
            const data = await reportsApi.exportAssetsPdf();

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'asset_inventory.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            success('Report downloaded successfully');
        } catch (err) {
            console.error(err);
            showError('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'fuel', label: 'Fuel Reports', icon: Fuel },
        { id: 'work_orders', label: 'Work Orders', icon: Wrench },
        { id: 'loans_rentals', label: 'Loans & Rentals', icon: Truck },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Report Center</h1>
                <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                >
                    {exporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                    {exporting ? 'Generating...' : 'Export Inventory (PDF)'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                            ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'}
                        `}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'fuel' && <FuelReportsTab />}
                {activeTab === 'work_orders' && <WorkOrderReportsTab />}
                {activeTab === 'loans_rentals' && <LoanRentalReportsTab />}
            </div>
        </div>
    );
};

export default ReportCenter;
