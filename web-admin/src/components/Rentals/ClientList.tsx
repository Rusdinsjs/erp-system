// ClientList Component - Pure Tailwind
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { rentalApi } from '../../api/rental';
import {
    Table, TableHead, TableBody, TableRow, TableTh, TableEmpty,
    Button
} from '../ui';

export function ClientList() {
    const { data: clients, isLoading } = useQuery({
        queryKey: ['rental-clients'],
        queryFn: rentalApi.listClients
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Clients</h2>
                <Button leftIcon={<Plus size={16} />}>
                    Add Client
                </Button>
            </div>

            <div className="relative min-h-[100px]">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableTh>Name</TableTh>
                            <TableTh>Code</TableTh>
                            <TableTh>Email</TableTh>
                            <TableTh>Phone</TableTh>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Array.isArray(clients) && clients.length > 0 ? (
                            clients.map((client) => (
                                <TableRow key={client.id}>
                                    <td className="px-4 py-3 text-slate-200">{client.name}</td>
                                    <td className="px-4 py-3 text-slate-200">{client.code}</td>
                                    <td className="px-4 py-3 text-slate-200">{client.email}</td>
                                    <td className="px-4 py-3 text-slate-200">{client.phone}</td>
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
