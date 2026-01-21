import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import {
    Text,
    Card,
    Button,
    useTheme,
    ActivityIndicator,
    SegmentedButtons,
    Chip,
    IconButton,
    Portal,
    Dialog,
    TextInput
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi, ApprovalRequest } from '../../api/approval';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function ApprovalScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('pending');
    const [filterType, setFilterType] = useState('all');

    // Dialog State
    const [visible, setVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
    const [notes, setNotes] = useState('');

    const { data: pendingRequests = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
        queryKey: ['approvals', 'pending'],
        queryFn: approvalApi.listPending,
        enabled: activeTab === 'pending',
    });

    const { data: myRequests = [], isLoading: loadingMy, refetch: refetchMy } = useQuery({
        queryKey: ['approvals', 'my-requests'],
        queryFn: approvalApi.listMyRequests,
        enabled: activeTab === 'my_requests',
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes?: string }) => approvalApi.approve(id, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            hideDialog();
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes: string }) => approvalApi.reject(id, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            hideDialog();
        },
    });

    const onRefresh = () => {
        if (activeTab === 'pending') refetchPending();
        else refetchMy();
    };

    const showDialog = (request: ApprovalRequest, type: 'approve' | 'reject') => {
        setSelectedRequest(request);
        setActionType(type);
        setNotes('');
        setVisible(true);
    };

    const hideDialog = () => {
        setVisible(false);
        setSelectedRequest(null);
    };

    const handleSubmit = () => {
        if (!selectedRequest) return;
        if (actionType === 'approve') {
            approveMutation.mutate({ id: selectedRequest.id, notes });
        } else {
            rejectMutation.mutate({ id: selectedRequest.id, notes });
        }
    };

    const currentData = activeTab === 'pending' ? pendingRequests : myRequests;
    const filteredData = filterType === 'all'
        ? currentData
        : currentData.filter(r => r.resource_type === filterType);

    const getIcon = (type: string) => {
        switch (type) {
            case 'lifecycle_transition': return 'refresh';
            case 'work_order': return 'tools';
            case 'asset': return 'clipboard-list';
            case 'rental_request': return 'truck';
            case 'timesheet_verification': return 'clock-check-outline';
            default: return 'help-circle';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED_L1': return '#4ade80'; // Green
            case 'APPROVED_L2': return '#22c55e'; // Darker Green
            case 'REJECTED': return '#f87171'; // Red
            case 'PENDING': return '#fbbf24'; // Amber
            default: return 'rgba(255,255,255,0.7)';
        }
    };

    const inputTheme = {
        colors: {
            onSurfaceVariant: 'rgba(255,255,255,0.7)',
            onSurface: '#1e293b', // Dialog text should be dark
            primary: theme.colors.primary,
            background: 'white',
        }
    };

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <View style={styles.header}>
                <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold' }}>Approval Center</Text>
                {activeTab === 'pending' && pendingRequests.length > 0 && (
                    <Chip icon="bell-ring" style={styles.countChip} textStyle={{ color: '#0f172a' }}>{pendingRequests.length} Pending</Chip>
                )}
            </View>

            <SegmentedButtons
                value={activeTab}
                onValueChange={setActiveTab}
                buttons={[
                    { value: 'pending', label: 'Pending', icon: 'clock-outline' },
                    { value: 'my_requests', label: 'My Requests', icon: 'account' },
                ]}
                theme={{ colors: { secondaryContainer: theme.colors.primary, onSecondaryContainer: 'white', outline: 'rgba(255,255,255,0.2)' } }}
                style={styles.tabs}
            />

            <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                        { label: 'All', value: 'all' },
                        { label: 'Rentals', value: 'rental_request' },
                        { label: 'Timesheets', value: 'timesheet_verification' },
                        { label: 'Work Orders', value: 'work_order' },
                        { label: 'Assets', value: 'asset' },
                    ].map((filter) => (
                        <Chip
                            key={filter.value}
                            selected={filterType === filter.value}
                            onPress={() => setFilterType(filter.value)}
                            style={[
                                styles.filterChip,
                                { backgroundColor: filterType === filter.value ? theme.colors.primary : 'rgba(255,255,255,0.1)' }
                            ]}
                            textStyle={{ color: 'white' }}
                            showSelectedOverlay
                        >
                            {filter.label}
                        </Chip>
                    ))}
                </ScrollView>
            </View>

            {(loadingPending || loadingMy) && !filteredData.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={loadingPending || loadingMy} onRefresh={onRefresh} tintColor="white" />
                    }
                >
                    {filteredData.map((req) => (
                        <Card key={req.id} style={styles.card} mode="outlined">
                            <Card.Title
                                title={req.resource_type.replace(/_/g, ' ').toUpperCase()}
                                titleStyle={{ color: 'white', fontWeight: 'bold' }}
                                subtitle={format(new Date(req.created_at), 'dd MMM yyyy, HH:mm')}
                                subtitleStyle={{ color: 'rgba(255,255,255,0.7)' }}
                                left={(props) => <IconButton {...props} icon={getIcon(req.resource_type)} iconColor="white" style={{ backgroundColor: theme.colors.primary }} />}
                                right={(props) => (
                                    <Text
                                        style={{
                                            marginRight: 16,
                                            color: getStatusColor(req.status),
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {req.status}
                                    </Text>
                                )}
                            />
                            <Card.Content>
                                <Text variant="bodyMedium" style={{ marginBottom: 4, color: 'rgba(255,255,255,0.9)' }}>
                                    <Text style={{ fontWeight: 'bold', color: 'white' }}>Action: </Text>
                                    {req.action_type.replace(/_/g, ' ')}
                                </Text>
                                <Text variant="bodyMedium" style={{ marginBottom: 4, color: 'rgba(255,255,255,0.9)' }}>
                                    <Text style={{ fontWeight: 'bold', color: 'white' }}>Requester: </Text>
                                    {req.requester_name || req.requested_by}
                                </Text>

                                <View style={styles.detailsBox}>
                                    <Text variant="bodySmall" style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: 'rgba(255,255,255,0.8)' }}>
                                        {JSON.stringify(req.data_snapshot, null, 2).substring(0, 150)}...
                                    </Text>
                                </View>
                            </Card.Content>

                            {activeTab === 'pending' && (
                                <Card.Actions>
                                    <Button
                                        textColor={theme.colors.error}
                                        onPress={() => showDialog(req, 'reject')}
                                    >Reject</Button>
                                    <Button
                                        mode="contained"
                                        buttonColor={theme.colors.primary}
                                        onPress={() => showDialog(req, 'approve')}
                                    >Approve</Button>
                                </Card.Actions>
                            )}
                        </Card>
                    ))}
                    {!filteredData.length && (
                        <Text style={styles.emptyText}>No requests found.</Text>
                    )}
                </ScrollView>
            )}

            <Portal>
                <Dialog visible={visible} onDismiss={hideDialog} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title style={{ color: '#1e293b' }}>{actionType === 'approve' ? 'Approve' : 'Reject'} Request</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label={actionType === 'reject' ? "Reason (Required)" : "Notes (Optional)"}
                            value={notes}
                            onChangeText={setNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={{ backgroundColor: 'white' }}
                            textColor="#1e293b"
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog} textColor={theme.colors.secondary}>Cancel</Button>
                        <Button
                            onPress={handleSubmit}
                            loading={approveMutation.isPending || rejectMutation.isPending}
                            disabled={actionType === 'reject' && !notes.trim()}
                            textColor={theme.colors.primary}
                        >
                            Confirm
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    countChip: {
        backgroundColor: '#fbbf24', // Amber
    },
    tabs: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    filters: {
        marginBottom: 8,
        paddingLeft: 16,
        height: 40,
    },
    filterChip: {
        marginRight: 8,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    list: {
        padding: 16,
        paddingTop: 0,
        paddingBottom: 80,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    detailsBox: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: 'rgba(255,255,255,0.5)',
    }
});
