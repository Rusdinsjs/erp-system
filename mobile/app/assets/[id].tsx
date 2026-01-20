import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, Card, Button, Avatar, List, Divider, useTheme, ActivityIndicator, Chip } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { api } from '../../api/client';

export default function AssetDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();

    // Mock Fetching Data
    // In real implementation: const { data, isLoading } = useQuery(...)
    const [isLoading, setIsLoading] = useState(true);
    const [asset, setAsset] = useState<any>(null);

    useEffect(() => {
        // Simulate API Call
        setTimeout(() => {
            setAsset({
                id: id,
                name: 'Excavator CAT-320',
                serial_number: 'CAT-320-XE-2024',
                status: 'Operational',
                location: 'Site A - Mining Area',
                category: 'Heavy Equipment',
                image_url: 'https://via.placeholder.com/300',
                details: {
                    hours: 5400,
                    last_service: '2025-12-01',
                    fuel_level: '75%'
                }
            });
            setIsLoading(false);
        }, 1000);
    }, [id]);

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 20, color: theme.colors.onSurfaceVariant }}>Fetching Asset Details...</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Asset Detail', headerBackTitle: 'Back' }} />
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

                {/* Asset Header Image */}
                <Card style={styles.headerCard}>
                    <Card.Cover source={{ uri: asset.image_url }} />
                    <Card.Title
                        title={asset.name}
                        subtitle={asset.serial_number}
                        titleVariant="headlineSmall"
                        left={(props) => <Avatar.Icon {...props} icon="excavator" />}
                    />
                    <Card.Content>
                        <View style={styles.chipRow}>
                            <Chip icon="check-circle" style={{ backgroundColor: theme.colors.primaryContainer }}>{asset.status}</Chip>
                            <Chip icon="tag" mode="outlined">{asset.category}</Chip>
                        </View>
                    </Card.Content>
                </Card>

                {/* Location Section */}
                <List.Section>
                    <List.Subheader>Current Location</List.Subheader>
                    <List.Item
                        title={asset.location}
                        description="Last updated: 2 hours ago"
                        left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.error} />}
                        right={props => <Button mode="text" onPress={() => Alert.alert('Update Location', 'GPS Updated!')}>Update</Button>}
                    />
                </List.Section>
                <Divider />

                {/* Operational Status */}
                <List.Section>
                    <List.Subheader>Operational Data</List.Subheader>
                    <List.Item
                        title="Hour Meter"
                        description={`${asset.details.hours} Hours`}
                        left={props => <List.Icon {...props} icon="clock-outline" />}
                    />
                    <List.Item
                        title="Fuel Level"
                        description={asset.details.fuel_level}
                        left={props => <List.Icon {...props} icon="gas-station" />}
                    />
                    <List.Item
                        title="Last Service"
                        description={asset.details.last_service}
                        left={props => <List.Icon {...props} icon="wrench" />}
                    />
                </List.Section>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <Button
                        mode="contained"
                        icon="clipboard-check"
                        style={styles.actionButton}
                        onPress={() => Alert.alert('P2H', 'Daily Inspection Form')}
                    >
                        Daily Check (P2H)
                    </Button>
                    <Button
                        mode="contained-tonal"
                        icon="wrench"
                        style={styles.actionButton}
                        onPress={() => Alert.alert('Service', 'Request Maintenance')}
                    >
                        Request Service
                    </Button>
                </View>

            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
    },
    headerCard: {
        margin: 16,
        marginBottom: 0,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        marginBottom: 10
    },
    actionContainer: {
        padding: 16,
        gap: 12,
        marginBottom: 30,
    },
    actionButton: {
        borderRadius: 8,
        paddingVertical: 5
    }
});
