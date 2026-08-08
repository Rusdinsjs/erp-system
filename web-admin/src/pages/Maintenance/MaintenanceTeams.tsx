import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users,
    UserCheck,
    Plus,
    Search,
    Edit2,
    Trash2,
    Shield,
    Wrench,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    X,
    UserPlus,
    Briefcase,
} from 'lucide-react';
import {
    maintenanceTeamApi,
    MaintenanceTeam,
    CreateMaintenanceTeamPayload,
    CreateTeamMemberPayload,
} from '../../api/maintenance-team';

export default function MaintenanceTeams() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<MaintenanceTeam | null>(null);

    // Form State
    const [teamCode, setTeamCode] = useState('');
    const [teamName, setTeamName] = useState('');
    const [managerName, setManagerName] = useState('');
    const [description, setDescription] = useState('');
    const [members, setMembers] = useState<CreateTeamMemberPayload[]>([]);

    // Fetch Teams
    const { data: teamsResponse, isLoading, isError, refetch } = useQuery({
        queryKey: ['maintenance-teams', searchTerm, statusFilter],
        queryFn: () =>
            maintenanceTeamApi.list({
                search: searchTerm || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            }),
    });

    const teams: MaintenanceTeam[] = teamsResponse?.data || [];

    // Create / Update Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: CreateMaintenanceTeamPayload = {
                team_code: teamCode,
                team_name: teamName,
                manager_name: managerName || undefined,
                description: description || undefined,
                members,
            };

            if (editingTeam) {
                return maintenanceTeamApi.update(editingTeam.id, payload);
            } else {
                return maintenanceTeamApi.create(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-teams'] });
            closeModal();
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => maintenanceTeamApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-teams'] });
        },
    });

    const openCreateModal = () => {
        setEditingTeam(null);
        setTeamCode(`MT-${Math.floor(100 + Math.random() * 900)}`);
        setTeamName('');
        setManagerName('');
        setDescription('');
        setMembers([
            { member_name: '', role_in_team: 'Team Lead' },
            { member_name: '', role_in_team: 'Technician' },
        ]);
        setIsModalOpen(true);
    };

    const openEditModal = (team: MaintenanceTeam) => {
        setEditingTeam(team);
        setTeamCode(String(team.team_code || ''));
        setTeamName(team.team_name);
        setManagerName(team.manager_name || '');
        setDescription(team.description || '');
        setMembers(
            team.members?.map((m) => ({
                member_name: m.member_name,
                role_in_team: m.role_in_team,
            })) || []
        );
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTeam(null);
    };

    const handleAddMemberRow = () => {
        setMembers([...members, { member_name: '', role_in_team: 'Technician' }]);
    };

    const handleRemoveMemberRow = (index: number) => {
        setMembers(members.filter((_, i) => i !== index));
    };

    const handleMemberChange = (index: number, field: keyof CreateTeamMemberPayload, value: string) => {
        const updated = [...members];
        updated[index] = { ...updated[index], [field]: value };
        setMembers(updated);
    };

    // Summary Metrics
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.status === 'ACTIVE').length;
    const totalTechnicians = teams.reduce((acc, t) => acc + (t.total_members || t.members?.length || 0), 0);
    const totalManagers = teams.filter((t) => t.manager_name).length;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Tim Pemeliharaan (Maintenance Teams)</h1>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Kelola struktur tim teknisi, spesialis mekanik, dan penanggung jawab maintenance sesuai standar ERPNext.
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    <span>Tambah Tim Baru</span>
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                        <Wrench size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tim</p>
                        <p className="text-2xl font-bold text-white mt-1">{totalTeams}</p>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <UserCheck size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tim Aktif</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{activeTeams}</p>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Teknisi</p>
                        <p className="text-2xl font-bold text-purple-300 mt-1">{totalTechnicians}</p>
                    </div>
                </div>

                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                        <Shield size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Leaders</p>
                        <p className="text-2xl font-bold text-amber-300 mt-1">{totalManagers}</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari kode, nama tim, atau manajer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="all">Semua Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>

                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Teams List */}
            {isLoading ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
                    Memuat data tim pemeliharaan...
                </div>
            ) : isError ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-red-500/20 text-red-400">
                    Gagal memuat data tim pemeliharaan. Silakan coba lagi.
                </div>
            ) : teams.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500">
                    Belum ada tim pemeliharaan ditemukan. Klik "Tambah Tim Baru" untuk membuat.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {teams.map((team) => {
                        const isExpanded = expandedTeamId === team.id;
                        const memberList = team.members || [];

                        return (
                            <div
                                key={team.id}
                                className="bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                            >
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-950 border border-slate-800 text-emerald-400 rounded-xl mt-1 md:mt-0">
                                            <Wrench size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold rounded-md border border-emerald-500/20">
                                                    {team.team_code}
                                                </span>
                                                <h3 className="text-lg font-bold text-white tracking-tight">{team.team_name}</h3>
                                                <span
                                                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                                                        team.status === 'ACTIVE'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                                    }`}
                                                >
                                                    {team.status}
                                                </span>
                                            </div>

                                            {team.description && (
                                                <p className="text-slate-400 text-sm mt-1.5 line-clamp-2">{team.description}</p>
                                            )}

                                            <div className="flex items-center gap-6 mt-3 text-xs text-slate-400 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Shield size={14} className="text-amber-400" />
                                                    <span>Leader: <strong className="text-slate-200">{team.manager_name || 'Belum Ditentukan'}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users size={14} className="text-purple-400" />
                                                    <span>Anggota: <strong className="text-slate-200">{team.total_members || memberList.length} Orang</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button
                                            onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 transition-colors"
                                        >
                                            <span>{isExpanded ? 'Sembunyikan Anggota' : 'Lihat Anggota'}</span>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        <button
                                            onClick={() => openEditModal(team)}
                                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
                                            title="Edit Tim"
                                        >
                                            <Edit2 size={16} />
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (confirm(`Hapus tim ${team.team_name}?`)) {
                                                    deleteMutation.mutate(team.id);
                                                }
                                            }}
                                            className="p-2 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition-colors"
                                            title="Hapus Tim"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Member List */}
                                {isExpanded && (
                                    <div className="bg-slate-950/70 p-5 border-t border-slate-800/80">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                            <Users size={14} className="text-emerald-400" />
                                            Daftar Anggota Tim ({memberList.length})
                                        </h4>

                                        {memberList.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic">Belum ada anggota yang didaftarkan pada tim ini.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {memberList.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {m.member_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-sm font-semibold text-white truncate">{m.member_name}</p>
                                                                <span className="text-[11px] text-emerald-400 font-medium">{m.role_in_team}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Create / Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                    <Briefcase size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-white">
                                    {editingTeam ? 'Edit Tim Pemeliharaan' : 'Tambah Tim Pemeliharaan Baru'}
                                </h2>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveMutation.mutate();
                            }}
                            className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Kode Tim *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={teamCode}
                                        onChange={(e) => setTeamCode(e.target.value)}
                                        placeholder="Contoh: MT-HEAVY-01"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Nama Tim *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        placeholder="Contoh: Tim Maintenance Alat Berat"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Nama Manajer / Team Leader
                                </label>
                                <input
                                    type="text"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Deskripsi / Catatan Tim
                                </label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Tuliskan cakupan tugas & keahlian spesifik tim ini..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            {/* Dynamic Members Section */}
                            <div className="pt-3 border-t border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                        <Users size={14} className="text-emerald-400" />
                                        Anggota Teknisi Tim
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddMemberRow}
                                        className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                                    >
                                        <UserPlus size={14} />
                                        <span>+ Tambah Anggota</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {members.map((m, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nama Anggota (Teknisi)"
                                                value={m.member_name}
                                                onChange={(e) => handleMemberChange(idx, 'member_name', e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Peran (e.g. Lead, Electrician)"
                                                value={m.role_in_team}
                                                onChange={(e) => handleMemberChange(idx, 'role_in_team', e.target.value)}
                                                className="w-44 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMemberRow(idx)}
                                                className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-xl border border-slate-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
                                >
                                    {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Tim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
