import { useState, useRef, type ChangeEvent } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { api } from '../api/http';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from './ui';

interface AvatarUploadProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarUpload({ className = '', size = 'md' }: AvatarUploadProps) {
    const { user, refreshUser } = useAuthStore();
    const { success, error: showError } = useToast();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showError('File size too large (max 2MB)', 'Upload Error');
            return;
        }

        // Validate type
        if (!file.type.startsWith('image/')) {
            showError('Only image files are allowed', 'Upload Error');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // POST /api/me/avatar handles upload AND DB update
            // Returns: ApiResponse<User> { success: true, data: User }
            const res = await api.post<{ success: boolean; data: any }>('/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update local state with the returned user data
            if (res.data.success && res.data.data) {
                // If refreshUser logic relies on /me, calling it is safe. 
                // But we can also manually update if needed.
                // For now, let's trust refreshUser or just force a reload if needed.
                await refreshUser();
                success('Avatar updated successfully', 'Success');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err: any) {
            console.error(err);
            showError(err.response?.data?.message || 'Failed to update avatar', 'Error'); // Fixed message
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;

        const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';

        // Handle paths that might be missing /api prefix (legacy/buggy uploads)
        if (path.startsWith('/uploads')) {
            return `${baseUrl}/api${path}`;
        }

        return `${baseUrl}${path}`;
    };

    return (
        <div className={`relative group ${className}`}>
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-md`}>
                {user?.avatar_url ? (
                    <img
                        src={getImageUrl(user.avatar_url)}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=0D8ABC&color=fff`;
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl bg-slate-800">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                )}

                {/* Overlay for upload */}
                <div
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <RefreshCw className="animate-spin text-white" size={size === 'sm' ? 12 : 16} />
                    ) : (
                        <Camera className="text-white" size={size === 'sm' ? 12 : 16} />
                    )}
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
}
