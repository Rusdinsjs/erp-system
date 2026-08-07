import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, Loader2, Info } from 'lucide-react';
import { assetApi } from '../../api/assets';
import { getImageUrl } from '../../utils/image';


interface AssetVisualsProps {
    assetId: string;
    readOnly?: boolean;
}

export function AssetVisuals({ assetId, readOnly = false }: AssetVisualsProps) {
    const queryClient = useQueryClient();
    const { data: documents, isLoading } = useQuery({
        queryKey: ['asset-documents', assetId],
        queryFn: () => assetApi.getDocuments(assetId)
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ file, side }: { file: File, side: string }) => {
            const fileData = await assetApi.uploadFile(file);
            return assetApi.addDocument(assetId, {
                name: `Visual ${side}`,
                type: side, // Use FRONT, BACK, LEFT, RIGHT as type
                file_path: fileData.url,
                mime_type: fileData.content_type,
                size_bytes: fileData.size,
                notes: `Uploaded via 4-sided visual menu`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asset-documents', assetId] });
        }
    });

    const getPhoto = (side: string) => {
        return documents?.find((doc: any) => doc.type === side);
    };

    const photoTypes = [
        { key: 'FRONT', label: 'Tampak Depan' },
        { key: 'BACK', label: 'Tampak Belakang' },
        { key: 'LEFT', label: 'Tampak Kiri' },
        { key: 'RIGHT', label: 'Tampak Kanan' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: string) => {
        if (e.target.files && e.target.files[0]) {
            uploadMutation.mutate({ file: e.target.files[0], side });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="text-cyan-400" size={24} />
                    <h3 className="text-xl font-bold text-foreground">
                        {readOnly ? 'Visual Dokumentasi 4 Sisi' : 'Input Visual 4 Sisi'}
                    </h3>
                </div>
                {isLoading && <Loader2 className="animate-spin text-muted-foreground" size={20} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
                {photoTypes.map((type) => {
                    const photo = getPhoto(type.key);
                    const isUploading = uploadMutation.isPending && (uploadMutation.variables as any)?.side === type.key;

                    return (
                        <div key={type.key} className="space-y-3">
                            <div className="aspect-[4/3] rounded-2xl bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group hover:border-cyan-500/50 transition-all">
                                {photo ? (
                                    <>
                                        <img 
                                            src={getImageUrl(photo.file_path)} 

                                            alt={type.label} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button 
                                                type="button"
                                                className="px-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-all"
                                                onClick={() => window.open(photo.file_path, '_blank')}
                                            >
                                                Perbesar
                                            </button>
                                            {!readOnly && (
                                                <label className="cursor-pointer">
                                                    <span className="px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                                                        Ganti Foto
                                                    </span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, type.key)}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                        {!readOnly ? (
                                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                                {isUploading ? (
                                                    <Loader2 size={32} className="animate-spin text-cyan-500" />
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3 group-hover:bg-cyan-500/20 transition-colors">
                                                            <Upload className="text-cyan-400" size={24} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-medium text-center">Klik untuk Upload<br/>{type.label}</p>
                                                    </>
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e, type.key)}
                                                    disabled={isUploading}
                                                />
                                            </label>
                                        ) : (
                                            <>
                                                <Camera className="text-muted-foreground/20" size={40} />
                                                <p className="text-[10px] text-muted-foreground/40 font-medium mt-2">Belum ada foto</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{type.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {!readOnly && (
                <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex items-start gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
                        <Info size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">Instruksi Pengambilan Foto</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Silakan unggah foto aset dari empat sudut yang berbeda untuk keperluan audit dan asuransi. 
                            Pastikan seluruh bagian aset terlihat jelas dan tidak terpotong. Sistem akan menyimpan foto ini secara terpisah dari dokumen manual/invoice.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
