import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Avatar, Button, useTheme, IconButton, List } from 'react-native-paper';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function ApprovalScreen() {
    const theme = useTheme();
    const router = useRouter();

    // Mock Approval Data
    const [approvals, setApprovals] = useState([
        { id: 'REQ-001', type: 'Purchase Order', requester: 'John Doe', amount: 'Rp 5.000.000', description: 'Sparepart Excavator', status: 'pending' },
        { id: 'REQ-002', type: 'Leave Request', requester: 'Jane Smith', amount: '3 Days', description: 'Annual Leave', status: 'pending' },
        { id: 'REQ-003', type: 'Rental', requester: 'PT. Karya Beton', amount: 'Rp 25.000.000', description: 'Excavator Rental for 1 Month', status: 'pending' },
    ]);

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        Alert.alert(
            `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`,
            `Are you sure you want to ${action} this request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: action === 'reject' ? 'destructive' : 'default',
                    onPress: () => {
                        // Remove from list for demo
                        setApprovals(prev => prev.filter(a => a.id !== id));
                    }
                }
            ]
        );
    };

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text variant="headlineSmall" style={{ color: 'white', fontWeight: 'bold' }}>Approvals</Text>
                <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)' }}>{approvals.length} Pending Requests</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {approvals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Avatar.Icon size={64} icon="check-all" style={{ backgroundColor: theme.colors.primaryContainer }} />
                        <Text variant="titleMedium" style={{ marginTop: 16, color: 'white' }}>All Caught Up!</Text>
                        <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)' }}>No pending approvals.</Text>
                    </View>
                ) : (
                    approvals.map((item) => (
                        <Card key={item.id} style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                            <Card.Title
                                title={item.type}
                                titleStyle={{ color: 'white', fontWeight: 'bold' }}
                                subtitle={`By ${item.requester} • ${item.amount}`}
                                subtitleStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                left={(props) => <Avatar.Icon {...props} icon="file-document-outline" style={{ backgroundColor: theme.colors.secondaryContainer }} />}
                                right={(props) => <Text {...props} style={{ marginRight: 16, color: theme.colors.tertiary, fontWeight: 'bold' }}>{item.id}</Text>}
                            />
                            <Card.Content>
                                <Text variant="bodyMedium" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.9)' }}>
                                    {item.description}
                                </Text>
                            </Card.Content>
                            <Card.Actions style={{ justifyContent: 'flex-end', paddingTop: 8 }}>
                                <Button
                                    mode="outlined"
                                    textColor={theme.colors.error}
                                    style={{ borderColor: theme.colors.error }}
                                    onPress={() => handleAction(item.id, 'reject')}
                                >
                                    Reject
                                </Button>
                                <Button
                                    mode="contained"
                                    buttonColor={theme.colors.primary}
                                    onPress={() => handleAction(item.id, 'approve')}
                                >
                                    Approve
                                </Button>
                            </Card.Actions>
                        </Card>
                    ))
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        paddingTop: 60, // Adjust for status bar
        paddingBottom: 8,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 8,
    },
    card: {
        marginBottom: 16,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    }
});
