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
import { RentalScheduler } from '../../components/Rentals/RentalScheduler';

export default function Rentals() {
    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="relative">
                {/* Decorative background element */}
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-foreground tracking-tight uppercase">
                        Rental <span className="text-primary">Management</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2 font-medium">
                        <span className="w-8 h-[1px] bg-primary/50"></span>
                        Orchestrate assets, schedules, and revenue streams
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="overflow-hidden border border-border rounded-2xl bg-card/60 backdrop-blur-xl p-0 shadow-2xl">
                <Tabs defaultValue="active" className="flex flex-col">
                    <div className="px-6 py-2 border-b border-border bg-background/20 backdrop-blur-md sticky top-0 z-50">
                        <TabsList className="bg-transparent gap-2 h-14">
                            {[
                                { value: 'active', label: 'Active Rentals', icon: <Truck size={16} /> },
                                { value: 'scheduler', label: 'Scheduler', icon: <Clock size={16} /> },
                                { value: 'timesheets', label: 'Timesheets', icon: <Tags size={16} /> },
                                { value: 'reviewer', label: 'Reviewer', icon: <CheckSquare size={16} /> },
                                { value: 'pricelist', label: 'Price List', icon: <Tags size={16} /> },
                                { value: 'billing', label: 'Billing', icon: <Receipt size={16} /> },
                                { value: 'clients', label: 'Clients', icon: <Users size={16} /> },
                            ].map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    icon={tab.icon}
                                    className="px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-300 font-bold uppercase tracking-widest text-[10px]"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 min-h-[600px]">
                        <TabsContent value="active" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <RentalList />
                        </TabsContent>

                        <TabsContent value="scheduler" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <RentalScheduler />
                        </TabsContent>

                        <TabsContent value="timesheets" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <TimesheetList />
                        </TabsContent>

                        <TabsContent value="reviewer" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <TimesheetReviewer />
                        </TabsContent>

                        <TabsContent value="pricelist" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <PriceList />
                        </TabsContent>

                        <TabsContent value="billing" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <BillingList />
                        </TabsContent>

                        <TabsContent value="clients" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <ClientList />
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}
