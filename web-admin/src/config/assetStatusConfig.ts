// Single Canonical Asset Status Registry for ERP System
// All modules, pages, charts, tables, badges, and forms use this SINGLE standard.

export type AssetStatusKey =
    | 'planning'
    | 'procurement'
    | 'received'
    | 'in_inventory'
    | 'available'
    | 'deployed'
    | 'in_use'
    | 'active'
    | 'rented_out'
    | 'on_loan'
    | 'loaned'
    | 'under_maintenance'
    | 'under_repair'
    | 'under_conversion'
    | 'retired'
    | 'sold'
    | 'disposed'
    | 'lost_stolen'
    | 'archived';

export interface AssetStatusDefinition {
    key: string;
    label: string;             // Standard Indonesian Process Name
    phase: string;             // Lifecycle Phase
    badgeVariant: 'default' | 'info' | 'success' | 'warning' | 'danger';
    hexColor: string;          // Chart & Graph Color
    description: string;
}

export const ASSET_STATUS_REGISTRY: Record<string, AssetStatusDefinition> = {
    planning: {
        key: 'planning',
        label: 'Rencana Pengadaan',
        phase: 'Fase 1: Pengadaan & Registrasi',
        badgeVariant: 'default',
        hexColor: '#64748b',
        description: 'Perencanaan anggaran & pengajuan pembelian aset',
    },
    procurement: {
        key: 'procurement',
        label: 'Proses Beli (PO)',
        phase: 'Fase 1: Pengadaan & Registrasi',
        badgeVariant: 'info',
        hexColor: '#3b82f6',
        description: 'Proses pengadaan aktif via Purchase Order',
    },
    received: {
        key: 'received',
        label: 'Penerimaan & Registrasi QR',
        phase: 'Fase 1: Pengadaan & Registrasi',
        badgeVariant: 'info',
        hexColor: '#06b6d4',
        description: 'Barang diterima dan pendaftaran QR tag',
    },
    in_inventory: {
        key: 'in_inventory',
        label: 'Siap Gunakan (Stok)',
        phase: 'Fase 2: Kesiapan Stok',
        badgeVariant: 'success',
        hexColor: '#10b981',
        description: 'Aset siap di gudang/lokasi untuk digunakan atau disewa',
    },
    available: {
        key: 'available',
        label: 'Siap Gunakan (Stok)',
        phase: 'Fase 2: Kesiapan Stok',
        badgeVariant: 'success',
        hexColor: '#10b981',
        description: 'Aset siap di gudang/lokasi untuk digunakan atau disewa',
    },
    deployed: {
        key: 'deployed',
        label: 'Operasional Internal',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'success',
        hexColor: '#059669',
        description: 'Aset sedang ditugaskan ke proyek/karyawan internal',
    },
    in_use: {
        key: 'in_use',
        label: 'Operasional Internal',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'success',
        hexColor: '#059669',
        description: 'Aset sedang ditugaskan ke proyek/karyawan internal',
    },
    active: {
        key: 'active',
        label: 'Operasional Internal',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'success',
        hexColor: '#059669',
        description: 'Aset aktif dalam unit operasional',
    },
    rented_out: {
        key: 'rented_out',
        label: 'Disewakan (Komersial)',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'info',
        hexColor: '#8b5cf6',
        description: 'Aset sedang disewakan ke pihak luar (kontrak aktif)',
    },
    on_loan: {
        key: 'on_loan',
        label: 'Pinjam Pakai Internal',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'info',
        hexColor: '#6366f1',
        description: 'Aset dipinjamkan sementara untuk operasional internal',
    },
    loaned: {
        key: 'loaned',
        label: 'Pinjam Pakai Internal',
        phase: 'Fase 3: Operasional & Sewa/Pinjam',
        badgeVariant: 'info',
        hexColor: '#6366f1',
        description: 'Aset dipinjamkan sementara untuk operasional internal',
    },
    under_maintenance: {
        key: 'under_maintenance',
        label: 'Perawatan Berkala (PM)',
        phase: 'Fase 4: Perawatan & Konversi',
        badgeVariant: 'warning',
        hexColor: '#eab308',
        description: 'Aset sedang dalam proses jadwal servis berkala (PM Work Order)',
    },
    under_repair: {
        key: 'under_repair',
        label: 'Perbaikan Servis (WO)',
        phase: 'Fase 4: Perawatan & Konversi',
        badgeVariant: 'warning',
        hexColor: '#f97316',
        description: 'Aset sedang dalam perbaikan kerusakan breakdown (WO)',
    },
    under_conversion: {
        key: 'under_conversion',
        label: 'Proses Konversi Asset',
        phase: 'Fase 4: Perawatan & Konversi',
        badgeVariant: 'info',
        hexColor: '#14b8a6',
        description: 'Aset sedang dalam proses perakitan/konversi dari barang persediaan',
    },
    retired: {
        key: 'retired',
        label: 'Bebas Tugas (Afkir)',
        phase: 'Fase 5: Penelusuran & Pelepasan',
        badgeVariant: 'default',
        hexColor: '#94a3b8',
        description: 'Aset dihentikan dari operasi aktif (bebas tugas)',
    },
    sold: {
        key: 'sold',
        label: 'Terjual',
        phase: 'Fase 5: Penelusuran & Pelepasan',
        badgeVariant: 'info',
        hexColor: '#0284c7',
        description: 'Aset telah dijual kepada pihak ketiga',
    },
    disposed: {
        key: 'disposed',
        label: 'Dimusnahkan (Scrap)',
        phase: 'Fase 5: Penelusuran & Pelepasan',
        badgeVariant: 'danger',
        hexColor: '#ef4444',
        description: 'Aset telah dimusnahkan/dihapuskan dari buku aset',
    },
    lost_stolen: {
        key: 'lost_stolen',
        label: 'Hilang / Dicuri',
        phase: 'Fase 5: Penelusuran & Pelepasan',
        badgeVariant: 'danger',
        hexColor: '#dc2626',
        description: 'Aset dilaporkan hilang atau dicuri',
    },
    archived: {
        key: 'archived',
        label: 'Diarsipkan',
        phase: 'Fase 5: Penelusuran & Pelepasan',
        badgeVariant: 'default',
        hexColor: '#475569',
        description: 'Catatan aset diarsipkan secara historis',
    },
};

export const getAssetStatusMeta = (status?: string): AssetStatusDefinition => {
    if (!status) return ASSET_STATUS_REGISTRY.available;
    const normalizedKey = status.toLowerCase().trim();
    return ASSET_STATUS_REGISTRY[normalizedKey] || {
        key: normalizedKey,
        label: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        phase: 'Operasional',
        badgeVariant: 'default',
        hexColor: '#64748b',
        description: '',
    };
};

export const getAssetStatusLabel = (status?: string): string => {
    return getAssetStatusMeta(status).label;
};

export const getAssetStatusBadgeVariant = (status?: string) => {
    return getAssetStatusMeta(status).badgeVariant;
};

export const getAssetStatusColor = (status?: string): string => {
    return getAssetStatusMeta(status).hexColor;
};
