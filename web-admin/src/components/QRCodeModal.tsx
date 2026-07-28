import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Modal, Button } from './ui';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: {
        id: string;
        asset_code: string;
        name: string;
        brand?: string;
        model?: string;
    } | null;
}

export function QRCodeModal({ isOpen, onClose, asset }: QRCodeModalProps) {
    if (!asset) return null;

    const handlePrint = () => {
        const svgElement = document.getElementById('asset-qr-code-svg');
        let svgDataUrl = '';
        if (svgElement) {
            const svgString = new XMLSerializer().serializeToString(svgElement);
            svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Label - ${asset.asset_code}</title>
                <style>
                    @page { size: 60mm 40mm; margin: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 0;
                        margin: 0;
                        background: #ffffff;
                        color: #000000;
                    }
                    .label-container {
                        border: 2px solid #1e293b;
                        border-radius: 8px;
                        padding: 5mm 4mm;
                        text-align: center;
                        width: 54mm;
                        box-sizing: border-box;
                        background: #ffffff;
                    }
                    .qr-code img {
                        width: 30mm;
                        height: 30mm;
                        display: block;
                        margin: 0 auto 2mm auto;
                    }
                    .asset-code {
                        font-size: 13pt;
                        font-weight: 800;
                        margin: 1mm 0 0.5mm 0;
                        color: #0f172a;
                        letter-spacing: 0.5px;
                        line-height: 1.2;
                    }
                    .asset-name {
                        font-size: 8.5pt;
                        font-weight: 600;
                        color: #334155;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 48mm;
                        margin: 0 auto;
                        line-height: 1.3;
                    }
                    .brand-model {
                        font-size: 7.5pt;
                        color: #64748b;
                        margin-top: 1px;
                    }
                    .company-name {
                        font-size: 6.5pt;
                        font-weight: 700;
                        color: #94a3b8;
                        margin-top: 2mm;
                        text-transform: uppercase;
                        letter-spacing: 0.8px;
                    }
                </style>
            </head>
            <body onload="setTimeout(() => { window.print(); }, 250)">
                <div class="label-container">
                    <div class="qr-code">
                        ${svgDataUrl ? `<img src="${svgDataUrl}" alt="QR Code" />` : ''}
                    </div>
                    <div class="asset-code">${asset.asset_code}</div>
                    <div class="asset-name">${asset.name}</div>
                    ${asset.brand || asset.model ? `<div class="brand-model">${asset.brand || ''} ${asset.model || ''}</div>` : ''}
                    <div class="company-name">ERP Management System</div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="QR Code Label" size="sm">
            <div className="flex flex-col items-center p-4">
                {/* QR Code Preview */}
                <div className="bg-white p-4 rounded-lg mb-4 shadow-sm">
                    <QRCodeSVG
                        id="asset-qr-code-svg"
                        value={asset.id}
                        size={180}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* Asset Info */}
                <div className="text-center mb-4">
                    <p className="text-xl font-bold text-white">{asset.asset_code}</p>
                    <p className="text-slate-400">{asset.name}</p>
                    {(asset.brand || asset.model) && (
                        <p className="text-sm text-slate-500">{asset.brand} {asset.model}</p>
                    )}
                </div>

                {/* UUID for reference */}
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4 w-full">
                    <p className="text-xs text-slate-500 mb-1">Asset ID (untuk scan):</p>
                    <p className="text-xs text-cyan-400 font-mono break-all select-all">{asset.id}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Tutup
                    </Button>
                    <Button
                        onClick={handlePrint}
                        leftIcon={<Printer size={16} />}
                        className="flex-1"
                    >
                        Print Label
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
