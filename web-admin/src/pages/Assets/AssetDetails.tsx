import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    ArrowLeft, MapPin, Building2, Tag, Calendar, 
    Truck, Printer, BarChart3, FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { assetApi } from '../../api/assets';

import { AssetDocuments } from '../../components/Assets/AssetDocuments';
import { AssetExpenses } from '../../components/Assets/AssetExpenses';
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    Badge,
    LoadingOverlay,
    Tabs, TabsContent, TabsList, TabsTrigger,
} from '../../components/ui';
import { AssetVisuals } from '../../components/Assets/AssetVisuals';

export default function AssetDetails({ assetId }: { assetId?: string }) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = assetId || paramId;
    const navigate = useNavigate();

    const handlePrint = (asset: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Label - ${asset.asset_code}</title>
                <style>
                    @page { size: 60mm 40mm; margin: 2mm; }
                    body { font-family: 'Arial', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4mm; margin: 0;}
                    .label-container { border: 1px solid #333; border-radius: 4px; padding: 4mm; text-align: center; width: 52mm;}
                    .qr-code { margin-bottom: 2mm;}
                    .asset-code { font-size: 12pt; font-weight: bold; margin: 2mm 0;}
                    .asset-name { font-size: 8pt; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50mm;}
                </style>
            </head>
            <body>
                <div class="label-container">
                    <div class="qr-code"><svg id="qr-placeholder"></svg></div>
                    <div class="asset-code">${asset.asset_code}</div>
                    <div class="asset-name">${asset.name}</div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                <script>
                    const canvas = document.createElement('canvas');
                    QRCode.toCanvas(canvas, '${asset.id}', { width: 100, margin: 0 }, function(error) {
                        if (!error) {
                            const img = document.createElement('img');
                            img.src = canvas.toDataURL();
                            img.style.width = '25mm';
                            img.style.height = '25mm';
                            document.querySelector('.qr-code').appendChild(img);
                            document.getElementById('qr-placeholder').remove();
                            setTimeout(() => window.print(), 300);
                        }
                    });
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };


    // Fetch asset detail
    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset-detail', id],
        queryFn: () => assetApi.get(id!),
        enabled: !!id,
    });

    if (isLoading) return <LoadingOverlay visible={true} />;

    if (error || !asset) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-destructive">Error Loading Asset</h2>
                <p className="text-muted-foreground">{(error as any)?.message || 'Asset not found'}</p>
                <Button variant="outline" onClick={() => navigate('/assets')} className="mt-4">
                    Back to List
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {asset.name}
                            <span className="ml-3 text-muted-foreground font-normal text-lg">
                                {asset.asset_code}
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {asset.brand} {asset.model} • {asset.category_name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={asset.status === 'active' ? 'success' : 'default'} className="px-3 py-1 text-sm">
                        {asset.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Button variant="outline" onClick={() => navigate(`/assets/${id}/lifecycle`)}>
                        Lifecycle History
                    </Button>
                </div>
            </div>



            {/* Details Tabs */}
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="mb-4 w-full justify-start overflow-x-auto global-scrollbar pb-1">
                    <TabsTrigger value="details" className="flex-shrink-0">General Info</TabsTrigger>
                    <TabsTrigger value="visuals" className="flex-shrink-0">Visuals (4-Sided)</TabsTrigger>
                    <TabsTrigger value="expenses" className="flex-shrink-0">Expenses (OPEX)</TabsTrigger>
                    <TabsTrigger value="capex" className="flex-shrink-0">Expenses (CAPEX)</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-shrink-0">Documents</TabsTrigger>
                    <TabsTrigger value="roi" className="flex-shrink-0">ROI & Profitability</TabsTrigger>
                    <TabsTrigger value="qrcode" className="flex-shrink-0">QR Code Label</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <Card padding="lg">
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                            </CardHeader>
                            <div className="space-y-4">
                                <DetailItem icon={<Tag size={18} />} label="Asset Code" value={asset.asset_code} />
                                <DetailItem icon={<Tag size={18} />} label="Serial Number" value={asset.serial_number || '-'} />
                                <DetailItem icon={<Building2 size={18} />} label="Brand" value={asset.brand || '-'} />
                                <DetailItem icon={<Building2 size={18} />} label="Model" value={asset.model || '-'} />
                                <DetailItem icon={<Calendar size={18} />} label="Purchase Date" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'} />
                            </div>
                        </Card>

                        {/* Location & Department */}
                        <div className="space-y-6">
                            <Card padding="lg">
                                <CardHeader>
                                    <CardTitle>Assignment</CardTitle>
                                </CardHeader>
                                <div className="space-y-4">
                                    <DetailItem icon={<MapPin size={18} />} label="Current Location" value={asset.location_name || 'Unassigned'} />
                                    <DetailItem icon={<Building2 size={18} />} label="Department" value={asset.department_name || 'No Dept'} />
                                    <DetailItem icon={<Truck size={18} />} label="Assigned To" value={asset.assigned_to_name || '-'} />
                                </div>
                            </Card>

                            {/* Tax & Renewals Section */}
                            {asset.vehicle_details && (
                                <Card padding="lg" className="border-cyan-500/20 bg-cyan-500/5">
                                    <CardHeader>
                                        <CardTitle className="text-cyan-400 flex items-center gap-2">
                                            <Calendar size={20} />
                                            Tax & Documents
                                        </CardTitle>
                                    </CardHeader>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <DetailItem 
                                            icon={<Calendar size={18} />}
                                            label="STNK Expiry" 
                                            value={asset.vehicle_details.stnk_expiry ? new Date(asset.vehicle_details.stnk_expiry).toLocaleDateString() : '-'} 
                                        />
                                        <DetailItem 
                                            icon={<Calendar size={18} />}
                                            label="Tax Expiry" 
                                            value={asset.vehicle_details.tax_expiry ? new Date(asset.vehicle_details.tax_expiry).toLocaleDateString() : '-'} 
                                        />
                                        <DetailItem 
                                            icon={<Calendar size={18} />}
                                            label="KIR Expiry" 
                                            value={asset.vehicle_details.kir_expiry ? new Date(asset.vehicle_details.kir_expiry).toLocaleDateString() : '-'} 
                                        />
                                        <DetailItem 
                                            icon={<Calendar size={18} />}
                                            label="Lapor Tiba" 
                                            value={asset.vehicle_details.lapor_tiba_expiry ? new Date(asset.vehicle_details.lapor_tiba_expiry).toLocaleDateString() : '-'} 
                                        />
                                        <DetailItem 
                                            icon={<FileText size={18} />}
                                            label="Bukti Kepemilikan" 
                                            value={(() => {
                                                const cat = asset.category_name?.toLowerCase() || '';
                                                let label = 'BPKB';
                                                if (cat.includes('tanah') || cat.includes('bangunan')) label = 'SHM/SHGB';
                                                if (cat.includes('berat')) label = 'Invoice';
                                                if (cat.includes('mesin')) label = 'Kwitansi';
                                                return `${label}: ${asset.vehicle_details.bpkb_number || '-'}`;
                                            })()} 
                                        />
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="visuals">
                    <AssetVisuals assetId={id!} readOnly={true} />
                </TabsContent>

                <TabsContent value="documents">
                    <AssetDocuments assetId={id!} />
                </TabsContent>

                <TabsContent value="expenses">
                    <AssetExpenses assetId={id!} type="OPEX" />
                </TabsContent>

                <TabsContent value="capex">
                    <AssetExpenses assetId={id!} type="CAPEX" />
                </TabsContent>

                <TabsContent value="roi">
                    <Card padding="lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="text-cyan-400" size={20} />
                                    <CardTitle>Total Cost of Ownership (TCO) & ROI Analysis</CardTitle>
                                </div>
                                {(() => {
                                    const revenue = Number(asset.total_rental_income || 0);
                                    const maintenance = Number(asset.total_maintenance_cost || 0);
                                    const fuel = Number((asset as any).total_fuel_cost || 0);
                                    const opex = maintenance + fuel;
                                    const netProfit = revenue - opex;

                                    if (revenue === 0) return <Badge variant="default">Belum Ada Pendapatan</Badge>;
                                    if (netProfit > 0) return <Badge variant="success">Profit Margin Positif</Badge>;
                                    return <Badge variant="danger">Beban Operasional Tinggi</Badge>;
                                })()}
                            </div>
                        </CardHeader>
                        <div className="space-y-8 py-4">
                            {/* KPI Metrics */}
                            {(() => {
                                const purchasePrice = Number(asset.purchase_price || 0);
                                const maintenanceCost = Number(asset.total_maintenance_cost || 0);
                                const fuelCost = Number((asset as any).total_fuel_cost || 0);
                                const totalOpex = maintenanceCost + fuelCost;
                                const rentalIncome = Number(asset.total_rental_income || 0);
                                const netMargin = rentalIncome - totalOpex;
                                const roiPercent = purchasePrice > 0 ? ((netMargin / purchasePrice) * 100).toFixed(1) : 'N/A';

                                return (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                            <ROIStat label="Investasi Beli (CAPEX)" value={purchasePrice} color="cyan" />
                                            <ROIStat label="Total Operasional (OPEX)" value={totalOpex} color="red" />
                                            <ROIStat label="Pendapatan Sewa (Revenue)" value={rentalIncome} color="green" />
                                            <ROIStat label="Net Profit / Loss Operasional" value={netMargin} color={netMargin >= 0 ? "green" : "red"} />
                                        </div>

                                        {/* Financial Performance Summary Card */}
                                        <div className="p-6 rounded-xl bg-card/60 border border-border/60 backdrop-blur space-y-4">
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Ringkasan Kinerja Keuangan Aset</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Analisis biaya perawatan, bahan bakar, dan pendapatan sewa kumulatif</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block">Return On Investment (ROI)</span>
                                                    <span className={`text-xl font-extrabold ${Number(roiPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {roiPercent !== 'N/A' ? `${roiPercent}%` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Cost vs Revenue Visual Bar */}
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                                    <span>Proporsi Biaya vs Pendapatan</span>
                                                    <span>OPEX: {rentalIncome > 0 ? ((totalOpex / rentalIncome) * 100).toFixed(0) : 0}% dari Pendapatan</span>
                                                </div>
                                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-amber-500 transition-all duration-500"
                                                        style={{ width: `${rentalIncome > 0 ? Math.min(100, (maintenanceCost / rentalIncome) * 100) : 33}%` }}
                                                        title={`Maintenance: IDR ${maintenanceCost.toLocaleString('id-ID')}`}
                                                    />
                                                    <div
                                                        className="bg-red-500 transition-all duration-500"
                                                        style={{ width: `${rentalIncome > 0 ? Math.min(100, (fuelCost / rentalIncome) * 100) : 33}%` }}
                                                        title={`Fuel: IDR ${fuelCost.toLocaleString('id-ID')}`}
                                                    />
                                                    <div
                                                        className="bg-emerald-500 flex-1 transition-all duration-500"
                                                        title={`Net Margin: IDR ${netMargin.toLocaleString('id-ID')}`}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/> Maintenance ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(maintenanceCost)})</span>
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/> Fuel ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(fuelCost)})</span>
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Net Margin</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="qrcode">
                    <Card padding="lg">
                        <div className="flex flex-col items-center py-4 md:py-8">
                            <div className="bg-white p-4 md:p-6 rounded-2xl mb-6 shadow-2xl shadow-cyan-500/20 max-w-[250px] w-full aspect-square flex items-center justify-center">
                                <QRCodeSVG
                                    value={asset.id}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-foreground mb-1">{asset.asset_code}</h3>
                                <p className="text-muted-foreground">{asset.name}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
                                <Button
                                    onClick={() => handlePrint(asset)}
                                    leftIcon={<Printer size={20} />}
                                    size="lg"
                                    className="px-8 w-full sm:w-auto justify-center"
                                >
                                    Print QR Label
                                </Button>
                                <Button variant="outline" size="lg" className="w-full sm:w-auto justify-center" onClick={() => {
                                    const svg = document.querySelector('svg');
                                    if (svg) {
                                        const svgData = new XMLSerializer().serializeToString(svg);
                                        const canvas = document.createElement("canvas");
                                        const ctx = canvas.getContext("2d");
                                        const img = new Image();
                                        img.onload = () => {
                                            canvas.width = img.width;
                                            canvas.height = img.height;
                                            ctx?.drawImage(img, 0, 0);
                                            const pngFile = canvas.toDataURL("image/png");
                                            const downloadLink = document.createElement("a");
                                            downloadLink.download = `QR-${asset.asset_code}.png`;
                                            downloadLink.href = `${pngFile}`;
                                            downloadLink.click();
                                        };
                                        img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                    }
                                }}>
                                    Download PNG
                                </Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon?: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <div>
                <p className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-foreground font-medium">{value}</p>
            </div>
        </div>
    );
}

function ROIStat({ label, value, color }: { label: string, value: number, color: 'red' | 'green' | 'cyan' }) {
    const colorClasses = {
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
            <p className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)}
            </p>
        </div>
    );
}
