import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Building2, Tag, Calendar, Truck, Printer, BarChart3 } from 'lucide-react';
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
                    </div>
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
                            <div className="flex items-center gap-2">
                                <BarChart3 className="text-cyan-400" size={20} />
                                <CardTitle>Profitability Analysis (ROI)</CardTitle>
                            </div>
                        </CardHeader>
                        <div className="space-y-8 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ROIStat label="Total Maintenance Cost" value={asset.total_maintenance_cost || 0} color="red" />
                                <ROIStat label="Total Rental Income" value={asset.total_rental_income || 0} color="green" />
                                <ROIStat
                                    label="Net Profit/Loss"
                                    value={(asset.total_rental_income || 0) - (asset.total_maintenance_cost || 0)}
                                    color={(asset.total_rental_income || 0) - (asset.total_maintenance_cost || 0) >= 0 ? "cyan" : "red"}
                                />
                            </div>

                            <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                                <p className="text-muted-foreground">Detailed ROI Charts & Breakdowns will be displayed here.</p>
                                <p className="text-sm text-muted-foreground/70 mt-2">Integrating with Journal & Invoicing data...</p>
                            </div>
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

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-muted-foreground">{icon}</div>
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
