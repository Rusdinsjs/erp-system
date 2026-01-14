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
            case 'APPROVED_L1': return theme.colors.primary;
            case 'APPROVED_L2': return 'green'; // theme.colors.tertiary might be better if defined
            case 'REJECTED': return theme.colors.error;
            case 'PENDING': return 'orange'; // theme.colors.warning if defined
            default: return theme.colors.secondary;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text variant="headlineMedium">Approval Center</Text>
                {activeTab === 'pending' && (
                    <Chip icon="bell-ring" style={styles.countChip}>{pendingRequests.length} Pending</Chip>
                )}
            </View>

            <SegmentedButtons
                value={activeTab}
                onValueChange={setActiveTab}
                buttons={[
                    { value: 'pending', label: 'Pending', icon: 'clock-outline' },
                    { value: 'my_requests', label: 'My Requests', icon: 'account' },
                ]}
                style={styles.tabs}
            />

            <View style={styles.filters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Chip
                        selected={filterType === 'all'}
                        onPress={() => setFilterType('all')}
                        style={styles.filterChip}
                    >All</Chip>
                    <Chip
                        selected={filterType === 'rental_request'}
                        onPress={() => setFilterType('rental_request')}
                        style={styles.filterChip}
                    >Rentals</Chip>
                    <Chip
                        selected={filterType === 'timesheet_verification'}
                        onPress={() => setFilterType('timesheet_verification')}
                        style={styles.filterChip}
                    >Timesheets</Chip>
                    <Chip
                        selected={filterType === 'work_order'}
                        onPress={() => setFilterType('work_order')}
                        style={styles.filterChip}
                    >Work Orders</Chip>
                    <Chip
                        selected={filterType === 'asset'}
                        onPress={() => setFilterType('asset')}
                        style={styles.filterChip}
                    >Assets</Chip>
                </ScrollView>
            </View>

            {(loadingPending || loadingMy) && !filteredData.length ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={loadingPending || loadingMy} onRefresh={onRefresh} />
                    }
                >
                    {filteredData.map((req) => (
                        <Card key={req.id} style={styles.card} mode="outlined">
                            <Card.Title
                                title={req.resource_type.replace(/_/g, ' ').toUpperCase()}
                                subtitle={format(new Date(req.created_at), 'dd MMM yyyy, HH:mm')}
                                left={(props) => <IconButton {...props} icon={getIcon(req.resource_type)} />}
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
                                <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
                                    <Text style={{ fontWeight: 'bold' }}>Action: </Text>
                                    {req.action_type.replace(/_/g, ' ')}
                                </Text>
                                <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
                                    <Text style={{ fontWeight: 'bold' }}>Requester: </Text>
                                    {req.requester_name || req.requested_by}
                                </Text>

                                <View style={styles.detailsBox}>
                                    <Text variant="bodySmall" style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
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
                <Dialog visible={visible} onDismiss={hideDialog}>
                    <Dialog.Title>{actionType === 'approve' ? 'Approve' : 'Reject'} Request</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label={actionType === 'reject' ? "Reason (Required)" : "Notes (Optional)"}
                            value={notes}
                            onChangeText={setNotes}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={hideDialog}>Cancel</Button>
                        <Button
                            onPress={handleSubmit}
                            loading={approveMutation.isPending || rejectMutation.isPending}
                            disabled={actionType === 'reject' && !notes.trim()}
                        >
                            Confirm
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    countChip: {
        backgroundColor: '#FFE0B2', // Light Orange
    },
    tabs: {
        marginHorizontal: 16,
        marginBottom: 12,
    },
    filters: {
        marginBottom: 8,
        paddingLeft: 16,
        height: 40,
    },
    filterChip: {
        marginRight: 8,
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
    },
    detailsBox: {
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#666',
    }
});
