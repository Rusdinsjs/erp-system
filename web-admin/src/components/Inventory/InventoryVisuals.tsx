import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, Loader2, Info } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { Badge } from '../ui';


interface InventoryVisualsProps {
    itemId: string;
    readOnly?: boolean;
}

export function InventoryVisuals({ itemId, readOnly = false }: InventoryVisualsProps) {
    const queryClient = useQueryClient();

    // Fetch documents (photos)
    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['inventory-documents', itemId],
        queryFn: () => inventoryApi.listDocuments(itemId),
        enabled: !!itemId,
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ file, type }: { file: File, type: string }) => {
            // 1. Upload file
            const uploadRes = await inventoryApi.uploadFile(file);
            
            // 2. Add document record
            return inventoryApi.addDocument(itemId, {
                name: `Photo ${type}`,
                type: type,
                file_path: uploadRes.file_path,
                mime_type: file.type,
                size_bytes: file.size,
                notes: `Visual documentation for ${type} side`
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-documents', itemId] });
        }
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadMutation.mutate({ file, type });
    };

    const photoTypes = [
        { key: 'FRONT', label: 'Tampak Depan' },
        { key: 'BACK', label: 'Tampak Belakang' },
        { key: 'LEFT', label: 'Tampak Kiri' },
        { key: 'RIGHT', label: 'Tampak Kanan' },
    ];

    const photos = documents.filter((doc: any) => 
        ['FRONT', 'BACK', 'LEFT', 'RIGHT'].includes(doc.type)
    );

    const isUploading = uploadMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="text-cyan-400" size={24} />
                    <h3 className="text-xl font-bold text-white">
                        {readOnly ? 'Visual Dokumentasi 4 Sisi' : 'Dokumentasi Visual (4 Sisi)'}
                    </h3>
                </div>
                {isLoading && <Loader2 className="animate-spin text-muted-foreground" size={20} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
                {photoTypes.map((type) => {
                    const photo = photos.find((p: any) => p.type === type.key);
                    
                    return (
                        <div key={type.key} className="space-y-3">
                            <div className="aspect-[4/3] rounded-2xl bg-slate-950/50 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-cyan-500/50 transition-all">
                                {photo ? (
                                    <>
                                        <img 
                                            src={photo.file_path} 
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
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{type.label}</span>
                                {photo && (
                                    <Badge variant="success" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                        OK
                                    </Badge>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex gap-3">
                    <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-cyan-200/70 leading-relaxed">
                        <strong>Tips:</strong> Pastikan pencahayaan cukup dan objek memenuhi frame. Foto yang jelas mempermudah proses audit aset dan klaim asuransi jika terjadi kerusakan.
                    </p>
                </div>
            )}
        </div>
    );
}
