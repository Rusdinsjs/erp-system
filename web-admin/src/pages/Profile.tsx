// Profile Page - Pure Tailwind
import { useState, useEffect, useRef } from "react";
import { Upload, User, Lock } from "lucide-react";
import { profileApi } from "../api/profile";
import { useAuthStore } from "../store/useAuthStore";
import {
    Button,
    Card,
    Input,
    LoadingOverlay,
    Tabs, TabsList, TabsTrigger, TabsContent,
    useToast,
} from "../components/ui";

export function Profile() {
    const user = useAuthStore((state) => state.user);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profileData, setProfileData] = useState({
        name: "",
        phone: "",
    });

    const [passwordData, setPasswordData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name,
                phone: user.phone || "",
            });
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (profileData.name.length < 2) {
            setErrors({ name: "Name too short" });
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            await profileApi.updateProfile(profileData);
            success("Profile updated successfully", "Success");
            refreshUser();
        } catch (error: any) {
            showError(error.response?.data?.error || "Failed to update profile", "Error");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (passwordData.new_password.length < 6) {
            newErrors.new_password = "Password must be at least 6 characters";
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            newErrors.confirm_password = "Passwords do not match";
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        setLoading(true);
        try {
            await profileApi.changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
            });
            success("Password changed successfully", "Success");
            setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
        } catch (error: any) {
            showError(error.response?.data?.error || "Failed to change password", "Error");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await profileApi.uploadAvatar(file);
            success("Avatar uploaded successfully", "Success");
            refreshUser();
        } catch (error: any) {
            showError(error.response?.data?.error || "Failed to upload avatar", "Error");
        } finally {
            setUploading(false);
        }
    };

    const avatarUrl = user?.avatar_url
        ? user.avatar_url.startsWith("http")
            ? `${user.avatar_url}?t=${Date.now()}`
            : `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${user.avatar_url}?t=${Date.now()}`
        : undefined;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar Section */}
                <Card padding="lg" className="lg:col-span-1">
                    <div className="flex flex-col items-center gap-4">
                        {/* Avatar */}
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center overflow-hidden">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-white">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="text-center">
                            <p className="text-lg font-semibold text-white">{user?.name}</p>
                            <p className="text-sm text-slate-400">{user?.role}</p>
                        </div>

                        {/* Upload Button */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            leftIcon={<Upload size={14} />}
                            loading={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Upload Avatar
                        </Button>
                    </div>
                </Card>

                {/* Forms Section */}
                <Card padding="lg" className="lg:col-span-2">
                    <Tabs defaultValue="general">
                        <TabsList>
                            <TabsTrigger value="general" icon={<User size={14} />}>
                                General Information
                            </TabsTrigger>
                            <TabsTrigger value="security" icon={<Lock size={14} />}>
                                Security
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="general">
                            <form onSubmit={handleUpdateProfile} className="relative space-y-4">
                                <LoadingOverlay visible={loading} />
                                <Input
                                    label="Email"
                                    value={user?.email || ''}
                                    disabled
                                    hint="Email cannot be changed"
                                />
                                <Input
                                    label="Full Name"
                                    placeholder="Your name"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    error={errors.name}
                                />
                                <Input
                                    label="Phone Number"
                                    placeholder="+62..."
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" loading={loading}>
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="security">
                            <form onSubmit={handleChangePassword} className="relative space-y-4">
                                <LoadingOverlay visible={loading} />
                                <Input
                                    label="Current Password"
                                    type="password"
                                    placeholder="Verify your current password"
                                    value={passwordData.old_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                    required
                                />
                                <Input
                                    label="New Password"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    error={errors.new_password}
                                    required
                                />
                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    placeholder="Repeat new password"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    error={errors.confirm_password}
                                    required
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" variant="danger" loading={loading}>
                                        Change Password
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
