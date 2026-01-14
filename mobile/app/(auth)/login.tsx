import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const login = useAuthStore(state => state.login);
    const theme = useTheme();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await authApi.login({ email, password });
            // Data structure depends on backend. Assuming { token: string, user: User }
            // Backend auth_handler login returns: Json(AuthResponse { token, user: user_dto })
            await login(data.token, data.user);
        } catch (err: any) {
            console.error('Login Error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Login failed';
            setError(errorMessage);
            Alert.alert('Login Failed', errorMessage + '\n\nPlease check:\n1. Backend is running\n2. Device is on same Wi-Fi\n3. Port 8080 is open/allowed in Firewall');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.content}>
                    <Text variant="headlineMedium" style={styles.title}>Asset Manager</Text>
                    <Text variant="titleMedium" style={styles.subtitle}>Field Operations</Text>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />

                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? "eye-off" : "eye"}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                        style={styles.input}
                    />

                    {error ? (
                        <HelperText type="error" visible={!!error}>
                            {error}
                        </HelperText>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                    >
                        Login
                    </Button>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.7,
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 10,
        paddingVertical: 5,
    },
});
