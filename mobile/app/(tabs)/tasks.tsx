import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, useTheme, FAB, SegmentedButtons, Avatar, Badge, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workOrderApi, WorkOrder } from '../../api/workOrder';
import { LinearGradient } from 'expo-linear-gradient';

function formatDue(dateStr: string | null): string {
    if (!dateStr) return '—';
    const due = new Date(dateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `in ${diffDays}d`;
}

function mapStatusGroup(status: string): string {
    const s = status.toLowerCase();
    if (['pending', 'approved', 'assigned'].includes(s)) return 'pending';
    if (['in_progress', 'started'].includes(s)) return 'in_progress';
    if (['completed', 'verified', 'finalized', 'cancelled'].includes(s)) return 'completed';
    return 'pending';
}

function getPriorityColor(priority: string | null): string {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high' || p === 'critical') return '#ef4444';
    if (p === 'medium') return '#eab308';
    return '#6b7280';
}

export default function TasksScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [filter, setFilter] = useState('pending');

    const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['work-orders'],
        queryFn: workOrderApi.listAll,
        refetchInterval: 30000,
    });

    const filteredOrders = orders.filter((o: WorkOrder) => mapStatusGroup(o.status) === filter);

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            <View style={styles.filterContainer}>
                <SegmentedButtons
                    value={filter}
                    onValueChange={setFilter}
                    buttons={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Done' },
                    ]}
                    theme={{ colors: { secondaryContainer: theme.colors.primary, onSecondaryContainer: 'white' } }}
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="white" />
                }
            >
                {isLoading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : filteredOrders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No work orders found</Text>
                    </View>
                ) : (
                    filteredOrders.map((order: WorkOrder) => (
                        <Card
                            key={order.id}
                            style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]}
                            mode="outlined"
                            onPress={() => router.push(`/assets/${order.asset_id}`)}
                        >
                            <Card.Title
                                title={order.problem_description || order.wo_type || order.wo_number}
                                titleStyle={{ color: 'white', fontWeight: 'bold' }}
                                subtitle={order.asset_name || 'Unknown Asset'}
                                subtitleStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                left={(props) => <Avatar.Icon {...props} icon="clipboard-list" style={{ backgroundColor: theme.colors.primary }} color="white" />}
                                right={(props) => (
                                    <View style={{ marginRight: 16 }}>
                                        {order.priority && (
                                            <Badge style={{ backgroundColor: getPriorityColor(order.priority) }}>
                                                {order.priority.toUpperCase()}
                                            </Badge>
                                        )}
                                    </View>
                                )}
                            />
                            <Card.Content>
                                <View style={styles.row}>
                                    <Chip
                                        icon="clock-outline"
                                        mode="outlined"
                                        textStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}
                                        style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        {formatDue(order.due_date || order.scheduled_date)}
                                    </Chip>
                                    <Chip
                                        icon="pound"
                                        mode="outlined"
                                        textStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}
                                        style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}
                                    >
                                        {order.wo_number}
                                    </Chip>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/(tabs)/input')}
                color="white"
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterContainer: {
        padding: 16,
        paddingTop: 60,
        paddingBottom: 8,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 0,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 110,
    },
});
