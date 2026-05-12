import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Title, Button, useTheme, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import GlassView from '../../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, RecentActivity } from '../../api/dashboard';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  // Fetch Dashboard Stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Fetch Recent Activity
  const { data: activities } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardApi.getActivity,
    refetchInterval: 30000
  });

  // Calculate generic counts or default to 0
  const activeLoans = stats?.loans?.active || 0;
  // Combine pending maintenance + pending loans for a "Total Pending" view
  const pendingTasks = (stats?.maintenance?.pending || 0) + (stats?.loans?.pending_approval || 0);

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
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{activeLoans}</Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>Active Loans</Text>
          </GlassView>
          <GlassView style={{ flex: 1 }} intensity={20}>
            <Text variant="displaySmall" style={{ color: theme.colors.tertiary, fontWeight: 'bold' }}>{pendingTasks}</Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)' }}>Pending Actions</Text>
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

        <Title style={[styles.sectionTitle, { color: 'white', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }]}>
          Recent Activity
        </Title>

        {activities?.slice(0, 5).map((activity: RecentActivity, index: number) => (
          <GlassView key={index} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon
                size={40}
                icon={activity.entity_type === 'maintenance_work_orders' ? 'wrench' : 'history'}
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
                color="#60a5fa"
              />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text variant="titleMedium" style={{ color: 'white' }}>{activity.description}</Text>
                <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {new Date(activity.created_at).toLocaleDateString()} • {activity.action}
                </Text>
              </View>
            </View>
          </GlassView>
        ))}

        {!activities?.length && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>No recent activity.</Text>
        )}

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
    paddingBottom: 120, // Increased to avoid blocking by Tab menu
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
