import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, FileText } from 'lucide-react';
import { rbacApi } from '../../api/rbac';
import type { Role } from '../../types';
import { Button, Card, Select, Badge, useToast, LoadingOverlay } from '../ui';

interface DocType {
    id: string;
    name: string;
    module: string;
    description?: string;
    is_submittable: boolean;
}

interface CustomDocPerm {
    id?: string;
    doctype_id: string;
    role_id: string;
    role_name?: string;
    permlevel: number;
    read_perm: boolean;
    write_perm: boolean;
    create_perm: boolean;
    delete_perm: boolean;
    submit_perm: boolean;
    cancel_perm: boolean;
    amend_perm: boolean;
    print_perm: boolean;
    email_perm: boolean;
    export_perm: boolean;
    import_perm: boolean;
    share_perm: boolean;
    report_perm: boolean;
    if_owner: boolean;
}

export function FrappeRolePermissionManager() {
    const [docTypes, setDocTypes] = useState<DocType[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedDocType, setSelectedDocType] = useState<string>('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [docPerms, setDocPerms] = useState<CustomDocPerm[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { success, error: showError } = useToast();

    useEffect(() => {
        initData();
    }, []);

    useEffect(() => {
        if (selectedDocType) {
            loadDocPerms(selectedDocType);
        }
    }, [selectedDocType]);

    const initData = async () => {
        setLoading(true);
        try {
            const [dtList, roleList] = await Promise.all([
                rbacApi.listDocTypes(),
                rbacApi.listRoles()
            ]);
            setDocTypes(dtList);
            setRoles(roleList);

            if (dtList.length > 0) {
                setSelectedDocType(dtList[0].id);
            }
        } catch (err: any) {
            showError('Gagal memuat daftar DocType dan Role', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const loadDocPerms = async (dtId: string) => {
        setLoading(true);
        try {
            const perms = await rbacApi.getDocPerms(dtId);
            setDocPerms(perms);
        } catch (err: any) {
            showError('Gagal memuat matriks izin DocType', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = () => {
        if (!selectedDocType || !selectedRole) {
            showError('Pilih DocType dan Role terlebih dahulu', 'Peringatan');
            return;
        }

        const roleObj = roles.find((r: Role) => r.id === selectedRole);
        const existing = docPerms.find((p: CustomDocPerm) => p.role_id === selectedRole && p.permlevel === 0);
        if (existing) {
            showError(`Aturan untuk Role ${roleObj?.name || ''} sudah ada`, 'Perhatian');
            return;
        }

        const newRule: CustomDocPerm = {
            doctype_id: selectedDocType,
            role_id: selectedRole,
            role_name: roleObj?.name,
            permlevel: 0,
            read_perm: true,
            write_perm: false,
            create_perm: false,
            delete_perm: false,
            submit_perm: false,
            cancel_perm: false,
            amend_perm: false,
            print_perm: true,
            email_perm: false,
            export_perm: false,
            import_perm: false,
            share_perm: false,
            report_perm: true,
            if_owner: false,
        };

        setDocPerms((prev: CustomDocPerm[]) => [...prev, newRule]);
    };

    const handleToggleCheck = (index: number, field: keyof CustomDocPerm) => {
        setDocPerms((prev: CustomDocPerm[]) => {
            const updated = [...prev];
            const item = { ...updated[index] };
            (item[field] as boolean) = !(item[field] as boolean);
            updated[index] = item;
            return updated;
        });
    };

    const handleSaveRule = async (rule: CustomDocPerm) => {
        setSaving(true);
        try {
            await rbacApi.saveDocPerm(rule);
            success('Aturan izin berhasil disimpan', 'Sukses');
            loadDocPerms(selectedDocType);
        } catch (err: any) {
            showError(err.response?.data?.message || 'Gagal menyimpan aturan', 'Error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id?: string, index?: number) => {
        if (id) {
            setSaving(true);
            try {
                await rbacApi.deleteDocPerm(id);
                success('Aturan izin berhasil dihapus', 'Sukses');
                loadDocPerms(selectedDocType);
            } catch (err: any) {
                showError('Gagal menghapus aturan', 'Error');
            } finally {
                setSaving(false);
            }
        } else if (index !== undefined) {
            setDocPerms((prev: CustomDocPerm[]) => prev.filter((_: any, i: number) => i !== index));
        }
    };

    const activeDocType = docTypes.find((d: DocType) => d.id === selectedDocType);

    return (
        <Card className="p-6 bg-card border-border shadow-xl space-y-6 relative overflow-hidden">
            <LoadingOverlay visible={loading || saving} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            ERPQu Role Permission Manager
                            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                                ERPQu Standard
                            </Badge>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Kelola matriks izin Dokumen, PermLevel (Field-Level), dan Workflow Actions
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        1. Pilih Document Type (DocType)
                    </label>
                    <Select
                        value={selectedDocType}
                        onChange={(val: string) => setSelectedDocType(val)}
                        options={docTypes.map(dt => ({
                            value: dt.id,
                            label: `[${dt.module}] ${dt.name} ${dt.is_submittable ? '(Submittable)' : ''}`
                        }))}
                        className="w-full bg-background"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        2. Pilih Role Tambahan
                    </label>
                    <Select
                        value={selectedRole}
                        onChange={(val: string) => setSelectedRole(val)}
                        options={[
                            { value: '', label: '-- Pilih Role --' },
                            ...roles.map(r => ({
                                value: r.id,
                                label: `${r.name} (Level ${r.role_level ?? '-'})`
                            }))
                        ]}
                        className="w-full bg-background"
                    />
                </div>

                <div className="flex items-end">
                    <Button
                        variant="primary"
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                        leftIcon={<Plus size={16} />}
                        onClick={handleAddRule}
                        disabled={!selectedRole}
                    >
                        Tambah Aturan Role
                    </Button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <FileText size={18} className="text-cyan-400" />
                        Matriks Izin Matched: <span className="text-cyan-400 font-mono">{activeDocType?.name}</span>
                    </h3>
                </div>

                <div className="overflow-x-auto border border-border rounded-2xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border">
                            <tr>
                                <th className="p-3">Role</th>
                                <th className="p-3 text-center">PermLevel</th>
                                <th className="p-3 text-center">Read</th>
                                <th className="p-3 text-center">Write</th>
                                <th className="p-3 text-center">Create</th>
                                <th className="p-3 text-center">Delete</th>
                                {activeDocType?.is_submittable && (
                                    <>
                                        <th className="p-3 text-center bg-blue-500/10 text-blue-400">Submit</th>
                                        <th className="p-3 text-center bg-blue-500/10 text-blue-400">Cancel</th>
                                        <th className="p-3 text-center bg-blue-500/10 text-blue-400">Amend</th>
                                    </>
                                )}
                                <th className="p-3 text-center">Print</th>
                                <th className="p-3 text-center">Export</th>
                                <th className="p-3 text-center">Report</th>
                                <th className="p-3 text-center">If Owner</th>
                                <th className="p-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {docPerms.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="p-8 text-center text-muted-foreground">
                                        Belum ada aturan izin kustom untuk DocType ini. Klik "Tambah Aturan Role" untuk menambahkan.
                                    </td>
                                </tr>
                            ) : (
                                docPerms.map((perm: CustomDocPerm, idx: number) => (
                                    <tr key={perm.id || idx} className="hover:bg-muted/20 transition-colors">
                                        <td className="p-3 font-semibold text-foreground">
                                            {perm.role_name || roles.find((r: Role) => r.id === perm.role_id)?.name || 'Role'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                Lvl {perm.permlevel}
                                            </Badge>
                                        </td>
                                        
                                        {/* Standard Checkboxes */}
                                        {(['read_perm', 'write_perm', 'create_perm', 'delete_perm'] as (keyof CustomDocPerm)[]).map(field => (
                                            <td key={field} className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(perm[field])}
                                                    onChange={() => handleToggleCheck(idx, field)}
                                                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900 cursor-pointer"
                                                />
                                            </td>
                                        ))}

                                        {/* Submittable Workflow Checkboxes */}
                                        {activeDocType?.is_submittable && (
                                            (['submit_perm', 'cancel_perm', 'amend_perm'] as (keyof CustomDocPerm)[]).map(field => (
                                                <td key={field} className="p-3 text-center bg-blue-500/5">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(perm[field])}
                                                        onChange={() => handleToggleCheck(idx, field)}
                                                        className="w-4 h-4 rounded border-blue-700 text-blue-500 focus:ring-blue-400 focus:ring-offset-slate-900 cursor-pointer"
                                                    />
                                                </td>
                                            ))
                                        )}

                                        {/* Additional Checkboxes */}
                                        {(['print_perm', 'export_perm', 'report_perm', 'if_owner'] as (keyof CustomDocPerm)[]).map(field => (
                                            <td key={field} className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(perm[field])}
                                                    onChange={() => handleToggleCheck(idx, field)}
                                                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-900 cursor-pointer"
                                                />
                                            </td>
                                        ))}

                                        {/* Actions */}
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="p-1.5 h-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border-cyan-500/30"
                                                    onClick={() => handleSaveRule(perm)}
                                                    title="Simpan Aturan Ini"
                                                >
                                                    <Save size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="p-1.5 h-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
                                                    onClick={() => handleDeleteRule(perm.id, idx)}
                                                    title="Hapus Aturan"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
}
