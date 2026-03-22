import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Student screens
import HomeScreen from '../screens/student/HomeScreen';
import ProgramsScreen from '../screens/student/ProgramsScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import VideosScreen from '../screens/student/VideosScreen';
import MessagesScreen from '../screens/student/MessagesScreen';
import ProfileScreen from '../screens/student/ProfileScreen';

// Coach / Admin screens
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import ManageProgramsScreen from '../screens/coach/ManageProgramsScreen';
import ManageStudentsScreen from '../screens/coach/ManageStudentsScreen';
import SendAnnouncementScreen from '../screens/coach/SendAnnouncementScreen';
import UploadVideoScreen from '../screens/coach/UploadVideoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠', Programs: '📚', Videos: '🎬',
    Progress: '📈', Messages: '💬', Profile: '👤',
    Dashboard: '📊', Students: '👥', Manage: '📋', Announce: '🔔',
  };
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? '•'}</Text>;
}

// ── Student tabs ──────────────────────────────────────────
function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Programs" component={ProgramsScreen} />
      <Tab.Screen name="Videos" component={VideosScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Coach / Admin tabs ────────────────────────────────────
function CoachTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      <Tab.Screen name="Dashboard" component={CoachHomeScreen} />
      <Tab.Screen name="Manage" component={ManageProgramsScreen} />
      <Tab.Screen name="Students" component={ManageStudentsScreen} />
      <Tab.Screen name="Announce" component={SendAnnouncementScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── App stack (role-aware) ────────────────────────────────
function AppStack() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={isAdmin ? CoachTabs : StudentTabs} />
      {/* Shared push screens */}
      <Stack.Screen name="ManagePrograms" component={ManageProgramsScreen} options={{ headerShown: true, title: 'Programs' }} />
      <Stack.Screen name="ManageStudents" component={ManageStudentsScreen} options={{ headerShown: true, title: 'Students' }} />
      <Stack.Screen name="SendAnnouncement" component={SendAnnouncementScreen} options={{ headerShown: true, title: 'Announce' }} />
      <Stack.Screen name="UploadVideo" component={UploadVideoScreen} options={{ headerShown: true, title: 'Upload Video' }} />
    </Stack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────
export default function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
