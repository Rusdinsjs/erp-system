import React, { useState } from 'react';
import {
    LayoutDashboard,
    Fuel,
    Wrench,
    Truck,
    FileSpreadsheet
} from 'lucide-react';
import OverviewTab from './OverviewTab';
import FuelReportsTab from './FuelReportsTab';
import WorkOrderReportsTab from './WorkOrderReportsTab';
import LoanRentalReportsTab from './LoanRentalReportsTab';

const ReportCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'fuel', label: 'Fuel Reports', icon: Fuel },
        { id: 'work_orders', label: 'Work Orders', icon: Wrench },
        { id: 'loans_rentals', label: 'Loans & Rentals', icon: Truck },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Report Center</h1>

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
