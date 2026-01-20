import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Title, Button, useTheme, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import GlassView from '../../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  // Mock Data
  const [stats] = useState({
    activeRentals: 12,
    pendingTasks: 5,
    myAssets: 3
  });

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="titleSmall" style={{ color: 'rgba(255,255,255,0.7)' }}>Welcome back,</Text>
            <Text variant="titleLarge" style={{ color: 'white', fontWeight: 'bold' }}>
              {user?.name || 'User'}
            </Text>
          </View>
          <Avatar.Text size={48} label={user?.name?.charAt(0) || 'U'} style={{ backgroundColor: theme.colors.primary }} />
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.grid}>
          <GlassView style={{ flex: 1 }} intensity={20}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{stats.activeRentals}</Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>Active Rentals</Text>
          </GlassView>
          <GlassView style={{ flex: 1 }} intensity={20}>
            <Text variant="displaySmall" style={{ color: theme.colors.tertiary, fontWeight: 'bold' }}>{stats.pendingTasks}</Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>Pending Tasks</Text>
          </GlassView>
        </View>

        {/* Main Actions */}
        <Title style={[styles.sectionTitle, { color: 'white' }]}>Quick Actions</Title>
        <View style={styles.actionGrid}>
          <Button
            mode="contained"
            icon="qrcode-scan"
            onPress={() => router.push('/(tabs)/scan')}
            style={styles.actionButton}
            contentStyle={{ height: 50 }}
            buttonColor={theme.colors.primary}
          >
            Scan Asset
          </Button>
          <Button
            mode="contained-tonal"
            icon="clipboard-list"
            onPress={() => router.push('/(tabs)/tasks')}
            style={styles.actionButton}
            contentStyle={{ height: 50 }}
            textColor="white"
            buttonColor="rgba(255,255,255,0.1)"
          >
            My Tasks
          </Button>
        </View>

        <Title style={[styles.sectionTitle, { color: 'white' }]}>Recent Activity</Title>
        <GlassView style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon size={40} icon="truck" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} color="#60a5fa" />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text variant="titleMedium" style={{ color: 'white' }}>Rental #R2024-001</Text>
              <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.5)' }}>Handover completed</Text>
            </View>
          </View>
        </GlassView>

        <GlassView style={{ marginBottom: 100 }}> {/* Padding for TabBar */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon size={40} icon="wrench" style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)' }} color="#facc15" />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text variant="titleMedium" style={{ color: 'white' }}>Excavator CAT-320</Text>
              <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.5)' }}>Maintenance request approved</Text>
            </View>
          </View>
        </GlassView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
});
