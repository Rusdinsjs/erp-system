import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from 'react-native-paper';

interface GlassViewProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    intensity?: number;
    hasBorder?: boolean;
}

export default function GlassView({ children, style, intensity = 20, hasBorder = true }: GlassViewProps) {
    const theme = useTheme();

    // Default container styles
    const containerStyle = {
        borderRadius: 16,
        overflow: 'hidden' as const, // Type assertion for TypeScript
    };

    // Border style
    const borderStyle = hasBorder ? {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    } : {};

    return (
        <View style={[styles.shadowContainer, style]}>
            <View style={[containerStyle, borderStyle]}>
                <BlurView
                    intensity={intensity}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
                {/* Fallback/Overlay for extra tint */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30, 41, 59, 0.4)' }]} />

                {/* Content */}
                <View style={{ padding: 16 }}>
                    {children}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    shadowContainer: {
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // Elevation for Android
        elevation: 8,
    },
});
