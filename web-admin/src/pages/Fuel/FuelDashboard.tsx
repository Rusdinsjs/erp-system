import React, { useState } from 'react';
import { Plus, Fuel, CheckCircle, Clock, History } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { FuelList } from './FuelList';
import { FuelRequestModal } from './FuelRequestModal';
import { fuelApi } from '../../api/fuel';

export default function FuelDashboard() {
    const [activeTab, setActiveTab] = useState('requests');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [stats, setStats] = useState({ requested: 0, approved: 0, completed: 0, rejected: 0 });

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    React.useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fuelApi.getStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        };
        loadStats();
    }, [refreshTrigger]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Fuel className="text-blue-500" />
                        Fuel Management
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage requests, approvals, and fuel usage logs
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsRequestModalOpen(true)}>
                        <Plus size={18} className="mr-2" />
                        New Request
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Pending Requests</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{stats.requested}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Clock className="text-blue-500" size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Approved (Coupons)</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{stats.approved}</h3>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="text-green-500" size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-slate-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Completed Logs</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{stats.completed}</h3>
                        </div>
                        <div className="p-3 bg-slate-500/10 rounded-lg">
                            <History className="text-slate-500" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="p-4 border-b border-slate-700">
                        <TabsList>
                            <TabsTrigger value="requests">My Requests</TabsTrigger>
                            <TabsTrigger value="approvals">
                                Approvals
                            </TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-0">
                        <TabsContent value="requests">
                            <FuelList
                                scope="my_requests"
                                refreshTrigger={refreshTrigger}
                                onActionComplete={handleRefresh}
                            />
                        </TabsContent>
                        <TabsContent value="approvals">
                            <FuelList
                                scope="pending_approvals"
                                refreshTrigger={refreshTrigger}
                                onActionComplete={handleRefresh}
                            />
                        </TabsContent>
                        <TabsContent value="history">
                            <FuelList
                                scope="history"
                                refreshTrigger={refreshTrigger}
                                onActionComplete={handleRefresh}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>

            <FuelRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={handleRefresh}
            />
        </div>
    );
};
