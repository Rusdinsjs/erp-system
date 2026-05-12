import { StyleSheet } from 'react-native';
import { Text, useTheme, Card, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

export default function TabTwoScreen() {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold', marginBottom: 16 }}>Tab Two</Text>
        <Card style={styles.card} mode="outlined">
          <Card.Title
            title="Example Component"
            titleStyle={{ color: 'white' }}
            left={(props) => <Avatar.Icon {...props} icon="shape" style={{ backgroundColor: theme.colors.primary }} />}
          />
          <Card.Content>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
              This is a standardized placeholder screen with the Premium Dark theme.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  }
});
