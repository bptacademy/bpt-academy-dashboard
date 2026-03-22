import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

const STUDENT_MENU = [
  { icon: '🏠', label: 'Home',     screen: 'Home' },
  { icon: '📚', label: 'Programs', screen: 'Programs' },
  { icon: '🎬', label: 'Videos',   screen: 'Videos' },
  { icon: '📈', label: 'Progress', screen: 'Progress' },
  { icon: '💬', label: 'Messages', screen: 'Messages' },
  { icon: '👤', label: 'Profile',  screen: 'Profile' },
];

const ADMIN_MENU = [
  { icon: '📊', label: 'Dashboard', screen: 'Dashboard' },
  { icon: '📋', label: 'Programs',  screen: 'Manage' },
  { icon: '🎬', label: 'Videos',    screen: 'Videos' },
  { icon: '👥', label: 'Students',  screen: 'Students' },
  { icon: '💬', label: 'Messages',  screen: 'Messages' },
  { icon: '🔔', label: 'Announce',  screen: 'Announce' },
  { icon: '👤', label: 'Profile',   screen: 'Profile' },
];

// Inject menu into screen options
const menuOpts = (title: string, menu: typeof STUDENT_MENU) => ({
  headerShown: false,
  // Pass menu via initialParams so screens can access it
  initialParams: { menuItems: menu, menuTitle: title },
});

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"     component={HomeScreen}     options={menuOpts('Home', STUDENT_MENU)} />
      <Stack.Screen name="Programs" component={ProgramsScreen} options={menuOpts('Programs', STUDENT_MENU)} />
      <Stack.Screen name="Videos"   component={VideosScreen}   options={menuOpts('Videos', STUDENT_MENU)} />
      <Stack.Screen name="Progress" component={ProgressScreen} options={menuOpts('Progress', STUDENT_MENU)} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={menuOpts('Messages', STUDENT_MENU)} />
      <Stack.Screen name="Profile"  component={ProfileScreen}  options={menuOpts('Profile', STUDENT_MENU)} />
      <Stack.Screen name="ProgramDetail"   component={ProgramDetailScreen}   options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="VideoPlayer"     component={VideoPlayerScreen}     options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Chat"            component={ChatScreen}            options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} options={{ headerShown: true, title: 'New Message', headerBackTitle: 'Back' }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={CoachHomeScreen}       options={menuOpts('Dashboard', ADMIN_MENU)} />
      <Stack.Screen name="Manage"    component={ManageProgramsScreen}  options={menuOpts('Programs', ADMIN_MENU)} />
      <Stack.Screen name="Videos"    component={ManageVideosScreen}    options={menuOpts('Videos', ADMIN_MENU)} />
      <Stack.Screen name="Students"  component={ManageStudentsScreen}  options={menuOpts('Students', ADMIN_MENU)} />
      <Stack.Screen name="Messages"  component={MessagesScreen}        options={menuOpts('Messages', ADMIN_MENU)} />
      <Stack.Screen name="Announce"  component={SendAnnouncementScreen} options={menuOpts('Announce', ADMIN_MENU)} />
      <Stack.Screen name="Profile"   component={ProfileScreen}         options={menuOpts('Profile', ADMIN_MENU)} />
      <Stack.Screen name="ProgramRoster"   component={ProgramRosterScreen}   options={{ headerShown: true, title: 'Roster', headerBackTitle: 'Back' }} />
      <Stack.Screen name="StudentDetail"   component={StudentDetailScreen}   options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
      <Stack.Screen name="UploadVideo"     component={UploadVideoScreen}     options={{ headerShown: true, title: 'Upload Video', headerBackTitle: 'Back' }} />
      <Stack.Screen name="Chat"            component={ChatScreen}            options={{ headerShown: true, headerBackTitle: 'Back' }} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} options={{ headerShown: true, title: 'New Message', headerBackTitle: 'Back' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading, effectiveRole } = useAuth();
  if (loading) return null;

  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'coach';

  return (
    <NavigationContainer>
      {!session ? <AuthStack /> : isAdmin ? <AdminStack /> : <StudentStack />}
    </NavigationContainer>
  );
}
