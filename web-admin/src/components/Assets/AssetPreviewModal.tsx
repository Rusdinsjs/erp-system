import React, { useRef } from 'react';
import { Modal, Button, Badge, Card, LoadingOverlay, useToast } from '../ui';
import { 
    Share2, 
    Printer, 
    FileText, 
    Image as ImageIcon,
    Info,
    Calendar,
    MapPin,
    Tag,
    Zap,
    Fuel,
    Clock,
    Hash,
    Loader2
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useQuery } from '@tanstack/react-query';
import { assetApi } from '../../api/assets';
import type { Asset } from '../../types';
import dayjs from 'dayjs';
import { getImageUrl } from '../../utils/image';

interface AssetPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
}

export const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ isOpen, onClose, asset }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const { success, error: toastError } = useToast();
    const [isSendingWA, setIsSendingWA] = React.useState(false);

    const { data: documents, isLoading } = useQuery({
        queryKey: ['asset-documents', asset?.id],
        queryFn: () => assetApi.getDocuments(asset!.id),
        enabled: !!asset?.id && isOpen,
    });

    if (!asset) return null;

    const getPhoto = (side: string) => {
        return documents?.find((doc: any) => doc.type === side)?.file_path;
    };

    const handleExportImage = async () => {
        if (!previewRef.current) return;
        try {
            const dataUrl = await toPng(previewRef.current, { cacheBust: true });
            const link = document.createElement('a');
            link.download = `asset-preview-${asset.asset_code}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Failed to export image', error);
        }
    };

    const handleExportPDF = async () => {
        if (!previewRef.current) return;
        try {
            const dataUrl = await toPng(previewRef.current, { cacheBust: true });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`asset-preview-${asset.asset_code}.pdf`);
        } catch (error) {
            console.error('Failed to export PDF', error);
        }
    };

    const handleSendToWhatsApp = async () => {
        if (!asset || !previewRef.current) return;
        setIsSendingWA(true);
        try {
            // Convert preview to image
            const dataUrl = await toPng(previewRef.current, { quality: 1.0, pixelRatio: 2 });
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `Asset_${asset.asset_code}.png`, { type: 'image/png' });
            
            const text = `*Informasi Aset: ${asset.asset_code}*\n\n` +
                `Nama Aset: ${asset.name}\n` +
                `Kategori: ${asset.category_name || '-'}\n` +
                `Status: ${asset.status || '-'}\n` +
                `Lokasi: ${asset.location_name || '-'}\n\n` +
                `Dicetak dari SJS Asset Management System`;

            // Try Web Share API first (supports direct file sharing to Apps like WhatsApp without Ctrl+V)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Asset ${asset.asset_code}`,
                    text: text
                });
                success('Berhasil membuka menu Share. Silakan pilih WhatsApp.', 'Share API');
            } else {
                // Fallback 1: Try copying to clipboard and opening wa.me (Desktop App) instead of web.whatsapp
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                
                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
                
                success('Gambar disalin! Tekan Paste (Ctrl+V) di WhatsApp.', 'Fallback');
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') { // Ignore user cancelling the share dialog
                console.error('Failed to share', err);
                toastError('Gagal membagikan gambar aset.', 'Error Share');
            }
        } finally {
            setIsSendingWA(false);
        }
    };

    const photos = asset.photos || {};
    const placeholder = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'; // Default placeholder

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Preview Asset: ${asset.asset_code}`}
            size="75p"
        >
            <div className="flex flex-col gap-6 min-h-[400px]">
                <LoadingOverlay visible={isLoading} />
                
                {/* Export Toolbar */}
                <div className="flex justify-end gap-2 pb-4 border-b border-border">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<ImageIcon size={16} />}
                        onClick={handleExportImage}
                    >
                        Save as Image
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<FileText size={16} />}
                        onClick={handleExportPDF}
                    >
                        Save as PDF
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<Printer size={16} />}
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </div>

                {/* Printable Content Area */}
                <div ref={previewRef} className="p-6 bg-card border border-border rounded-xl space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-foreground mb-1">{asset.name}</h2>
                            <p className="text-muted-foreground font-mono">{asset.asset_code} — {asset.category_name}</p>
                        </div>
                        <Badge variant={asset.status === 'ACTIVE' ? 'success' : 'warning'} className="text-sm px-4 py-1">
                            {asset.status}
                        </Badge>
                    </div>

                    {/* Photos Grid - 4 Sides */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'FRONT VIEW', url: getPhoto('FRONT') || photos.front },
                            { label: 'REAR VIEW', url: getPhoto('BACK') || photos.back },
                            { label: 'LEFT SIDE', url: getPhoto('LEFT') || photos.left },
                            { label: 'RIGHT SIDE', url: getPhoto('RIGHT') || photos.right }
                        ].map((side, idx) => (
                            <div key={idx} className="relative group overflow-hidden rounded-2xl bg-muted border border-border aspect-[4/3]">
                                {isLoading ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50">
                                        <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mb-2" />
                                        <span className="text-xs text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={getImageUrl(side.url || placeholder)} 
                                        alt={side.label}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                    <span className="text-xs font-bold text-white tracking-widest uppercase">{side.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Info Grid - 2 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1: General Info */}
                        <Card className="bg-muted/30 border-border backdrop-blur-sm">
                            <div className="p-4 space-y-4">
                                <h4 className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                    <Info size={14} /> General Info
                                </h4>
                                <div className="space-y-3">
                                    <InfoItem label="Asset Code" value={asset.asset_code} />
                                    <InfoItem label="Serial No" value={asset.serial_number || '-'} />
                                    <InfoItem label="Brand" value={asset.brand || '-'} />
                                    <InfoItem label="Model" value={asset.model || '-'} />
                                    <InfoItem label="Year" value={asset.year_manufacture?.toString() || '-'} icon={<Calendar size={12} />} />
                                </div>
                            </div>
                        </Card>

                        {/* Column 2: Assignment & Location */}
                        <Card className="bg-muted/30 border-border backdrop-blur-sm">
                            <div className="p-4 space-y-4">
                                <h4 className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                    <MapPin size={14} /> Assignment
                                </h4>
                                <div className="space-y-3">
                                    <InfoItem label="Location" value={asset.location_name || '-'} icon={<MapPin size={12} />} />
                                    <InfoItem label="Department" value={asset.department_name || '-'} icon={<Tag size={12} />} />
                                    <InfoItem label="PIC / User" value={asset.assigned_to_name || '-'} />
                                    <InfoItem label="Condition" value={asset.condition_id ? `Level ${asset.condition_id}` : '-'} />
                                    <InfoItem label="Organization" value="SJS Group" />
                                </div>
                            </div>
                        </Card>

                        {/* Column 3: Technical Specs */}
                        <Card className="bg-muted/30 border-border backdrop-blur-sm">
                            <div className="p-4 space-y-4">
                                <h4 className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                                    <Zap size={14} /> Technical
                                </h4>
                                <div className="space-y-3">
                                    <InfoItem label="Engine No" value={asset.vehicle_details?.engine_number || '-'} />
                                    <InfoItem label="Chassis (VIN)" value={asset.vehicle_details?.vin || '-'} />
                                    <InfoItem label="Fuel Type" value={asset.vehicle_details?.fuel_type || '-'} icon={<Fuel size={12} />} />
                                    <InfoItem label="Odometer" value={asset.vehicle_details?.odometer_last ? `${asset.vehicle_details.odometer_last.toLocaleString()} km` : '-'} icon={<Clock size={12} />} />
                                    <InfoItem label="Plate No" value={asset.vehicle_details?.license_plate || '-'} icon={<Hash size={12} />} />
                                </div>
                            </div>
                        </Card>

                        {/* Column 4: Compliance & Dates */}
                        <Card className="bg-muted/30 border-border backdrop-blur-sm">
                            <div className="p-4 space-y-4">
                                <h4 className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                                    <FileText size={14} /> Compliance
                                </h4>
                                <div className="space-y-3">
                                    <InfoItem label="Purchased" value={asset.purchase_date ? dayjs(asset.purchase_date).format('DD MMM YYYY') : '-'} />
                                    {asset.vehicle_details?.stnk_expiry && (
                                        <InfoItem 
                                            label="STNK Expiry" 
                                            value={dayjs(asset.vehicle_details.stnk_expiry).format('DD MMM YYYY')} 
                                            icon={<Calendar size={12} className="text-amber-400" />} 
                                        />
                                    )}
                                    {asset.vehicle_details?.tax_expiry && (
                                        <InfoItem 
                                            label="Tax Expiry" 
                                            value={dayjs(asset.vehicle_details.tax_expiry).format('DD MMM YYYY')} 
                                            icon={<Calendar size={12} className="text-amber-400" />} 
                                        />
                                    )}
                                    {asset.vehicle_details?.kir_expiry && (
                                        <InfoItem 
                                            label="KIR Expiry" 
                                            value={dayjs(asset.vehicle_details.kir_expiry).format('DD MMM YYYY')} 
                                            icon={<Calendar size={12} className="text-amber-400" />} 
                                        />
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Footer / QR */}
                    <div className="flex justify-between items-center pt-6 border-t border-border">
                        <div className="text-[10px] text-muted-foreground italic">
                            Generated by SJS Asset Management System on {dayjs().format('DD MMM YYYY HH:mm')}
                        </div>
                        {asset.qr_code_url && (
                            <div className="bg-white p-1 rounded-lg">
                                <img src={getImageUrl(asset.qr_code_url)} alt="QR Code" className="w-12 h-12" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isSendingWA}>Close Preview</Button>
                    <Button variant="primary" leftIcon={isSendingWA ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />} onClick={handleSendToWhatsApp} disabled={isSendingWA}>
                        {isSendingWA ? 'Menyiapkan...' : 'Send to WhatsApp'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const InfoItem = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
    <div>
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mb-0.5">{label}</div>
        <div className="text-sm text-foreground font-semibold flex items-center gap-1.5">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {value}
        </div>
    </div>
);
