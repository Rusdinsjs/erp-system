import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User as UserIcon } from 'lucide-react';
import { Button, Modal, Input, LoadingOverlay, Badge } from '../ui';
import { usersApi } from '../../api/users';

interface TechnicianSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (technicianId: string) => void;
    loading?: boolean;
}

export function TechnicianSelectModal({ isOpen, onClose, onSelect, loading }: TechnicianSelectModalProps) {
    const [search, setSearch] = useState('');

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users', 'technicians'],
        queryFn: async () => {
            const res = await usersApi.list(1, 100);
            return res.data; // Assuming standard pagination response structure or direct array
        },
        enabled: isOpen,
    });

    // Client-side filtering for now
    // Ideally backend supports role filtering
    const filteredUsers = (users as any[]).filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());
        // Optional: Filter by role if known, e.g. 'technician' or 'maintenance'
        // For now, show all to be safe, maybe highlight role
        return matchesSearch;
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Assign Technician">
            <div className="space-y-4">
                <Input
                    placeholder="Search technician..."
                    leftIcon={<Search size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <LoadingOverlay visible={isLoading} />

                    {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">
                            No users found.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => onSelect(user.id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors text-left group"
                                    disabled={loading}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-slate-600 group-hover:text-white">
                                            <UserIcon size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{user.name}</p>
                                            <p className="text-xs text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                    {user.role_code && (
                                        <Badge variant="outline" size="sm">
                                            {user.role_code}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
