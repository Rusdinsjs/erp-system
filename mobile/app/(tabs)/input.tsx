import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Card, HelperText, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalsApi } from '../../api/rentals';
import { api, API_URL } from '../../api/client';
import { timesheetApi, TimesheetRequest } from '../../api/timesheet';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { uploadApi } from '../../api/upload';
import { LinearGradient } from 'expo-linear-gradient';

export default function InputScreen() {
    const theme = useTheme();
    const params = useLocalSearchParams();
    const queryClient = useQueryClient();

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.5,
        });

        if (!result.canceled) {
            handleUpload(result.assets[0].uri);
        }
    };

    const handleUpload = async (uri: string) => {
        try {
            setIsUploading(true);
            const response = await uploadApi.uploadImage(uri);
            setPhotos(prev => [...prev, response.url]);
        } catch (error) {
            Alert.alert('Upload Failed', 'Could not upload image');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    // State
    const [rentalId, setRentalId] = useState<string>('');
    const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState<'operating' | 'standby' | 'breakdown'>('operating');

    // Time
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');

    // HM/KM
    const [hmStart, setHmStart] = useState('');
    const [hmEnd, setHmEnd] = useState('');
    const [operatingHours, setOperatingHours] = useState('');

    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Load Rentals for Dropdown (Simplified as List for now)
    const { data: rentals } = useQuery({ queryKey: ['active-rentals'], queryFn: rentalsApi.listActive });

    // Pre-fill from Params
    useEffect(() => {
        if (params.rentalId) {
            setRentalId(params.rentalId as string);
        }
    }, [params.rentalId]);

    const mutation = useMutation({
        mutationFn: timesheetApi.create,
        onSuccess: () => {
            Alert.alert('Success', 'Timesheet submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['timesheets'] }); // if any
            router.push('/(tabs)/history');
            // Reset form?
            setHmStart(hmEnd); // Set next start as current end
            setHmEnd('');
        },
        onError: (err: any) => {
            Alert.alert('Error', err.response?.data?.message || 'Failed to submit timesheet');
        }
    });

    // Helper to calc hours from HH:MM
    const calculateTimeDiff = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const diff = (h2 + m2 / 60) - (h1 + m1 / 60);
        return diff > 0 ? diff : 0;
    };

    const handleSubmit = () => {
        if (!rentalId) {
            Alert.alert('Validation', 'Please select a rental assignment');
            return;
        }

        // Ensure time has seconds for NaiveTime
        const formatTime = (t: string) => (!t || t.length === 0) ? undefined : (t.length === 5 ? `${t}:00` : t);

        const payload: TimesheetRequest = {
            rental_id: rentalId,
            work_date: workDate,

            // Map generic state/UI fields to specific DTO fields based on Status
            operation_status: status,

            // Operating (Working)
            operating_hours: status === 'operating' ? (parseFloat(operatingHours) || 0) : 0,
            hm_km_start: status === 'operating' ? (parseFloat(hmStart) || 0) : undefined,
            hm_km_end: status === 'operating' ? (parseFloat(hmEnd) || 0) : undefined,
            // Default shift times for "Working" if not explicitly asked, or maybe omit? 
            // We'll set generic start/end for working record
            start_time: status === 'operating' ? '08:00:00' : undefined,
            end_time: status === 'operating' ? '17:00:00' : undefined,

            // Standby
            standby_start_time: status === 'standby' ? formatTime(startTime) : undefined,
            standby_end_time: status === 'standby' ? formatTime(endTime) : undefined,
            standby_hours: status === 'standby' ? calculateTimeDiff(startTime, endTime) : 0,

            // Breakdown
            breakdown_start_time: status === 'breakdown' ? formatTime(startTime) : undefined,
            breakdown_end_time: status === 'breakdown' ? formatTime(endTime) : undefined,
            breakdown_hours: status === 'breakdown' ? calculateTimeDiff(startTime, endTime) : 0,

            checker_notes: notes,

            breakdown_reason: status === 'breakdown' ? notes : undefined,
        };

        mutation.mutate(payload);
    };

    const selectedAsset = rentals?.find(r => r.id === rentalId);

    const inputTheme = {
        colors: {
            onSurfaceVariant: 'rgba(255,255,255,0.7)',
            onSurface: 'white',
            primary: theme.colors.primary,
            background: 'transparent',
            outline: 'rgba(255,255,255,0.2)'
        }
    };

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text variant="headlineSmall" style={styles.header}>New Entry</Text>

                    {/* Asset Section */}
                    <Card style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                        <Card.Content>
                            <Text variant="titleMedium" style={{ color: 'white' }}>Assignment</Text>
                            {selectedAsset ? (
                                <View>
                                    <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: theme.colors.primary, marginTop: 5 }}>
                                        {selectedAsset.asset_name}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.7)' }}>{selectedAsset.rental_number}</Text>
                                    <Button mode="text" onPress={() => setRentalId('')} compact textColor={theme.colors.secondary}>Change</Button>
                                </View>
                            ) : (
                                <View>
                                    <Text variant="bodyMedium" style={{ color: theme.colors.error }}>No asset selected</Text>
                                    <Button mode="outlined" onPress={() => router.push('/(tabs)')} style={{ marginTop: 10, borderColor: theme.colors.primary }} textColor="white">
                                        Select from Dashboard
                                    </Button>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Status Tabs */}
                    <View style={styles.section}>
                        <SegmentedButtons
                            value={status}
                            onValueChange={val => {
                                setStatus(val as any);
                                // Reset fields when switching? Maybe safer.
                                if (val === 'operating') {
                                    setStartTime('08:00');
                                    setEndTime('17:00');
                                } else if (val === 'standby' || val === 'breakdown') {
                                    setStartTime('');
                                    setEndTime('');
                                }
                            }}
                            buttons={[
                                { value: 'operating', label: 'Working' },
                                { value: 'standby', label: 'Standby' },
                                { value: 'breakdown', label: 'Breakdown' },
                            ]}
                            theme={{ colors: { secondaryContainer: theme.colors.primary, onSecondaryContainer: 'white', outline: 'rgba(255,255,255,0.2)' } }}
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                        />
                    </View>

                    {/* Work Date - Always Visible */}
                    <Card style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                        <Card.Content>
                            <TextInput
                                label="Date (YYYY-MM-DD)"
                                value={workDate}
                                onChangeText={setWorkDate}
                                mode="outlined"
                                style={styles.input}
                                theme={inputTheme}
                                textColor="white"
                            />
                        </Card.Content>
                    </Card>

                    {/* WORKING MODE: HM Inputs */}
                    {status === 'operating' && (
                        <Card style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                            <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 10, color: 'white' }}>Machine Hours (HM)</Text>
                                <View style={styles.row}>
                                    <TextInput
                                        label="HM Start"
                                        value={hmStart}
                                        onChangeText={setHmStart}
                                        keyboardType="numeric"
                                        mode="outlined"
                                        style={[styles.input, styles.half]}
                                        theme={inputTheme}
                                        textColor="white"
                                    />
                                    <TextInput
                                        label="HM End"
                                        value={hmEnd}
                                        onChangeText={setHmEnd}
                                        keyboardType="numeric"
                                        mode="outlined"
                                        style={[styles.input, styles.half]}
                                        theme={inputTheme}
                                        textColor="white"
                                    />
                                </View>
                                <HelperText type="info" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    Total: {hmEnd && hmStart ? (parseFloat(hmEnd) - parseFloat(hmStart)).toFixed(1) : 0} hours
                                </HelperText>
                            </Card.Content>
                        </Card>
                    )}

                    {/* STANDBY / BREAKDOWN MODE: Time Inputs */}
                    {(status === 'standby' || status === 'breakdown') && (
                        <Card style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                            <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 10, color: theme.colors.error }}>
                                    {status === 'breakdown' ? 'Breakdown Details' : 'Standby Duration'}
                                </Text>
                                {status === 'breakdown' && (
                                    <HelperText type="info" style={{ color: theme.colors.error, marginBottom: 10 }}>
                                        Entering Start Time will trigger a High Priority Work Order.
                                    </HelperText>
                                )}
                                <View style={styles.row}>
                                    <TextInput
                                        label="Start Time (HH:MM)"
                                        value={startTime}
                                        onChangeText={setStartTime}
                                        mode="outlined"
                                        style={[styles.input, styles.half]}
                                        theme={inputTheme}
                                        textColor="white"
                                        placeholder="00:00"
                                    />
                                    <TextInput
                                        label="End Time (Optional)"
                                        value={endTime}
                                        onChangeText={setEndTime}
                                        mode="outlined"
                                        style={[styles.input, styles.half]}
                                        theme={inputTheme}
                                        textColor="white"
                                        placeholder="00:00"
                                    />
                                </View>
                            </Card.Content>
                        </Card>
                    )}

                    <TextInput
                        label="Notes / Remarks"
                        value={notes}
                        onChangeText={setNotes}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                        theme={inputTheme}
                        textColor="white"
                    />

                    {/* Photos Section */}
                    <Card style={[styles.card, { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(255,255,255,0.1)' }]} mode="outlined">
                        <Card.Content>
                            <Text variant="titleMedium" style={{ marginBottom: 10, color: 'white' }}>Photos / Evidence</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {photos.map((url, index) => (
                                    <Image
                                        key={index}
                                        source={{ uri: `${API_URL.replace('/api', '')}${url}` }}
                                        style={{ width: 80, height: 80, borderRadius: 8 }}
                                    />
                                ))}
                                <Button
                                    mode="outlined"
                                    onPress={pickImage}
                                    icon="camera"
                                    style={{ justifyContent: 'center', height: 80, width: 80, borderColor: 'rgba(255,255,255,0.3)' }}
                                    textColor="white"
                                    disabled={isUploading}
                                >
                                    {isUploading ? '...' : '+'}
                                </Button>
                            </View>
                            {isUploading && <Text variant="bodySmall" style={{ marginTop: 5, color: 'rgba(255,255,255,0.7)' }}>Uploading...</Text>}
                        </Card.Content>
                    </Card>

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={mutation.isPending}
                        disabled={mutation.isPending}
                        style={styles.submitBtn}
                        buttonColor={theme.colors.primary}
                    >
                        Submit Timesheet
                    </Button>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        padding: 16,
        paddingBottom: 100, // Reduced from 150 as requested
    },
    header: {
        marginBottom: 16,
        color: 'white',
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 16,
    },
    section: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        color: 'white',
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.2)', // Slightly darker input bg
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    half: {
        width: '48%',
    },
    submitBtn: {
        marginTop: 10,
        paddingVertical: 6,
    }
});
