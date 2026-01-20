import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 80, // Taller for aesthetics
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]} />
          </View>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'rgba(148, 163, 184, 0.6)', // Slate 400 with opacity
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color, size }) => (
            <View style={{
              top: -10, // Float effect for main action
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: theme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 5
            }}>
              <Ionicons name="qr-code" size={28} color="white" />
            </View>
          ),
          tabBarLabel: () => null, // Hide label for scan button
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'My Tasks',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
