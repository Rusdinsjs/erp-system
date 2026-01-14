import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { timesheetApi } from '../../api/timesheet';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { rentalsApi } from '../../api/rentals';

const StatusChip = ({ status }: { status: string }) => {
    let color = '#757575'; // default gray
    let icon = 'clock-outline';

    switch (status) {
        case 'approved':
            color = '#4CAF50'; // green
            icon = 'check-circle';
            break;
        case 'verified':
            color = '#2196F3'; // blue
            icon = 'check';
            break;
        case 'submitted':
            color = '#FF9800'; // orange
            icon = 'send';
            break;
        case 'rejected':
            color = '#F44336'; // red
            icon = 'alert-circle';
            break;
        case 'draft':
            color = '#9E9E9E';
            icon = 'pencil';
            break;
    }

    return (
        <Chip
            icon={icon}
            style={{ backgroundColor: 'transparent', borderColor: color }}
            textStyle={{ color: color }}
            mode="outlined"
            compact
        >
            {status.toUpperCase()}
        </Chip>
    );
};

export default function HistoryScreen() {
    const theme = useTheme();

    // Fix: Explicitly type or allow implicit any for rentals data structure
    const { data: rentals } = useQuery({ queryKey: ['active-rentals'], queryFn: rentalsApi.listActive });

    const { data: timesheets, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['timesheets', rentals],
        queryFn: async () => {
            if (!rentals || (rentals as any[]).length === 0) return [];

            const promises = (rentals as any[]).map(async (rental: any) => {
                try {
                    // We need to implement listByRental in api/timesheet.ts correct endpoint: /rentals/:id/timesheets
                    const data = await timesheetApi.listByRental(rental.id);
                    // Inject asset name
                    return data.map((ts: any) => ({ ...ts, asset_name: rental.asset_name }));
                } catch (e) {
                    console.error(`Failed to fetch timesheets for ${rental.rental_number}`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            // Flatten and sort by date desc
            return results.flat().sort((a: any, b: any) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime());
        },
        enabled: !!rentals && (rentals as any[]).length > 0
    });

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} mode="elevated">
            <Card.Content>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium">{item.asset_name || 'Unknown Asset'}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                            {format(parseISO(item.work_date), 'dd MMM yyyy')} • {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
                        </Text>
                    </View>
                    <StatusChip status={item.status} />
                </View>

                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text variant="labelSmall">Operating</Text>
                        <Text variant="bodyLarge">{item.operating_hours} hrs</Text>
                    </View>
                    <View>
                        <Text variant="labelSmall">HM Start</Text>
                        <Text variant="bodyMedium">{item.hm_km_start}</Text>
                    </View>
                    <View>
                        <Text variant="labelSmall">HM End</Text>
                        <Text variant="bodyMedium">{item.hm_km_end}</Text>
                    </View>
                </View>

                {item.checker_notes && (
                    <Text variant="bodySmall" style={{ marginTop: 10, fontStyle: 'italic', opacity: 0.7 }}>
                        "{item.checker_notes}"
                    </Text>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall">History</Text>
                <Text variant="bodyMedium">Recent submissions</Text>
            </View>

            {isLoading && !isRefetching ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={timesheets}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onRefresh={refetch}
                    refreshing={isRefetching}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text>No timesheet history found.</Text>
                            <Button mode="text" onPress={() => router.push('/(tabs)/input')}>
                                Create New Entry
                            </Button>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

import { Button } from 'react-native-paper'; // Missing import fix

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: 'white',
        paddingBottom: 10,
    },
    list: {
        padding: 16,
    },
    card: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    center: {
        padding: 40,
        alignItems: 'center',
    }
});
