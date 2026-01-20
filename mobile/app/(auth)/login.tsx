import { View, StyleSheet, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Text, TextInput, Button, useTheme, Title, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import GlassView from '../../components/ui/GlassView';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
    const router = useRouter();
    const theme = useTheme();
    const login = useAuthStore((state) => state.login);

    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');

        // Simulate API Delay
        setTimeout(async () => {
            try {
                // Mock Authentication for Demo
                const mockToken = 'demo-token-123';
                const mockUser = {
                    id: 'user-001',
                    email: email,
                    name: 'Demo Admin',
                    role: 'admin'
                };

                await login(mockToken, mockUser);
                router.replace('/(tabs)');
            } catch (e) {
                setError('Invalid credentials');
            } finally {
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop' }}
            style={styles.container}
            blurRadius={Platform.OS === 'ios' ? 30 : 10} // Subtle blur for background
        >
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <View style={styles.logoContainer}>
                    <Text variant="displayLarge" style={{ color: 'white', fontWeight: 'bold' }}>JWS</Text>
                    <Text variant="titleMedium" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: 1 }}>ASSET MANAGEMENT</Text>
                </View>

                <GlassView intensity={40} style={styles.formContainer}>
                    <Title style={{ textAlign: 'center', marginBottom: 20, color: 'white' }}>Welcome Back</Title>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        outlineColor="rgba(255,255,255,0.2)"
                        activeOutlineColor={theme.colors.primary}
                        textColor="white"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }} // Placeholder color
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                        outlineColor="rgba(255,255,255,0.2)"
                        activeOutlineColor={theme.colors.primary}
                        textColor="white"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
                    />

                    {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={isLoading}
                        style={styles.button}
                        contentStyle={{ height: 50 }}
                    >
                        Login
                    </Button>

                    <Button
                        mode="text"
                        textColor="rgba(255,255,255,0.7)"
                        onPress={() => console.log('Forgot Password')}
                        style={{ marginTop: 10 }}
                    >
                        Forgot Password?
                    </Button>
                </GlassView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    formContainer: {
        marginBottom: 20,
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.6)', // Semi-transparent input background
    },
    button: {
        marginTop: 12,
        borderRadius: 8,
    },
});
