import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Avatar, List, Divider, useTheme, TextInput, Modal, Portal } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { authApi } from '../../api/auth';

export default function ProfileScreen() {
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) return Alert.alert('Error', 'Both fields required');
        setLoading(true);
        try {
            await authApi.changePassword(oldPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully');
            setVisible(false);
            setOldPassword('');
            setNewPassword('');
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || e.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Avatar.Text
                        size={80}
                        label={user?.name?.substring(0, 2).toUpperCase() || 'US'}
                        style={{ backgroundColor: theme.colors.primary, marginBottom: 16 }}
                        color="white"
                    />
                    <Text variant="headlineSmall" style={styles.name}>{user?.name}</Text>
                    <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.email}</Text>
                    <Text variant="labelLarge" style={styles.role}>{user?.role}</Text>
                </View>

                <View style={styles.section}>
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.primary }}>Settings</List.Subheader>
                        <List.Item
                            title="Change Password"
                            titleStyle={{ color: 'white' }}
                            left={() => <List.Icon icon="lock" color="white" />}
                            onPress={() => setVisible(true)}
                        />
                        <Divider style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        <List.Item
                            title="App Version"
                            description="1.0.0 (Expo)"
                            titleStyle={{ color: 'white' }}
                            descriptionStyle={{ color: 'rgba(255,255,255,0.5)' }}
                            left={() => <List.Icon icon="information" color="white" />}
                        />
                    </List.Section>
                </View>

                <View style={styles.footer}>
                    <Button mode="outlined" onPress={logout} textColor={theme.colors.error} style={{ borderColor: theme.colors.error }} icon="logout">
                        Logout
                    </Button>
                </View>
            </ScrollView>

            <Portal>
                <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ marginBottom: 16, color: '#1e293b' }}>Change Password</Text>
                    <TextInput label="Current Password" value={oldPassword} onChangeText={setOldPassword} secureTextEntry mode="outlined" style={styles.input} />
                    <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry mode="outlined" style={styles.input} />
                    <Button mode="contained" onPress={handleChangePassword} loading={loading} disabled={!oldPassword || !newPassword}>
                        Confirm
                    </Button>
                    <Button onPress={() => setVisible(false)} style={{ marginTop: 8 }} textColor={theme.colors.secondary}>Cancel</Button>
                </Modal>
            </Portal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 40 },
    header: { alignItems: 'center', padding: 30, paddingTop: 60, backgroundColor: 'transparent' },
    name: { marginTop: 10, fontWeight: 'bold', color: 'white' },
    role: { color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: 4 },
    section: { backgroundColor: 'rgba(30, 41, 59, 0.6)', marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    footer: { padding: 20, marginTop: 20 },
    modal: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 },
    input: { marginBottom: 12, backgroundColor: 'white' },
});
