import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Button, useTheme } from 'react-native-paper';

interface SignatureProps {
    onOK: (signature: string) => void;
    onEmpty?: () => void;
}

export default function SignatureComponent({ onOK, onEmpty }: SignatureProps) {
    const ref = useRef<SignatureViewRef>(null);
    const theme = useTheme();

    const handleSignature = (signature: string) => {
        onOK(signature); // Base64 signature
    };

    const handleEmpty = () => {
        if (onEmpty) onEmpty();
    };

    const handleClear = () => {
        ref.current?.clearSignature();
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

    return (
        <View style={[styles.container, { borderColor: theme.colors.outline, backgroundColor: 'white' }]}>
            <View style={styles.signatureBox}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleSignature}
                    onEmpty={handleEmpty}
                    webStyle={style}
                    backgroundColor="white"
                    descriptionText="Sign here"
                />
            </View>
            <View style={styles.actions}>
                <Button mode="outlined" onPress={handleClear} style={{ flex: 1, marginRight: 8 }}>
                    Clear
                </Button>
                <Button mode="contained" onPress={handleConfirm} style={{ flex: 1 }}>
                    Confirm
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 250,
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
        marginVertical: 10,
    },
    signatureBox: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#f1f5f9', // Light gray background for controls
    },
});
