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
            return res.data;
        },
        enabled: isOpen,
    });

    const filteredUsers = (users as any[]).filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Assign Specialist" size="xl">
            <div className="space-y-6 p-4 relative">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none" />

                <Input
                    placeholder="Search by name or email..."
                    leftIcon={<Search size={16} className="text-slate-400" />}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="bg-black/20 border-white/5"
                />

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden max-h-[400px] flex flex-col shadow-xl">
                    <LoadingOverlay visible={isLoading} />

                    {filteredUsers.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                <Search size={24} className="text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm">No specialized technicians found matching your criteria</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => onSelect(user.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.05] transition-all text-left group"
                                    disabled={loading}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 group-hover:from-cyan-600 group-hover:to-blue-600 group-hover:text-white transition-all shadow-lg border border-white/5">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {user.role_code && (
                                            <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 uppercase text-[10px] tracking-widest font-bold">
                                                {user.role_code}
                                            </Badge>
                                        )}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                            <Search size={16} className="text-cyan-400" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                        className="text-slate-500 hover:bg-white/5 rounded-xl px-6"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
