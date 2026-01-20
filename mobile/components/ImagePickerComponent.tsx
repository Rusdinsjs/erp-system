import { View, Image, StyleSheet, Alert } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

interface ImagePickerProps {
    onImageSelected: (uri: string) => void;
    label?: string;
}

export default function ImagePickerComponent({ onImageSelected, label = "Take Photo" }: ImagePickerProps) {
    const theme = useTheme();
    const [image, setImage] = useState<string | null>(null);

    const pickImage = async () => {
        // Ask for permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5, // Compress for bandwidth
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            onImageSelected(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.container}>
            <Button
                mode="outlined"
                icon="camera"
                onPress={pickImage}
                style={styles.button}
            >
                {label}
            </Button>

            {image && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: image }} style={[styles.image, { borderColor: theme.colors.outline }]} />
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>Photo Ready</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 10,
    },
    button: {
        width: '100%',
    },
    previewContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    image: {
        width: 200,
        height: 150,
        borderRadius: 8,
        borderWidth: 1,
    },
});
