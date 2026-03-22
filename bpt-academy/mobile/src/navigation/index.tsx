import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

import { useAuth } from '../context/AuthContext';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Student screens
import HomeScreen from '../screens/student/HomeScreen';
import ProgramsScreen from '../screens/student/ProgramsScreen';
import ProgressScreen from '../screens/student/ProgressScreen';
import VideosScreen from '../screens/student/VideosScreen';
import MessagesScreen from '../screens/student/MessagesScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import ProgramDetailScreen from '../screens/student/ProgramDetailScreen';
import VideoPlayerScreen from '../screens/student/VideoPlayerScreen';

// Coach/Admin screens
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import ManageProgramsScreen from '../screens/coach/ManageProgramsScreen';
import ManageStudentsScreen from '../screens/coach/ManageStudentsScreen';
import ManageVideosScreen from '../screens/coach/ManageVideosScreen';
import SendAnnouncementScreen from '../screens/coach/SendAnnouncementScreen';
import ProgramRosterScreen from '../screens/coach/ProgramRosterScreen';
import StudentDetailScreen from '../screens/coach/StudentDetailScreen';
import UploadVideoScreen from '../screens/coach/UploadVideoScreen';

// Messaging
import NewConversationScreen from '../screens/messaging/NewConversationScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ── Custom Drawer Content ─────────────────────────────────────
function CustomDrawerContent(props: any) {
  const { profile, signOut, effectiveRole, previewRole, setPreviewRole } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';
  const isViewingAsStudent = effectiveRole === 'student';

  const initials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      {/* Profile header */}
      <View style={styles.drawerHeader}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.drawerAvatar} />
        ) : (
          <View style={styles.drawerAvatarFallback}>
            <Text style={styles.drawerAvatarText}>{initials(profile?.full_name ?? '')}</Text>
          </View>
        )}
        <Text style={styles.drawerName}>{profile?.full_name}</Text>
        <View style={styles.drawerRoleBadge}>
          <Text style={styles.drawerRoleText}>
            {effectiveRole !== profile?.role ? `Viewing as ${effectiveRole}` : profile?.role}
          </Text>
        </View>
      </View>

      {/* Nav items */}
      <DrawerItemList {...props} />

      {/* Admin preview toggle */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.drawerToggle}
          onPress={() => setPreviewRole(isViewingAsStudent ? null : 'student')}
        >
          <Text style={styles.drawerToggleIcon}>{isViewingAsStudent ? '🔀' : '👁️'}</Text>
          <Text style={styles.drawerToggleText}>
            {isViewingAsStudent ? 'Switch to Admin' : 'Preview as Student'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Sign out */}
      <TouchableOpacity style={styles.drawerSignOut} onPress={signOut}>
        <Text style={styles.drawerSignOutIcon}>🚪</Text>
        <Text style={styles.drawerSignOutText}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

// ── Student Drawer ────────────────────────────────────────────
function StudentDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#111827',
        drawerActiveTintColor: '#16A34A',
        drawerInactiveTintColor: '#6B7280',
        drawerLabelStyle: { fontSize: 15, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Drawer.Screen name="Home"     component={HomeScreen}     options={{ title: '🏠  Home' }} />
      <Drawer.Screen name="Programs" component={ProgramsScreen} options={{ title: '📚  Programs' }} />
      <Drawer.Screen name="Videos"   component={VideosScreen}   options={{ title: '🎬  Videos' }} />
      <Drawer.Screen name="Progress" component={ProgressScreen} options={{ title: '📈  Progress' }} />
      <Drawer.Screen name="Messages" component={MessagesScreen} options={{ title: '💬  Messages' }} />
      <Drawer.Screen name="Profile"  component={ProfileScreen}  options={{ title: '👤  Profile' }} />
    </Drawer.Navigator>
  );
}

// ── Admin/Coach Drawer ────────────────────────────────────────
function CoachDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#FFFFFF',
        drawerActiveTintColor: '#16A34A',
        drawerInactiveTintColor: '#6B7280',
        drawerLabelStyle: { fontSize: 15, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Drawer.Screen name="Dashboard" component={CoachHomeScreen}      options={{ title: '📊  Dashboard' }} />
      <Drawer.Screen name="Manage"    component={ManageProgramsScreen} options={{ title: '📋  Programs' }} />
      <Drawer.Screen name="Videos"    component={ManageVideosScreen}   options={{ title: '🎬  Videos' }} />
      <Drawer.Screen name="Students"  component={ManageStudentsScreen} options={{ title: '👥  Students' }} />
      <Drawer.Screen name="Messages"  component={MessagesScreen}       options={{ title: '💬  Messages' }} />
      <Drawer.Screen name="Announce"  component={SendAnnouncementScreen} options={{ title: '🔔  Announce' }} />
      <Drawer.Screen name="Profile"   component={ProfileScreen}        options={{ title: '👤  Profile' }} />
    </Drawer.Navigator>
  );
}

// ── Auth Stack ────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── App Stack (role-aware) ────────────────────────────────────
function AppStack() {
  const { effectiveRole } = useAuth();
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'coach';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={isAdmin ? CoachDrawer : StudentDrawer} />

      {/* Push screens */}
      <Stack.Screen name="ProgramDetail"    component={ProgramDetailScreen}    options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="VideoPlayer"      component={VideoPlayerScreen}      options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="ProgramRoster"    component={ProgramRosterScreen}    options={{ headerShown: true, title: 'Roster', headerBackTitle: 'Back' }} />
      <Stack.Screen name="StudentDetail"    component={StudentDetailScreen}    options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="UploadVideo"      component={UploadVideoScreen}      options={{ headerShown: true, title: 'Upload Video', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Chat"             component={ChatScreen}             options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="NewConversation"  component={NewConversationScreen}  options={{ headerShown: true, title: 'New Message', headerBackTitle: 'Back' }} />
    </Stack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerContent: { flex: 1 },
  drawerHeader: { padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 8, alignItems: 'center' },
  drawerAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  drawerAvatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  drawerAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  drawerName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  drawerRoleBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  drawerRoleText: { fontSize: 12, color: '#16A34A', fontWeight: '600', textTransform: 'capitalize' },
  drawerToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  drawerToggleIcon: { fontSize: 18 },
  drawerToggleText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  drawerSignOut: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  drawerSignOutIcon: { fontSize: 18 },
  drawerSignOutText: { fontSize: 15, color: '#DC2626', fontWeight: '500' },
});
