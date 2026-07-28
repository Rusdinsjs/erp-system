// ClientList Component - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { rentalApi } from '../../api/rental';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableEmpty,
    Button, LoadingOverlay
} from '../ui';

export function ClientList() {
    const { data: clients, isLoading } = useQuery({
        queryKey: ['rental-clients'],
        queryFn: rentalApi.listClients
    });

    return (
        <div className="flex flex-col h-full">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-muted/10">
                <h2 className="text-lg font-bold text-foreground">Clients</h2>
                <Button variant="primary" leftIcon={<Plus size={18} />} className="rounded-xl shadow-lg shadow-primary/20">
                    Add Client
                </Button>
            </div>

            <div className="relative flex-1">
                <LoadingOverlay visible={isLoading} />
                <Table className="border-none rounded-none shadow-none">
                    <TableHead>
                        <TableRow className="bg-muted/50 border-border">
                            <TableTh>Name</TableTh>
                            <TableTh>Code</TableTh>
                            <TableTh>Email</TableTh>
                            <TableTh>Phone</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clients && clients.length > 0 ? (
                            clients.map((client: any) => (
                                <TableRow key={client.id} className="hover:bg-muted/30 border-border group transition-all">
                                    <td className="px-4 py-3 text-foreground font-medium">{client.name}</td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">{client.code}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{client.email || '-'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{client.phone || '-'}</td>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && <TableEmpty colSpan={4} message="No clients found" />
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
