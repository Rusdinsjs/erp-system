// Profile Page - Pure Tailwind
import { useState, useEffect } from "react";
import { User, Lock, Shield } from "lucide-react";
import { profileApi } from "../api/profile";
import { useAuthStore } from "../store/useAuthStore";
import { AvatarUpload } from "../components/AvatarUpload";
import {
    Button,
    Card,
    Input,
    LoadingOverlay,
    Tabs, TabsList, TabsTrigger, TabsContent,
    useToast,
} from "../components/ui";

export default function Profile() {
    const user = useAuthStore((state) => state.user);
    const refreshUser = useAuthStore((state) => state.refreshUser);
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar Section */}
                <Card padding="lg" className="lg:col-span-1">
                    <div className="flex flex-col items-center gap-4">
                        <AvatarUpload size="xl" />

                        {/* User Info */}
                        <div className="text-center">
                            <p className="text-lg font-semibold text-foreground">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.role}</p>
                        </div>
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
                            <TabsTrigger value="employment" icon={<Shield size={14} />}>
                                Kepegawaian & Hak Akses
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

                        <TabsContent value="employment">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-accent/30 border border-border space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Jabatan / Role Utama</p>
                                        <p className="text-base font-semibold text-foreground">{user?.role || 'Staff'}</p>
                                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-primary/20 text-primary font-mono">
                                            Level {user?.role_level ?? 5}
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-accent/30 border border-border space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Departemen</p>
                                        <p className="text-base font-semibold text-foreground">{user?.department || 'General / Unassigned'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground">Grup Akses Aset (Asset Restriction)</h4>
                                    <div className="p-3 rounded-lg bg-card border border-border text-sm text-muted-foreground">
                                        {user?.allowed_asset_group ? (
                                            <span className="font-mono text-primary font-medium">{user.allowed_asset_group}</span>
                                        ) : (
                                            <span>Semua Grup Aset (Tidak Ada Pembatasan)</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground">Daftar Wewenang Sistem (Permissions Matrix)</h4>
                                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-3 rounded-lg bg-card border border-border">
                                        {user?.permissions && user.permissions.length > 0 ? (
                                            user.permissions.map((perm, idx) => (
                                                <span key={idx} className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground font-mono">
                                                    {perm}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">
                                                {user?.role_level && user.role_level <= 2 ? 'Super Admin / Full Access Unrestricted' : 'Viewer / Basic Access Only'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
