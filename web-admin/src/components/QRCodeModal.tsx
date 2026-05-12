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
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const qrValue = asset.id; // Use UUID for scanning

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Label - ${asset.asset_code}</title>
                <style>
                    @page { size: 60mm 40mm; margin: 2mm; }
                    body {
                        font-family: 'Arial', sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 4mm;
                        margin: 0;
                    }
                    .label-container {
                        border: 1px solid #333;
                        border-radius: 4px;
                        padding: 4mm;
                        text-align: center;
                        width: 52mm;
                    }
                    .qr-code {
                        margin-bottom: 2mm;
                    }
                    .asset-code {
                        font-size: 12pt;
                        font-weight: bold;
                        margin: 2mm 0;
                    }
                    .asset-name {
                        font-size: 8pt;
                        color: #555;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 50mm;
                    }
                    .brand-model {
                        font-size: 7pt;
                        color: #777;
                    }
                    .company-name {
                        font-size: 6pt;
                        color: #999;
                        margin-top: 2mm;
                    }
                </style>
            </head>
            <body>
                <div class="label-container">
                    <div class="qr-code">
                        <svg id="qr-placeholder"></svg>
                    </div>
                    <div class="asset-code">${asset.asset_code}</div>
                    <div class="asset-name">${asset.name}</div>
                    ${asset.brand || asset.model ? `<div class="brand-model">${asset.brand || ''} ${asset.model || ''}</div>` : ''}
                    <div class="company-name">Management System</div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                <script>
                    const canvas = document.createElement('canvas');
                    QRCode.toCanvas(canvas, '${qrValue}', { width: 100, margin: 0 }, function(error) {
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="QR Code Label" size="sm">
            <div className="flex flex-col items-center p-4">
                {/* QR Code Preview */}
                <div className="bg-white p-4 rounded-lg mb-4">
                    <QRCodeSVG
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
