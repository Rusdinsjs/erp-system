import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
    Text,
    Card,
    Badge,
    FAB,
    Portal,
    Modal,
    TextInput,
    Button,
    IconButton,
    List,
    Avatar,
    useTheme,
    ActivityIndicator
} from 'react-native-paper';
import { loanApi, Loan } from '../../api/loan';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

const statusColors: Record<string, string> = {
    requested: '#EAB308',
    approved: '#3B82F6',
    checked_out: '#06B6D4',
    in_use: '#14B8A6',
    overdue: '#EF4444',
    returned: '#22C55E',
    rejected: '#6B7280',
};

export default function LoansScreen() {
    const theme = useTheme();
    const user = useAuthStore((state: any) => state.user);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // New Loan Form
    const [assetId, setAssetId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const data = await loanApi.getMyLoans();
            setLoans(data);
        } catch (error) {
            console.error('Failed to fetch loans:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLoans();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    const handleRequestLoan = async () => {
        if (!assetId) return;
        setSubmitting(true);
        try {
            const loanDate = format(new Date(), 'yyyy-MM-dd');
            const expectedDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

            // Backend determines borrower from auth token, no need to send borrower_id
            await loanApi.requestLoan({
                asset_id: assetId.trim(),
                loan_date: loanDate,
                expected_return_date: expectedDate,
            });
            setModalVisible(false);
            setAssetId('');
            fetchLoans();
            alert('Permintaan pinjaman berhasil dikirim!');
        } catch (error: any) {
            console.error('Failed to request loan:', error);
            const message = error.response?.data?.message || error.response?.data?.error || 'Gagal mengirim permintaan';
            alert(`Error: ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const renderLoanItem = ({ item }: { item: Loan }) => (
        <Card style={styles.card} mode="outlined">
            <Card.Title
                title={item.asset_name || 'Asset Item'}
                titleStyle={{ color: 'white', fontWeight: 'bold' }}
                subtitle={`No: ${item.loan_number || 'N/A'}`}
                subtitleStyle={{ color: 'rgba(255,255,255,0.7)' }}
                left={(props) => <Avatar.Icon {...props} icon="briefcase-outline" style={{ backgroundColor: theme.colors.primary }} color="white" />}
                right={(props) => (
                    <Badge
                        style={[styles.badge, { backgroundColor: statusColors[item.status] || '#999' }]}
                    >
                        {item.status.toUpperCase()}
                    </Badge>
                )}
            />
            <Card.Content>
                <View style={styles.row}>
                    <View>
                        <Text variant="labelSmall" style={{ color: 'white' }}>Pinjam</Text>
                        <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.loan_date}</Text>
                    </View>
                    <View>
                        <Text variant="labelSmall" style={{ color: 'white' }}>Estimasi Kembali</Text>
                        <Text variant="bodyMedium" style={item.status === 'overdue' ? { color: '#EF4444' } : { color: 'rgba(255,255,255,0.7)' }}>{item.expected_return_date}</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.title}>Pinjaman Saya</Text>
                <Text variant="bodySmall" style={styles.subtitle}>Riwayat dan status peminjaman aset Anda</Text>
            </View>

            <FlatList
                data={loans}
                renderItem={renderLoanItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.empty}>
                            <IconButton icon="clipboard-text-outline" size={48} disabled iconColor="rgba(255,255,255,0.3)" />
                            <Text variant="bodyLarge" style={{ opacity: 0.5, color: 'white' }}>Belum ada data peminjaman</Text>
                        </View>
                    ) : <ActivityIndicator animating={true} style={{ marginTop: 20 }} color={theme.colors.primary} />
                }
            />

            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text variant="titleLarge" style={{ marginBottom: 16, color: '#1e293b' }}>Request Pinjaman Baru</Text>
                            <TextInput
                                label="ID Aset atau Kode Barcode"
                                value={assetId}
                                onChangeText={setAssetId}
                                mode="outlined"
                                placeholder="Masukkan kode aset..."
                                style={{ marginBottom: 16, backgroundColor: 'white' }}
                                textColor="#1e293b"
                            />
                            <Text variant="bodySmall" style={{ marginBottom: 20, opacity: 0.7, color: '#475569' }}>
                                Pinjaman akan diajukan untuk durasi standar (7 hari). Anda dapat merubahnya di web admin jika diperlukan.
                            </Text>
                            <Button
                                mode="contained"
                                onPress={handleRequestLoan}
                                loading={submitting}
                                disabled={!assetId || submitting}
                                buttonColor={theme.colors.primary}
                            >
                                Kirim Permintaan
                            </Button>
                            <Button onPress={() => setModalVisible(false)} style={{ marginTop: 8 }} textColor={theme.colors.secondary}>
                                Batal
                            </Button>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </Modal>
            </Portal>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => setModalVisible(true)}
                label="Pinjam Aset"
                uppercase
                color="white"
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    title: {
        fontWeight: '700',
        color: 'white',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 12,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badge: {
        marginRight: 16,
        borderRadius: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 120, // Raised higher above tab bar
        borderRadius: 16,
    },
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 20,
        borderRadius: 16,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    }
});
