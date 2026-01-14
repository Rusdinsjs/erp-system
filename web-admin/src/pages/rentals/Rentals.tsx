// Rentals Page - Pure Tailwind
import { Truck, Clock, Receipt, Users, CheckSquare, Tags } from 'lucide-react';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Card
} from '../../components/ui';
import { RentalList } from '../../components/Rentals/RentalList';
import { TimesheetList } from '../../components/Rentals/TimesheetList';
import { TimesheetReviewer } from '../../components/Rentals/TimesheetReviewer';
import { PriceList } from '../../components/Rentals/PriceList';
import { BillingList } from '../../components/Rentals/BillingList';
import { ClientList } from '../../components/Rentals/ClientList';

export function Rentals() {
    return (
        <div className="h-full flex flex-col space-y-6">
            <h1 className="text-2xl font-bold text-white">Rental Management</h1>

            <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
                <Tabs defaultValue="active" className="h-full flex flex-col">
                    <div className="px-4 pt-4 border-b border-slate-800 shrink-0">
                        <TabsList>
                            <TabsTrigger value="active" icon={<Truck size={16} />}>Active Rentals</TabsTrigger>
                            <TabsTrigger value="timesheets" icon={<Clock size={16} />}>Timesheets</TabsTrigger>
                            <TabsTrigger value="reviewer" icon={<CheckSquare size={16} />}>Reviewer</TabsTrigger>
                            <TabsTrigger value="pricelist" icon={<Tags size={16} />}>Price List</TabsTrigger>
                            <TabsTrigger value="billing" icon={<Receipt size={16} />}>Billing</TabsTrigger>
                            <TabsTrigger value="clients" icon={<Users size={16} />}>Clients</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-slate-900/50">
                        <TabsContent value="active" className="h-full overflow-y-auto p-6">
                            <RentalList />
                        </TabsContent>

                        <TabsContent value="timesheets" className="h-full overflow-y-auto p-6">
                            <TimesheetList />
                        </TabsContent>

                        <TabsContent value="reviewer" className="h-full overflow-y-auto p-6">
                            <TimesheetReviewer />
                        </TabsContent>

                        <TabsContent value="pricelist" className="h-full overflow-y-auto p-6">
                            <PriceList />
                        </TabsContent>

                        <TabsContent value="billing" className="h-full overflow-y-auto p-6">
                            <BillingList />
                        </TabsContent>

                        <TabsContent value="clients" className="h-full overflow-y-auto p-6">
                            <ClientList />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}
