/**
 * SpectrumTabBar — animated bottom tab bar (design: "Spectrum" handoff).
 *
 * A custom tabBar for @react-navigation/bottom-tabs. Each tab is a pill that,
 * when active, takes its own hue, springs + swaps its icon from line→solid,
 * and expands a label into view. Driven by the navigator's real route state,
 * so it works with the existing routes (no route restructuring required).
 *
 * Map a route name → { label, icon, color } in TAB_CONFIG below; unknown
 * routes fall back to a sensible default so nothing ever renders blank.
 */
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolate, interpolateColor, Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import {
  House, ChartLineUp, Bell, ChatCircleDots, UserCircle,
  UsersThree, ClipboardText, type Icon as PhosphorIcon,
} from 'phosphor-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabSpec { label: string; Icon: PhosphorIcon; color: string }

// Route name → spectrum styling. Covers every tab route used across roles.
const TAB_CONFIG: Record<string, TabSpec> = {
  HomeTab:          { label: 'Home',          Icon: House,          color: '#3a78ff' },
  DashboardTab:     { label: 'Home',          Icon: House,          color: '#3a78ff' },
  ProgressTab:      { label: 'Analytics',     Icon: ChartLineUp,    color: '#6d7bff' },
  NotificationsTab: { label: 'Notifications', Icon: Bell,           color: '#ff8a3d' },
  MessagesTab:      { label: 'Messages',      Icon: ChatCircleDots, color: '#22cdb6' },
  ProfileTab:       { label: 'Profile',       Icon: UserCircle,     color: '#9b6cff' },
  UsersTab:         { label: 'Users',         Icon: UsersThree,     color: '#22cdb6' },
  StudentsTab:      { label: 'Students',      Icon: UsersThree,     color: '#22cdb6' },
  ProgramsTab:      { label: 'Programs',      Icon: ClipboardText,  color: '#4d8bff' },
};

const FALLBACK: TabSpec = { label: '', Icon: House, color: '#3a78ff' };

function SpectrumTab({
  focused, spec, onPress, onLongPress,
}: {
  focused: boolean; spec: TabSpec; onPress: () => void; onLongPress: () => void;
}) {
  const p = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, {
      duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['rgba(0,0,0,0)', spec.color]),
    shadowOpacity: interpolate(p.value, [0, 1], [0, 0.4]),
    shadowRadius: interpolate(p.value, [0, 1], [0, 12]),
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.14 : 1, { damping: 9, stiffness: 160 }) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    maxWidth: interpolate(p.value, [0, 1], [0, 110]),
    opacity: p.value,
    marginLeft: interpolate(p.value, [0, 1], [0, 7]),
  }));

  const { Icon } = spec;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tabHit} hitSlop={6}>
      <Animated.View style={[styles.pill, { shadowColor: spec.color }, pillStyle]}>
        <Animated.View style={iconWrapStyle}>
          <Icon
            size={23}
            weight={focused ? 'fill' : 'regular'}
            color={focused ? '#ffffff' : '#8b98bd'}
          />
        </Animated.View>
        <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
          {spec.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function SpectrumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.topHighlight} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const spec = TAB_CONFIG[route.name] ?? FALLBACK;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };
          const onLongPress = () =>
            navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <SpectrumTab
              key={route.key}
              focused={focused}
              spec={spec}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(8,13,30,0.85)',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    height: 70, paddingHorizontal: 12,
  },
  tabHit: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 13, borderRadius: 15,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  label: {
    color: '#ffffff', fontSize: 12.5, fontFamily: 'TTOctosquaresCond-Bold',
    overflow: 'hidden',
  },
});
