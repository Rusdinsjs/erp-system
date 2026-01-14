import { View, StyleSheet } from 'react-native';
import { Button, Text, Avatar, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text size={80} label={user?.name?.substring(0, 2).toUpperCase() || 'US'} />
                <Text variant="headlineSmall" style={styles.name}>{user?.name}</Text>
                <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{user?.email}</Text>
                <Text variant="bodyMedium" style={styles.role}>{user?.role}</Text>
            </View>

            <List.Section>
                <List.Subheader>Settings</List.Subheader>
                <List.Item
                    title="Change Password"
                    left={() => <List.Icon icon="lock" />}
                    onPress={() => { }}
                />
                <Divider />
                <List.Item
                    title="App Version"
                    description="1.0.0 (Expo)"
                    left={() => <List.Icon icon="information" />}
                />
            </List.Section>

            <View style={styles.footer}>
                <Button mode="contained" buttonColor="red" onPress={logout}>
                    Logout
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#f0f0f0',
    },
    name: {
        marginTop: 10,
        fontWeight: 'bold',
    },
    role: {
        opacity: 0.6,
        textTransform: 'uppercase',
    },
    footer: {
        padding: 20,
        marginTop: 'auto',
    }
});
