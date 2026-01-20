import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Avatar, List, Divider, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const theme = useTheme();

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
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
                </View> // End header

                <View style={styles.section}>
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.primary }}>Settings</List.Subheader>
                        <List.Item
                            title="Change Password"
                            titleStyle={{ color: 'white' }}
                            left={() => <List.Icon icon="lock" color="white" />}
                            onPress={() => { }}
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
                    <Button
                        mode="outlined"
                        onPress={logout}
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error }}
                        icon="logout"
                    >
                        Logout
                    </Button>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        padding: 30,
        paddingTop: 60,
        backgroundColor: 'transparent',
    },
    name: {
        marginTop: 10,
        fontWeight: 'bold',
        color: 'white',
    },
    role: {
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    section: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    footer: {
        padding: 20,
        marginTop: 20,
    }
});
