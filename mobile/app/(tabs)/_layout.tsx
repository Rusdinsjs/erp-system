import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, Platform, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate
} from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Component for individual tab item to handle its own animation hook
const TabItem = ({
  route,
  index,
  descriptors,
  isFocused,
  navigation,
  theme,
  tabWidth
}: any) => {
  const { options } = descriptors[route.key];
  const scale = useSharedValue(isFocused ? 1 : 0.9);
  const opacity = useSharedValue(isFocused ? 1 : 0.6);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.1 : 0.9, { damping: 10, stiffness: 100 });
    opacity.value = withTiming(isFocused ? 1 : 0.6, { duration: 200 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : route.name;

  const color = isFocused ? theme.colors.primary : 'rgba(148, 163, 184, 0.6)';

  // Special render for "Scan"
  if (route.name === 'scan') {
    const scanScale = useSharedValue(1);

    const scanAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scanScale.value }]
    }));

    useEffect(() => {
      if (isFocused) {
        scanScale.value = withSpring(1.15, { damping: 8 }); // Higher bounce for main action
      } else {
        scanScale.value = withSpring(1, { damping: 10 });
      }
    }, [isFocused]);

    return (
      <AnimatedTouchableOpacity
        key={index}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={[styles.tabItem, { width: tabWidth }, scanAnimatedStyle]}
      >
        <View style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: theme.colors.primary,
          shadowOpacity: 0.6,
          shadowRadius: 10,
          elevation: 8,
          borderWidth: 3,
          borderColor: '#1e293b',
          marginBottom: 4
        }}>
          <Ionicons name="qr-code" size={26} color="white" />
        </View>
        <Text variant="labelSmall" style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>Scan</Text>
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      key={index}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarTestID}
      onPress={onPress}
      style={[styles.tabItem, { width: tabWidth }, animatedStyle]}
    >
      {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color, size: 24 })}
      <Text
        variant="labelSmall"
        style={{
          color,
          fontSize: 10,
          marginTop: 4,
          fontWeight: isFocused ? 'bold' : 'normal',
        }}
      >
        {label}
      </Text>
    </AnimatedTouchableOpacity>
  );
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  // Show ~5 items visible at once
  const tabWidth = width / 5;

  return (
    <View style={styles.tabContainer}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 8, paddingTop: 12 }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Skip hidden tabs
          if (options.href === null) return null;

          const isFocused = state.index === index;

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              descriptors={descriptors}
              isFocused={isFocused}
              navigation={navigation}
              theme={theme}
              tabWidth={tabWidth}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* Middle Importance */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
        }}
      />

      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "checkmark-done-circle" : "checkmark-done-circle-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          title: 'Entry',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "create" : "create-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* Hidden Tabs */}
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  }
});
