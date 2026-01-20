import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator, FAB, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { timesheetApi } from '../../api/timesheet';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { rentalsApi } from '../../api/rentals';
import { LinearGradient } from 'expo-linear-gradient';

const StatusChip = ({ status }: { status: string }) => {
    let color = '#9ca3af'; // gray-400
    let icon = 'clock-outline';

    switch (status) {
        case 'approved':
            color = '#4ade80'; // green-400
            icon = 'check-circle';
            break;
        case 'verified':
            color = '#60a5fa'; // blue-400
            icon = 'check';
            break;
        case 'submitted':
            color = '#fbbf24'; // amber-400
            icon = 'send';
            break;
        case 'rejected':
            color = '#f87171'; // red-400
            icon = 'alert-circle';
            break;
        case 'draft':
            color = '#9ca3af';
            icon = 'pencil';
            break;
    }

    return (
        <Chip
            icon={icon}
            style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: color }}
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

    const { data: rentals } = useQuery({ queryKey: ['active-rentals'], queryFn: rentalsApi.listActive });

    const { data: timesheets, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['timesheets', rentals],
        queryFn: async () => {
            if (!rentals || (rentals as any[]).length === 0) return [];

            const promises = (rentals as any[]).map(async (rental: any) => {
                try {
                    const data = await timesheetApi.listByRental(rental.id);
                    return data.map((ts: any) => ({ ...ts, asset_name: rental.asset_name }));
                } catch (e) {
                    console.error(`Failed to fetch timesheets for ${rental.rental_number}`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            return results.flat().sort((a: any, b: any) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime());
        },
        enabled: !!rentals && (rentals as any[]).length > 0
    });

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ color: 'white', fontWeight: 'bold' }}>{item.asset_name || 'Unknown Asset'}</Text>
                        <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {format(parseISO(item.work_date), 'dd MMM yyyy')} • {item.start_time?.substring(0, 5)} - {item.end_time?.substring(0, 5)}
                        </Text>
                    </View>
                    <StatusChip status={item.status} />
                </View>

                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.5)' }}>Operating</Text>
                        <Text variant="bodyLarge" style={{ color: 'white' }}>{item.operating_hours} hrs</Text>
                    </View>
                    <View>
                        <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.5)' }}>HM Start</Text>
                        <Text variant="bodyMedium" style={{ color: 'white' }}>{item.hm_km_start}</Text>
                    </View>
                    <View>
                        <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.5)' }}>HM End</Text>
                        <Text variant="bodyMedium" style={{ color: 'white' }}>{item.hm_km_end}</Text>
                    </View>
                </View>

                {item.checker_notes && (
                    <Text variant="bodySmall" style={{ marginTop: 10, fontStyle: 'italic', opacity: 0.7, color: 'rgba(255,255,255,0.8)' }}>
                        "{item.checker_notes}"
                    </Text>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
                <View style={styles.header}>
                    <Text variant="headlineSmall" style={{ color: 'white', fontWeight: 'bold' }}>History</Text>
                    <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)' }}>Recent submissions</Text>
                </View>

                {isLoading && !isRefetching ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
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
                                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No timesheet history found.</Text>
                                <Button mode="text" onPress={() => router.push('/(tabs)/input')} textColor={theme.colors.primary}>
                                    Create New Entry
                                </Button>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 10,
        backgroundColor: 'transparent',
    },
    list: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderColor: 'rgba(255,255,255,0.1)',
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
