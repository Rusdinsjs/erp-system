import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip, useTheme, FAB, SegmentedButtons, Avatar, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function TasksScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [filter, setFilter] = useState('pending');

    const tasks = [
        { id: 'WO-101', title: 'Excavator P2H Check', asset: 'Excavator CAT-320', status: 'pending', priority: 'high', due: 'Today' },
        { id: 'WO-102', title: 'Hydraulic Leak Fix', asset: 'Dump Truck DT-05', status: 'in_progress', priority: 'medium', due: 'Tomorrow' },
        { id: 'WO-103', title: 'Weekly Maintenance', asset: 'Genset 500kVA', status: 'completed', priority: 'low', due: 'Yesterday' },
    ];

    const filteredTasks = tasks.filter(t => t.status === filter);

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            {/* Header filter */}
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
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} // Subtle glass effect for the toggle
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {filteredTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No tasks found</Text>
                    </View>
                ) : (
                    filteredTasks.map((task) => (
                        <Card key={task.id} style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined" onPress={() => console.log('Open Task', task.id)}>
                            <Card.Title
                                title={task.title}
                                titleStyle={{ color: 'white', fontWeight: 'bold' }}
                                subtitle={task.asset}
                                subtitleStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                left={(props) => <Avatar.Icon {...props} icon="clipboard-list" style={{ backgroundColor: theme.colors.primary }} color="white" />}
                                right={(props) => (
                                    <View style={{ marginRight: 16 }}>
                                        {task.priority === 'high' && <Badge style={{ backgroundColor: theme.colors.error }}>High</Badge>}
                                    </View>
                                )}
                            />
                            <Card.Content>
                                <View style={styles.row}>
                                    <Chip icon="clock-outline" mode="outlined" textStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }} style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}>{task.due}</Chip>
                                    <Chip icon="pound" mode="outlined" textStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }} style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}>{task.id}</Chip>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            {/* FAB to create new task (if allowed) */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => console.log('Create new task')}
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
        bottom: 110, // Raised further as requested
    },
});
