import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetApi, type AssetDocument } from '../../api/assets';
import { Button, Card, CardHeader, CardTitle, Badge, Input, Textarea, Select } from '../ui';
import { FileText, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssetDocumentsProps {
    assetId: string;
}

export function AssetDocuments({ assetId }: AssetDocumentsProps) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        type: 'MANUAL',
        file: null as File | null,
        notes: ''
    });

    const [uploadProgress, setUploadProgress] = useState(0);

    const { data: documents, isLoading } = useQuery({
        queryKey: ['asset-documents', assetId],
        queryFn: () => assetApi.getDocuments(assetId)
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadForm.file) throw new Error("Please select a file");
            setUploadProgress(0);

            // 1. Upload File with progress tracking
            const fileData = await assetApi.uploadFile(uploadForm.file, (percent) => {
                setUploadProgress(percent);
            });

            // 2. Add Document Record
            return assetApi.addDocument(assetId, {
                name: uploadForm.name || fileData.original_name,
                type: uploadForm.type,
                file_path: fileData.url,
                mime_type: fileData.content_type,
                size_bytes: fileData.size,
                notes: uploadForm.notes
            });
        },
        onSuccess: () => {
            toast.success("Document added successfully");
            queryClient.invalidateQueries({ queryKey: ['asset-documents', assetId] });
            setUploadForm({ name: '', type: 'MANUAL', file: null, notes: '' });
            setIsUploading(false);
            setUploadProgress(0);
        },
        onError: (error: any) => {
            toast.error(error?.message || "Failed to add document");
            setUploadProgress(0);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadForm({ ...uploadForm, file: e.target.files[0], name: e.target.files[0].name });
        }
    };

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    const documentTypes = [
        { value: 'MANUAL', label: 'Manual / Guide' },
        { value: 'INVOICE', label: 'Purchase Invoice' },
        { value: 'WARRANTY', label: 'Warranty Card' },
        { value: 'STNK', label: 'STNK' },
        { value: 'BPKB', label: 'BPKB' },
        { value: 'PHOTO', label: 'Asset Photo' },
        { value: 'MAINTENANCE_REPORT', label: 'Maintenance Report' },
        { value: 'TEST_ASSET', label: 'Test Asset Document' },
        { value: 'OTHER', label: 'Other' },
    ];

    return (
        <div className="space-y-6">
            <Card padding="lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Documents & Attachments</CardTitle>
                        <Button type="button" onClick={() => { setIsUploading(!isUploading); setUploadProgress(0); }} variant={isUploading ? "secondary" : "primary"}>
                            {isUploading ? "Cancel Upload" : "Add Document"}
                        </Button>
                    </div>
                </CardHeader>

                {isUploading && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-border mb-6 space-y-4">
                        <h3 className="font-semibold text-foreground">Upload New Document</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="File"
                                type="file"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                            />
                            <Select
                                label="Document Type"
                                value={uploadForm.type}
                                onChange={(val) => setUploadForm({ ...uploadForm, type: val })}
                                options={documentTypes}
                                placeholder="Select Type"
                            />
                            <Input
                                label="Document Name"
                                value={uploadForm.name}
                                onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                                placeholder="e.g. Purchase Invoice 2024"
                            />
                            <Textarea
                                label="Notes (Optional)"
                                value={uploadForm.notes}
                                onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })}
                                placeholder="Additional details..."
                            />
                        </div>

                        {/* Progress Bar Area */}
                        {(uploadMutation.isPending || uploadProgress > 0) && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{uploadProgress < 100 ? 'Uploading...' : 'Processing...'}</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button
                                type="button"
                                onClick={() => uploadMutation.mutate()}
                                disabled={!uploadForm.file || uploadMutation.isPending}
                                loading={uploadMutation.isPending}
                                leftIcon={<Upload size={16} />}
                            >
                                Upload & Save
                            </Button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents?.map((doc: AssetDocument) => (
                        <div key={doc.id} className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 bg-muted rounded-lg text-primary">
                                    {doc.mime_type?.startsWith('image/') ? (
                                        <img src={`http://localhost:8080${doc.file_path}`} alt={doc.name} className="w-10 h-10 object-cover rounded" />
                                    ) : (
                                        <FileText size={24} />
                                    )}
                                </div>
                                <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                            </div>

                            <h4 className="font-medium text-foreground truncate mb-1" title={doc.name}>{doc.name}</h4>
                            <p className="text-xs text-muted-foreground mb-4 truncate">{doc.notes || "No notes"}</p>

                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                                <span>{(doc.size_bytes ? (doc.size_bytes / 1024).toFixed(1) : 0)} KB</span>
                                <div className="flex gap-2">
                                    <a
                                        href={`http://localhost:8080${doc.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-muted rounded text-primary"
                                        title="View"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}

                    {(!documents || documents.length === 0) && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                            <FileText className="mx-auto mb-3 opacity-50" size={32} />
                            <p>No documents found</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
