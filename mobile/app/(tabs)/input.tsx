import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Card, HelperText, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rentalsApi } from '../../api/rentals';
import { api, API_URL } from '../../api/client';
import { timesheetApi, TimesheetRequest } from '../../api/timesheet';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { uploadApi } from '../../api/upload';
import { Image } from 'react-native';

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

    // Auto-calculate Hours
    useEffect(() => {
        if (hmEnd && hmStart) {
            const start = parseFloat(hmStart);
            const end = parseFloat(hmEnd);
            if (!isNaN(start) && !isNaN(end) && end >= start) {
                setOperatingHours((end - start).toFixed(1));
            }
        }
    }, [hmStart, hmEnd]);

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

    const handleSubmit = () => {
        if (!rentalId) {
            Alert.alert('Validation', 'Please select a rental assignment');
            return;
        }

        // Ensure time has seconds for NaiveTime
        const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;

        const payload: TimesheetRequest = {
            rental_id: rentalId,
            work_date: workDate,
            start_time: formatTime(startTime),
            end_time: formatTime(endTime),
            operating_hours: parseFloat(operatingHours) || 0,
            hm_km_start: parseFloat(hmStart) || 0,
            hm_km_end: parseFloat(hmEnd) || 0,
            operation_status: status,
            checker_notes: notes,
            // Simple logic for standby/breakdown hours distribution could be added here
            standby_hours: status === 'standby' ? 8 : 0,
            breakdown_hours: status === 'breakdown' ? 8 : 0,
        };

        mutation.mutate(payload);
    };

    const selectedAsset = rentals?.find(r => r.id === rentalId);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text variant="headlineSmall" style={styles.header}>New Entry</Text>

                {/* Asset Section */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium">Assignment</Text>
                        {selectedAsset ? (
                            <View>
                                <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: theme.colors.primary, marginTop: 5 }}>
                                    {selectedAsset.asset_name}
                                </Text>
                                <Text variant="bodySmall">{selectedAsset.rental_number}</Text>
                                <Button mode="text" onPress={() => setRentalId('')} compact>Change</Button>
                            </View>
                        ) : (
                            <View>
                                <Text variant="bodyMedium" style={{ color: theme.colors.error }}>No asset selected</Text>
                                <Button mode="outlined" onPress={() => router.push('/(tabs)')} style={{ marginTop: 10 }}>
                                    Select from Dashboard
                                </Button>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* Status Section */}
                <View style={styles.section}>
                    <Text variant="labelLarge" style={styles.label}>Operation Status</Text>
                    <SegmentedButtons
                        value={status}
                        onValueChange={val => setStatus(val as any)}
                        buttons={[
                            { value: 'operating', label: 'Working' },
                            { value: 'standby', label: 'Standby' },
                            { value: 'breakdown', label: 'Broken' },
                        ]}
                    />
                </View>

                {/* Date & Time */}
                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Date (YYYY-MM-DD)"
                            value={workDate}
                            onChangeText={setWorkDate}
                            mode="outlined"
                            style={styles.input}
                        />
                        <View style={styles.row}>
                            <TextInput
                                label="Start Time"
                                value={startTime}
                                onChangeText={setStartTime}
                                mode="outlined"
                                style={[styles.input, styles.half]}
                            />
                            <TextInput
                                label="End Time"
                                value={endTime}
                                onChangeText={setEndTime}
                                mode="outlined"
                                style={[styles.input, styles.half]}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* HM Section */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={{ marginBottom: 10 }}>Machine Hours (HM)</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="HM Start"
                                value={hmStart}
                                onChangeText={setHmStart}
                                keyboardType="numeric"
                                mode="outlined"
                                style={[styles.input, styles.half]}
                            />
                            <TextInput
                                label="HM End"
                                value={hmEnd}
                                onChangeText={setHmEnd}
                                keyboardType="numeric"
                                mode="outlined"
                                style={[styles.input, styles.half]}
                            />
                        </View>
                        <TextInput
                            label="Total Operating Hours"
                            value={operatingHours}
                            onChangeText={setOperatingHours}
                            keyboardType="numeric"
                            mode="outlined"
                            style={styles.input}
                        />
                        <HelperText type="info">
                            Auto-calculated: {hmEnd && hmStart ? (parseFloat(hmEnd) - parseFloat(hmStart)).toFixed(1) : 0}
                        </HelperText>
                    </Card.Content>
                </Card>

                <TextInput
                    label="Notes / Remarks"
                    value={notes}
                    onChangeText={setNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                />

                {/* Photos Section */}
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={{ marginBottom: 10 }}>Photos / Evidence</Text>
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
                                style={{ justifyContent: 'center', height: 80, width: 80 }}
                                disabled={isUploading}
                            >
                                {isUploading ? '...' : '+'}
                            </Button>
                        </View>
                        {isUploading && <Text variant="bodySmall" style={{ marginTop: 5 }}>Uploading...</Text>}
                    </Card.Content>
                </Card>

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={mutation.isPending}
                    disabled={mutation.isPending}
                    style={styles.submitBtn}
                >
                    Submit Timesheet
                </Button>

                <View style={{ height: 50 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scroll: {
        padding: 16,
    },
    header: {
        marginBottom: 16,
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    section: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white',
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
