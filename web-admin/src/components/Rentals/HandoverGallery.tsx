import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { rentalApi } from '../../api/rental';
import { uploadApi } from '../../api/upload';
import { useToast, LoadingOverlay } from '../ui';

interface HandoverGalleryProps {
    rentalId: string;
    handoverId: string; // The specific handover to attach photos to
    readOnly?: boolean;
}

export function HandoverGallery({ rentalId, handoverId, readOnly = false }: HandoverGalleryProps) {
    const [uploading, setUploading] = useState(false);
    const { success, error: showError } = useToast();
    const queryClient = useQueryClient();

    // Fetch handovers to find the specific one and its photos
    // Ideally we would have a direct `getHandover` endpoint, but `getHandovers` (list) works for now.
    const { data: handovers, isLoading } = useQuery({
        queryKey: ['rental-handovers', rentalId],
        queryFn: () => rentalApi.getHandovers(rentalId),
        enabled: !!rentalId
    });

    const handover = handovers?.find((h: any) => h.id === handoverId);
    // Parse photos if they are in JSON string format or JSON object
    const photos: any[] = Array.isArray(handover?.photos) ? handover.photos : [];

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            // 1. Upload File
            const uploadRes = await uploadApi.upload(file);
            // 2. Add to Handover
            return rentalApi.addHandoverPhoto(handoverId, uploadRes.url, undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-handovers', rentalId] });
            success("Photo uploaded successfully");
            setUploading(false);
        },
        onError: (err) => {
            console.error(err);
            showError("Failed to upload photo");
            setUploading(false);
        }
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            uploadMutation.mutate(e.target.files[0]);
            // Reset input
            e.target.value = '';
        }
    };

    if (isLoading) return <LoadingOverlay visible />;
    if (!handover) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                    Photos ({photos.length})
                </h3>
                {!readOnly && (
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`upload-photo-${handoverId}`}
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                        <label
                            htmlFor={`upload-photo-${handoverId}`}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md
                                bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer
                                transition-colors border border-emerald-500/20
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                            Add Photo
                        </label>
                    </div>
                )}
            </div>

            {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {photos.map((photo: any, index: number) => (
                        <div key={index} className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                            <img
                                src={photo.url}
                                alt={photo.description || `Evidence ${index + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a
                                    href={photo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-foreground bg-background/80 p-2 rounded-full hover:bg-background"
                                >
                                    <Upload size={16} className="rotate-180" /> {/* View/Download icon */}
                                </a>
                            </div>
                            {photo.added_at && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-muted-foreground truncate text-center">
                                    {new Date(photo.added_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
                    <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No photos recorded</p>
                </div>
            )}
        </div>
    );
}
