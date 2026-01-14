import { StyleSheet, FlatList, View } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ActivityIndicator, useTheme, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { rentalsApi } from '../../api/rentals';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function DashboardScreen() {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);

  const { data: rentals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['active-rentals'],
    queryFn: rentalsApi.listActive
  });

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <Text variant="titleMedium">{item.asset_name}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
          {item.rental_number}
        </Text>
        <Text variant="bodyMedium">Client: {item.client_name}</Text>
        <Text variant="bodyMedium">Since: {item.start_date}</Text>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained-tonal"
          onPress={() => router.push({ pathname: '/(tabs)/input', params: { rentalId: item.id } })}
        >
          Log Timesheet
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Hello, {user?.name}</Text>
        <Text variant="bodyLarge" style={{ opacity: 0.7 }}>Active Assignments</Text>
      </View>

      {isLoading && !isRefetching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No active rental units found.</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(tabs)/input')}
        label="New Entry"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  list: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 10,
    backgroundColor: 'white',
  },
  center: {
    padding: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
