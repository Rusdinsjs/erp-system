import React from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';

interface DocumentPreviewModalProps {
    fileLabel: string;
    fileUrl: string | null;
    mimeType: string;
    isOpen: boolean;
    onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    fileLabel,
    fileUrl,
    mimeType,
    isOpen,
    onClose,
}) => {
    if (!isOpen || !fileUrl) return null;

    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');

    const handleDownload = () => {
        if (!fileUrl) return;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileLabel;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
            <div className="bg-gray-900 border border-white/10 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Maximize2 size={18} className="text-blue-400" />
                        </div>
                        <h3 className="text-white font-medium truncate max-w-md">{fileLabel}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-sm"
                            title="Download"
                        >
                            <Download size={18} />
                            <span>Download</span>
                        </button>
                        <div className="w-px h-6 bg-white/5 mx-2" />
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-950 overflow-auto flex items-center justify-center p-4">
                    {isPdf ? (
                        <iframe
                            src={fileUrl}
                            className="w-full h-full border-0 rounded-lg bg-white"
                            title={fileLabel}
                        />
                    ) : isImage ? (
                        <div className="relative group max-w-full max-h-full">
                            <img
                                src={fileUrl}
                                alt={fileLabel}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                            />
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="bg-yellow-500/10 p-6 rounded-full inline-block mb-4">
                                <Minimize2 size={48} className="text-yellow-400" />
                            </div>
                            <h4 className="text-white text-lg font-medium">Preview not available</h4>
                            <p className="text-gray-400 mt-2 max-w-xs mx-auto">
                                This file type ({mimeType}) cannot be previewed. Please download the file to view its content.
                            </p>
                            <button
                                onClick={handleDownload}
                                className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-medium transition-all"
                            >
                                Download Now
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer / Status */}
                <div className="px-6 py-3 border-t border-white/5 bg-gray-900/50 flex justify-between items-center text-xs text-gray-500">
                    <span>Type: {mimeType}</span>
                    <span>System Preview v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default DocumentPreviewModal;
