import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Checkbox, List, useTheme, TextInput, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { workOrderApi } from '../api/workOrder';
import { LinearGradient } from 'expo-linear-gradient';

const CHECKLIST_ITEMS = [
    "Engine Oil Level", "Coolant Level", "Hydraulic Oil Level",
    "Brake Condition", "Tire/Wheel Condition", "Lights/Signal",
    "Horn", "Seat Belt", "Fire Extinguisher", "General Cleanliness"
];

export default function P2HScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { assetId, assetName } = useLocalSearchParams();

    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const mutation = useMutation({
        mutationFn: workOrderApi.create,
        onSuccess: async (wo) => {
            for (const item of CHECKLIST_ITEMS) {
                await workOrderApi.addChecklistItem(wo.id, {
                    description: item,
                    instructions: checkedItems[item] ? "Passed" : "Failed"
                });
            }
            Alert.alert('Success', 'P2H submitted successfully');
            router.back();
        },
        onError: (e) => Alert.alert('Error', 'Failed to submit P2H'),
    });

    const handleSubmit = () => {
        setSubmitting(true);
        mutation.mutate({
            asset_id: assetId as string,
            wo_type: 'p2h_inspection',
            problem_description: notes,
            priority: 'medium'
        });
    };

    return (
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text variant="titleLarge" style={styles.header}>P2H - Daily Check: {assetName}</Text>
                
                <List.Section style={styles.card}>
                    {CHECKLIST_ITEMS.map((item) => (
                        <List.Item
                            key={item}
                            title={item}
                            titleStyle={{ color: 'white' }}
                            right={() => (
                                <Checkbox.Android
                                    status={checkedItems[item] ? 'checked' : 'unchecked'}
                                    onPress={() => setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }))}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                    ))}
                </List.Section>

                <TextInput
                    label="Additional Notes"
                    value={notes}
                    onChangeText={setNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    textColor="white"
                />

                <Button mode="contained" onPress={handleSubmit} loading={submitting || mutation.isPending} style={styles.submitBtn}>
                    Submit P2H
                </Button>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 16, paddingTop: 60 },
    header: { color: 'white', marginBottom: 20 },
    card: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderRadius: 12, padding: 8 },
    input: { backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: 16 },
    submitBtn: { marginTop: 10 }
});
