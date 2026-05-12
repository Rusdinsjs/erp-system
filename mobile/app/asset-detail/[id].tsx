import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, Card, Button, Avatar, List, Divider, useTheme, ActivityIndicator, Chip } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetApi } from '../../api/assets';

export default function AssetDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();

    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset', id],
        queryFn: () => assetApi.getAsset(id as string),
        enabled: !!id
    });

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 20, color: theme.colors.onSurfaceVariant }}>Fetching Asset Details...</Text>
            </View>
        );
    }

    if (error || !asset) {
        console.error('Asset Detail Error:', error);
        const errorMessage = (error as any)?.message || 'Unknown error';
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 10 }}>Failed to load asset details</Text>
                <Text style={{ color: theme.colors.secondary, fontSize: 12, marginBottom: 20 }}>{errorMessage}</Text>
                <Button onPress={() => router.back()} style={{ marginTop: 20 }}>Go Back</Button>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Asset Detail', headerBackTitle: 'Back' }} />
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

                {/* Asset Header Image */}
                <Card style={styles.headerCard}>
                    {/* Placeholder image for now, or asset image if available */}
                    <Card.Cover source={{ uri: 'https://via.placeholder.com/300' }} />
                    <Card.Title
                        title={asset.name}
                        subtitle={asset.asset_code}
                        titleVariant="headlineSmall"
                        left={(props) => <Avatar.Icon {...props} icon="excavator" />}
                    />
                    <Card.Content>
                        <View style={styles.chipRow}>
                            <Chip icon="check-circle" style={{ backgroundColor: theme.colors.primaryContainer }}>{asset.status}</Chip>
                            <Chip icon="tag" mode="outlined">{asset.category_name || 'Asset'}</Chip>
                        </View>
                    </Card.Content>
                </Card>

                {/* Location Section */}
                <List.Section>
                    <List.Subheader>Current Location</List.Subheader>
                    <List.Item
                        title={asset.location_name || 'Unassigned'}
                        description="Location tracked via system"
                        left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.error} />}
                        right={props => <Button mode="text" onPress={() => Alert.alert('Update Location', 'Feature coming soon!')}>Update</Button>}
                    />
                </List.Section>
                <Divider />

                {/* Operational Status */}
                {asset.vehicle_details && (
                    <List.Section>
                        <List.Subheader>Operational Data</List.Subheader>
                        <List.Item
                            title="Hour Meter / Odometer"
                            description={`${asset.vehicle_details.hour_meter || asset.vehicle_details.odometer_last || 0} ${asset.vehicle_details.hour_meter ? 'Hours' : 'KM'}`}
                            left={props => <List.Icon {...props} icon="clock-outline" />}
                        />
                        <List.Item
                            title="Fuel Type"
                            description={asset.vehicle_details.fuel_type || 'N/A'}
                            left={props => <List.Icon {...props} icon="gas-station" />}
                        />
                        <List.Item
                            title="License Plate"
                            description={asset.vehicle_details.license_plate || 'N/A'}
                            left={props => <List.Icon {...props} icon="card-account-details-outline" />}
                        />
                    </List.Section>
                )}

                {/* General Details if no vehicle details */}
                <List.Section>
                    <List.Subheader>General Info</List.Subheader>
                    <List.Item
                        title="Brand / Model"
                        description={`${asset.brand || '-'} / ${asset.model || '-'}`}
                        left={props => <List.Icon {...props} icon="information-outline" />}
                    />
                </List.Section>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <Button
                        mode="contained"
                        icon="clipboard-check"
                        style={styles.actionButton}
                        onPress={() => Alert.alert('P2H', 'Daily Inspection Form coming soon')}
                    >
                        Daily Check (P2H)
                    </Button>
                    <Button
                        mode="contained-tonal"
                        icon="wrench"
                        style={styles.actionButton}
                        onPress={() => Alert.alert('Service', 'Request Maintenance coming soon')}
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
