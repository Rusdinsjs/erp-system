import React, { useState, useEffect } from 'react';
import { 
    Building2, Plus, Search, Filter, Globe, Phone, Mail, MapPin, 
    ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Edit, Trash2, 
    Layers, GitFork, RefreshCw, X, Shield, ExternalLink, FileText, FileCheck, ScrollText
} from 'lucide-react';
import { 
    fetchCompanies, fetchCompanyTree, fetchCompanyById, createCompany, updateCompany, deleteCompany
} from '../../api/companyApi';
import type { 
    Company, CompanyTreeNode, CompanyPayload, CompanyAmendmentDeed 
} from '../../api/companyApi';
import { showToast } from '../../components/ui/Toast';
import { settingsApi } from '../../api/settings';
import { getImageUrl } from '../../utils/image';

export const CompanyManagement: React.FC = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [treeData, setTreeData] = useState<CompanyTreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'legal' | 'contact' | 'finance'>('general');
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    // Form state
    const [formData, setFormData] = useState<CompanyPayload>({
        code: '',
        name: '',
        legal_name: '',
        tax_id: '',
        base_currency: 'IDR',
        country: 'Indonesia',
        address: '',
        phone: '',
        email: '',
        website: '',
        domain: '',
        registration_no: '',
        logo_url: '',
        parent_company_id: '',
        establishment_deed_no: '',
        establishment_deed_date: '',
        establishment_notary_name: '',
        establishment_approval_no: '',
        amendment_deeds: [],
        fiscal_year_start_month: 1,
        is_group: false,
        status: 'ACTIVE',
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [companiesRes, treeRes] = await Promise.all([
                fetchCompanies({ search, status: statusFilter === 'ALL' ? undefined : statusFilter }),
                fetchCompanyTree()
            ]);
            setCompanies(companiesRes.data || []);
            setTreeData(treeRes.data || []);
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Gagal memuat data perusahaan', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [search, statusFilter]);

    const handleOpenCreateModal = () => {
        setEditingCompany(null);
        setFormData({
            code: '',
            name: '',
            legal_name: '',
            tax_id: '',
            base_currency: 'IDR',
            country: 'Indonesia',
            address: '',
            phone: '',
            email: '',
            website: '',
            domain: '',
            registration_no: '',
            logo_url: '',
            parent_company_id: '',
            establishment_deed_no: '',
            establishment_deed_date: '',
            establishment_notary_name: '',
            establishment_approval_no: '',
            amendment_deeds: [],
            fiscal_year_start_month: 1,
            is_group: false,
            status: 'ACTIVE',
        });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (comp: Company) => {
        setEditingCompany(comp);
        let detailedComp = comp;
        try {
            const res = await fetchCompanyById(comp.id);
            if (res?.data) {
                detailedComp = res.data;
            }
        } catch (e) {
            console.error('Failed to fetch detailed company', e);
        }

        setFormData({
            code: detailedComp.code,
            name: detailedComp.name,
            legal_name: detailedComp.legal_name || '',
            tax_id: detailedComp.tax_id || '',
            base_currency: detailedComp.base_currency || 'IDR',
            country: detailedComp.country || 'Indonesia',
            address: detailedComp.address || '',
            phone: detailedComp.phone || '',
            email: detailedComp.email || '',
            website: detailedComp.website || '',
            domain: detailedComp.domain || '',
            registration_no: detailedComp.registration_no || '',
            logo_url: detailedComp.logo_url || '',
            parent_company_id: detailedComp.parent_company_id || '',
            establishment_deed_no: detailedComp.establishment_deed_no || '',
            establishment_deed_date: detailedComp.establishment_deed_date || '',
            establishment_notary_name: detailedComp.establishment_notary_name || '',
            establishment_approval_no: detailedComp.establishment_approval_no || '',
            amendment_deeds: detailedComp.amendment_deeds || [],
            fiscal_year_start_month: detailedComp.fiscal_year_start_month || 1,
            is_group: detailedComp.is_group,
            status: detailedComp.status,
        });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleAddAmendmentDeed = () => {
        const deeds = formData.amendment_deeds || [];
        setFormData({
            ...formData,
            amendment_deeds: [
                ...deeds,
                {
                    deed_no: '',
                    deed_date: '',
                    notary_name: '',
                    approval_no: '',
                    description: '',
                }
            ]
        });
    };

    const handleRemoveAmendmentDeed = (index: number) => {
        const deeds = [...(formData.amendment_deeds || [])];
        deeds.splice(index, 1);
        setFormData({ ...formData, amendment_deeds: deeds });
    };

    const handleUpdateAmendmentDeed = (index: number, field: keyof CompanyAmendmentDeed, value: string) => {
        const deeds = [...(formData.amendment_deeds || [])];
        deeds[index] = { ...deeds[index], [field]: value };
        setFormData({ ...formData, amendment_deeds: deeds });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.name.trim()) {
            showToast('Kode Singkatan dan Nama Perusahaan wajib diisi', 'error');
            return;
        }

        const cleanStr = (val?: string | null) => (val && val.trim() !== '' ? val.trim() : undefined);

        const payload: CompanyPayload = {
            code: formData.code.trim(),
            name: formData.name.trim(),
            legal_name: cleanStr(formData.legal_name),
            tax_id: cleanStr(formData.tax_id),
            base_currency: formData.base_currency || 'IDR',
            country: formData.country || 'Indonesia',
            address: cleanStr(formData.address),
            phone: cleanStr(formData.phone),
            email: cleanStr(formData.email),
            website: cleanStr(formData.website),
            domain: cleanStr(formData.domain),
            registration_no: cleanStr(formData.registration_no),
            logo_url: cleanStr(formData.logo_url),
            parent_company_id: cleanStr(formData.parent_company_id),
            incorporation_date: cleanStr(formData.incorporation_date),
            establishment_deed_no: cleanStr(formData.establishment_deed_no),
            establishment_deed_date: cleanStr(formData.establishment_deed_date),
            establishment_notary_name: cleanStr(formData.establishment_notary_name),
            establishment_approval_no: cleanStr(formData.establishment_approval_no),
            fiscal_year_start_month: formData.fiscal_year_start_month || 1,
            is_group: formData.is_group,
            status: formData.status || 'ACTIVE',
            amendment_deeds: (formData.amendment_deeds || [])
                .filter(d => d.deed_no && d.deed_no.trim() !== '')
                .map(d => ({
                    id: d.id,
                    deed_no: d.deed_no.trim(),
                    deed_date: cleanStr(d.deed_date),
                    notary_name: cleanStr(d.notary_name),
                    approval_no: cleanStr(d.approval_no),
                    description: cleanStr(d.description),
                })),
        };

        try {
            if (editingCompany) {
                await updateCompany(editingCompany.id, payload);
                showToast('Perusahaan & Data Akta berhasil diperbarui!', 'success');
            } else {
                await createCompany(payload);
                showToast('Perusahaan baru berhasil ditambahkan!', 'success');
            }
            setIsModalOpen(false);
            loadData();
        } catch (err: any) {
            console.error('Save company error:', err);
            const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Gagal menyimpan perusahaan';
            showToast(errMsg, 'error');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus perusahaan "${name}"?`)) return;
        try {
            await deleteCompany(id);
            showToast('Perusahaan berhasil dihapus', 'success');
            loadData();
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Gagal menghapus perusahaan', 'error');
        }
    };

    const totalCompanies = companies.length;
    const groupCompanies = companies.filter(c => c.is_group).length;
    const operatingCompanies = totalCompanies - groupCompanies;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Management</h1>
                            <p className="text-sm text-slate-500">
                                ERPNext & Frappe Framework Multi-Company Setup, Akta Legalitas & Hierarki Organisasi
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData()}
                        className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Perusahaan
                    </button>
                </div>
            </div>

            {/* Stats Dashboard Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Entitas</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCompanies}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Perusahaan Terdaftar</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Holding Company</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{groupCompanies}</h3>
                        <p className="text-xs text-purple-600 font-medium mt-0.5">Grup Induk (Parent)</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <GitFork className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anak Perusahaan</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{operatingCompanies}</h3>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Entitas Operasional</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legalitas Perusahaan</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">Akta Resmik</h3>
                        <p className="text-xs text-amber-600 font-medium mt-0.5">Pendirian & Perubahan</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <ScrollText className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter & View Switcher Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, kode, atau NPWP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Nonaktif</option>
                    </select>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'grid' 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Grid / Daftar
                    </button>
                    <button
                        onClick={() => setViewMode('tree')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            viewMode === 'tree' 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <GitFork className="w-3.5 h-3.5" />
                        Frappe Tree Hierarchy
                    </button>
                </div>
            </div>

            {/* Content Views */}
            {loading ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                    <p className="text-sm font-medium text-slate-600">Memuat data perusahaan & akta legalitas...</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {companies.map((comp) => (
                        <div 
                            key={comp.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden group"
                        >
                            {/* Decorative Accent Header Bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${comp.is_group ? 'bg-gradient-to-r from-purple-500 to-indigo-600' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`} />

                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        {comp.logo_url ? (
                                            <img
                                                src={getImageUrl(comp.logo_url)}
                                                alt={comp.name}
                                                className="w-11 h-11 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                                            />
                                        ) : (
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm tracking-wider shrink-0 ${
                                                comp.is_group 
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            }`}>
                                                {comp.code}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-slate-900 line-clamp-1">{comp.name}</h4>
                                            <p className="text-xs text-slate-500">{comp.legal_name || comp.code}</p>
                                        </div>
                                    </div>

                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        comp.status === 'ACTIVE' 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${comp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {comp.status}
                                    </span>
                                </div>

                                {comp.is_group && (
                                    <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
                                        <GitFork className="w-3.5 h-3.5" />
                                        Grup Induk (Holding)
                                    </div>
                                )}

                                {comp.parent_company_name && (
                                    <div className="mb-3 text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="font-medium text-slate-700">Induk:</span>
                                        <span className="text-slate-900 font-semibold">{comp.parent_company_name}</span>
                                    </div>
                                )}

                                <div className="space-y-2 text-xs text-slate-600 my-3 pt-2 border-t border-slate-100">
                                    {comp.establishment_deed_no && (
                                        <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                                <ScrollText className="w-3.5 h-3.5 text-amber-600" />
                                                <span>Akta Pendirian: {comp.establishment_deed_no}</span>
                                            </div>
                                            {comp.establishment_notary_name && (
                                                <p className="text-[11px] text-amber-800">
                                                    Notaris: {comp.establishment_notary_name}
                                                </p>
                                            )}
                                            {comp.establishment_approval_no && (
                                                <p className="text-[10px] text-amber-700 truncate">
                                                    SK Kemenkumham: {comp.establishment_approval_no}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {comp.tax_id && (
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-slate-400">NPWP / Tax ID:</span>
                                            <span className="font-medium text-slate-800">{comp.tax_id}</span>
                                        </div>
                                    )}
                                    {comp.domain && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Sektor / Industri:</span>
                                            <span className="font-medium text-slate-800">{comp.domain}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Mata Uang:</span>
                                        <span className="font-semibold text-indigo-600">{comp.base_currency}</span>
                                    </div>
                                    {comp.email && (
                                        <div className="flex items-center gap-2 text-slate-600 pt-1">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate">{comp.email}</span>
                                        </div>
                                    )}
                                    {comp.phone && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{comp.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => handleOpenEditModal(comp)}
                                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Perusahaan & Akta"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(comp.id, comp.name)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Hapus Perusahaan"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Frappe Hierarchy Tree View */
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <GitFork className="w-5 h-5 text-indigo-600" />
                            Struktur Pohon Perusahaan (Frappe Tree Structure)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Visualisasi hierarki entitas dari Holding Company hingga ke Anak Perusahaan Operasional.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {treeData.map((node) => (
                            <TreeNodeCard key={node.id} node={node} onEdit={handleOpenEditModal} />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Dialog Form - Frappe Company DocType */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-indigo-400" />
                                <div>
                                    <h3 className="font-bold text-base">
                                        {editingCompany ? 'Edit Perusahaan & Legalitas Akta' : 'Tambah Perusahaan Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-400">Kelola Profil, Akta Pendirian, & Multiple Akta Perubahan</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                                    activeTab === 'general'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                🏢 Profil Utama
                            </button>
                            <button
                                onClick={() => setActiveTab('legal')}
                                className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                                    activeTab === 'legal'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                📜 Akta & Legalitas
                            </button>
                            <button
                                onClick={() => setActiveTab('contact')}
                                className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                                    activeTab === 'contact'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                📍 Alamat & Kontak
                            </button>
                            <button
                                onClick={() => setActiveTab('finance')}
                                className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                                    activeTab === 'finance'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                💳 Keuangan
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    {/* Logo Perusahaan */}
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                        <label className="block text-xs font-semibold text-slate-700">Logo Perusahaan</label>
                                        <div className="flex items-center gap-4">
                                            {formData.logo_url ? (
                                                <div className="relative group shrink-0">
                                                    <img
                                                        src={getImageUrl(formData.logo_url)}
                                                        alt="Logo Preview"
                                                        className="w-16 h-16 rounded-xl object-contain border border-slate-300 bg-white p-1 shadow-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                                                        className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow hover:bg-rose-600 transition-colors"
                                                        title="Hapus Logo"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white shrink-0">
                                                    <Building2 className="w-6 h-6" />
                                                    <span className="text-[9px] mt-0.5">No Logo</span>
                                                </div>
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const uploaded = await settingsApi.uploadFile(file);
                                                                if (uploaded?.url) {
                                                                    setFormData(prev => ({ ...prev, logo_url: uploaded.url }));
                                                                    showToast('Logo berhasil diunggah', 'success');
                                                                } else {
                                                                    throw new Error('Respon upload tidak valid');
                                                                }
                                                            } catch (err: any) {
                                                                console.error('Upload error:', err);
                                                                const errMsg = err?.response?.data?.error || err?.message || 'Gagal mengunggah logo';
                                                                showToast(errMsg, 'error');
                                                            }
                                                        }
                                                    }}
                                                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Atau masukkan URL logo (https://...)"
                                                    value={formData.logo_url || ''}
                                                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Kode Singkatan (Abbreviation) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Contoh: SJS-RENT"
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Nama Perusahaan <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Contoh: PT Sanjaya Heavy Fleet"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Legal (Legal Entity)</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: PT Sanjaya Fleet Services Tbk"
                                                value={formData.legal_name}
                                                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">NPWP / Tax ID</label>
                                            <input
                                                type="text"
                                                placeholder="01.234.567.8-012.000"
                                                value={formData.tax_id}
                                                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Perusahaan Induk (Parent Company)</label>
                                            <select
                                                value={formData.parent_company_id || ''}
                                                onChange={(e) => setFormData({ ...formData, parent_company_id: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700"
                                            >
                                                <option value="">-- Tanpa Induk (Top Level Holding) --</option>
                                                {companies
                                                    .filter(c => c.is_group && c.id !== editingCompany?.id)
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Sektor / Industri Domain</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Heavy Equipment & Fleet"
                                                value={formData.domain}
                                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="is_group"
                                            checked={formData.is_group}
                                            onChange={(e) => setFormData({ ...formData, is_group: e.target.checked })}
                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                        />
                                        <label htmlFor="is_group" className="text-xs font-semibold text-purple-900 cursor-pointer">
                                            Jadikan sebagai Group Holding (Memiliki Anak Perusahaan)
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* TAB: AKTA & LEGALITAS */}
                            {activeTab === 'legal' && (
                                <div className="space-y-6">
                                    {/* Bagian 1: Akta Pendirian Perusahaan */}
                                    <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
                                        <div className="flex items-center gap-2 text-amber-900 font-bold border-b border-amber-200/80 pb-2">
                                            <ScrollText className="w-4 h-4 text-amber-600" />
                                            <span>Akta Pendirian Perusahaan (Deed of Establishment)</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">No. Akta Pendirian</label>
                                                <input
                                                    type="text"
                                                    placeholder="Contoh: No. 12"
                                                    value={formData.establishment_deed_no || ''}
                                                    onChange={(e) => setFormData({ ...formData, establishment_deed_no: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Akta Pendirian</label>
                                                <input
                                                    type="date"
                                                    value={formData.establishment_deed_date || ''}
                                                    onChange={(e) => setFormData({ ...formData, establishment_deed_date: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Notaris</label>
                                                <input
                                                    type="text"
                                                    placeholder="Contoh: Hendra Wijaya, S.H., M.Kn."
                                                    value={formData.establishment_notary_name || ''}
                                                    onChange={(e) => setFormData({ ...formData, establishment_notary_name: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">No. SK Pengesahan Kemenkumham</label>
                                                <input
                                                    type="text"
                                                    placeholder="AHU-0012345.AH.01.01.Tahun 2010"
                                                    value={formData.establishment_approval_no || ''}
                                                    onChange={(e) => setFormData({ ...formData, establishment_approval_no: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bagian 2: Akta Perubahan Perusahaan (Multiple) */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                <span>Akta Perubahan Perusahaan (Deeds of Amendment)</span>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                                                    {formData.amendment_deeds?.length || 0} Akta
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddAmendmentDeed}
                                                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-semibold text-xs transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Tambah Akta Perubahan
                                            </button>
                                        </div>

                                        {(!formData.amendment_deeds || formData.amendment_deeds.length === 0) ? (
                                            <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                                                Belum ada Akta Perubahan. Klik "Tambah Akta Perubahan" untuk menambahkan akta baru.
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                {formData.amendment_deeds.map((deed, index) => (
                                                    <div key={index} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs text-indigo-900">
                                                                Akta Perubahan #{index + 1}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveAmendmentDeed(index)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                                                title="Hapus Akta Perubahan Ini"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">No. Akta Perubahan</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="No. 45"
                                                                    value={deed.deed_no}
                                                                    onChange={(e) => handleUpdateAmendmentDeed(index, 'deed_no', e.target.value)}
                                                                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Tanggal Akta</label>
                                                                <input
                                                                    type="date"
                                                                    value={deed.deed_date || ''}
                                                                    onChange={(e) => handleUpdateAmendmentDeed(index, 'deed_date', e.target.value)}
                                                                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Nama Notaris</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Hendra Wijaya, S.H."
                                                                    value={deed.notary_name || ''}
                                                                    onChange={(e) => handleUpdateAmendmentDeed(index, 'notary_name', e.target.value)}
                                                                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">No. Pengesahan Kemenkumham</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="AHU-0098765..."
                                                                    value={deed.approval_no || ''}
                                                                    onChange={(e) => handleUpdateAmendmentDeed(index, 'approval_no', e.target.value)}
                                                                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Perubahan / Keterangan</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Perubahan susunan direksi, modal disetor, KBLI..."
                                                                value={deed.description || ''}
                                                                onChange={(e) => handleUpdateAmendmentDeed(index, 'description', e.target.value)}
                                                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Alamat kantor pusat..."
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon</label>
                                            <input
                                                type="text"
                                                placeholder="+62-21-555-0100"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
                                            <input
                                                type="email"
                                                placeholder="info@sanjayagroup.co.id"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                                            <input
                                                type="url"
                                                placeholder="https://sanjayagroup.co.id"
                                                value={formData.website}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Negara Domisili</label>
                                            <input
                                                type="text"
                                                value={formData.country}
                                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Uang Utama (Base Currency)</label>
                                            <select
                                                value={formData.base_currency}
                                                onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700"
                                            >
                                                <option value="IDR">IDR (Rupiah Indonesia)</option>
                                                <option value="USD">USD (US Dollar)</option>
                                                <option value="SGD">SGD (Singapore Dollar)</option>
                                                <option value="EUR">EUR (Euro)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan Mulai Tahun Buku</label>
                                            <select
                                                value={formData.fiscal_year_start_month}
                                                onChange={(e) => setFormData({ ...formData, fiscal_year_start_month: parseInt(e.target.value) })}
                                                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700"
                                            >
                                                <option value={1}>Januari (Default)</option>
                                                <option value={4}>April</option>
                                                <option value={7}>Juli</option>
                                                <option value={10}>Oktober</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Status Operasional</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700"
                                        >
                                            <option value="ACTIVE">ACTIVE (Aktif Beroperasi)</option>
                                            <option value="INACTIVE">INACTIVE (Nonaktif / Ditutup)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer Buttons */}
                            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
                                >
                                    {editingCompany ? 'Simpan Perubahan' : 'Tambah Perusahaan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Tree Node Recursive Card Component
const TreeNodeCard: React.FC<{ node: CompanyTreeNode; onEdit: (comp: Company) => void }> = ({ node }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {node.children.length > 0 && (
                        <button 
                            onClick={() => setIsOpen(!isOpen)} 
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                        >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        node.is_group ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                        {node.code}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-900">{node.name}</h4>
                        {node.tax_id && <p className="text-xs text-slate-500">NPWP: {node.tax_id}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        node.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                        {node.status}
                    </span>
                </div>
            </div>

            {isOpen && node.children.length > 0 && (
                <div className="pl-6 border-l-2 border-indigo-200 space-y-3 mt-3">
                    {node.children.map((child) => (
                        <TreeNodeCard key={child.id} node={child} onEdit={onEdit} />
                    ))}
                </div>
            )}
        </div>
    );
};
