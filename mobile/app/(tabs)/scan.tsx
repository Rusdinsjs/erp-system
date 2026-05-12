import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, Vibration } from 'react-native';
import { Text, Button, useTheme, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function ScanScreen() {
    const theme = useTheme();
    const router = useRouter();

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);

    // Request Location Permissions early
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Location permission is required to track asset scans.');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={{ textAlign: 'center', color: theme.colors.onSurface, marginBottom: 20 }}>
                    We need your permission to show the camera
                </Text>
                <Button mode="contained" onPress={requestPermission}>
                    Grant Permission
                </Button>
            </View>
        );
    }

    const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        Vibration.vibrate();

        console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

        Alert.alert(
            "Asset Scanned",
            `ID: ${data}\nLocation Included: ${!!location}`,
            [
                {
                    text: "View Detail",
                    onPress: () => {
                        router.push(`/assets/${data}`);
                        setTimeout(() => setScanned(false), 1000);
                    }
                },
                {
                    text: "Scan Again",
                    onPress: () => setScanned(false)
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            >
                <View style={styles.overlay}>
                    {/* Top Bar */}
                    <Surface style={[styles.topBar, { backgroundColor: theme.colors.backdrop }]} elevation={0}>
                        <Text variant="titleMedium" style={{ color: 'white' }}>Scan Asset QR Code</Text>
                    </Surface>

                    {/* Scanner Marker */}
                    <View style={[styles.markerContainer]}>
                        <View style={[styles.marker, { borderColor: theme.colors.primary }]} />
                    </View>

                    {/* Bottom Bar */}
                    <View style={styles.bottomBar}>
                        <Text style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
                            Point camera at the Asset Tag
                        </Text>
                        {scanned && (
                            <Button mode="contained" onPress={() => setScanned(false)}>
                                Tap to Scan Again
                            </Button>
                        )}
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    topBar: {
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    marker: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    bottomBar: {
        padding: 40,
        paddingBottom: 80,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
    },
});
