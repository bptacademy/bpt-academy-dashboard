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
import TournamentListScreen from '../screens/student/TournamentListScreen';
import TournamentDetailScreen from '../screens/student/TournamentDetailScreen';
import PaymentScreen from '../screens/student/PaymentScreen';
import LeaderboardScreen from '../screens/student/LeaderboardScreen';
import MyCoachNotesScreen from '../screens/student/MyCoachNotesScreen';

// Coach/Admin screens
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import ManageProgramsScreen from '../screens/coach/ManageProgramsScreen';
import ManageStudentsScreen from '../screens/coach/ManageStudentsScreen';
import ManageVideosScreen from '../screens/coach/ManageVideosScreen';
import SendAnnouncementScreen from '../screens/coach/SendAnnouncementScreen';
import ProgramRosterScreen from '../screens/coach/ProgramRosterScreen';
import StudentDetailScreen from '../screens/coach/StudentDetailScreen';
import UploadVideoScreen from '../screens/coach/UploadVideoScreen';
import AttendanceScreen from '../screens/coach/AttendanceScreen';
import CoachNotesScreen from '../screens/coach/CoachNotesScreen';
import DivisionDashboardScreen from '../screens/coach/DivisionDashboardScreen';
import TournamentManageScreen from '../screens/coach/TournamentManageScreen';
import PaymentReconciliationScreen from '../screens/coach/PaymentReconciliationScreen';
import BulkMessageScreen from '../screens/coach/BulkMessageScreen';
import AcademySettingsScreen from '../screens/coach/AcademySettingsScreen';
import BillingSettingsScreen from '../screens/coach/BillingSettingsScreen';

// Messaging
import NewConversationScreen from '../screens/messaging/NewConversationScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

const Stack = createNativeStackNavigator();

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
      {/* Main */}
      <Stack.Screen name="Home"        component={HomeScreen} />
      <Stack.Screen name="Programs"    component={ProgramsScreen} />
      <Stack.Screen name="Videos"      component={VideosScreen} />
      <Stack.Screen name="Progress"    component={ProgressScreen} />
      <Stack.Screen name="Messages"    component={MessagesScreen} />
      <Stack.Screen name="Profile"     component={ProfileScreen} />
      <Stack.Screen name="Tournaments" component={TournamentListScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      {/* Push */}
      <Stack.Screen name="ProgramDetail"    component={ProgramDetailScreen} />
      <Stack.Screen name="VideoPlayer"      component={VideoPlayerScreen} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
      <Stack.Screen name="Payment"          component={PaymentScreen} />
      <Stack.Screen name="MyCoachNotes"     component={MyCoachNotesScreen} />
      <Stack.Screen name="Chat"             component={ChatScreen} />
      <Stack.Screen name="NewConversation"  component={NewConversationScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Main */}
      <Stack.Screen name="Dashboard"  component={CoachHomeScreen} />
      <Stack.Screen name="Manage"     component={ManageProgramsScreen} />
      <Stack.Screen name="Videos"     component={ManageVideosScreen} />
      <Stack.Screen name="Students"   component={ManageStudentsScreen} />
      <Stack.Screen name="Messages"   component={MessagesScreen} />
      <Stack.Screen name="Announce"   component={SendAnnouncementScreen} />
      <Stack.Screen name="Profile"    component={ProfileScreen} />
      <Stack.Screen name="Divisions"  component={DivisionDashboardScreen} />
      <Stack.Screen name="Tournaments" component={TournamentManageScreen} />
      <Stack.Screen name="Payments"   component={PaymentReconciliationScreen} />
      <Stack.Screen name="BulkMsg"    component={BulkMessageScreen} />
      {/* Push */}
      <Stack.Screen name="ProgramRoster"   component={ProgramRosterScreen} />
      <Stack.Screen name="StudentDetail"   component={StudentDetailScreen} />
      <Stack.Screen name="UploadVideo"     component={UploadVideoScreen} />
      <Stack.Screen name="Attendance"      component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"       component={CoachNotesScreen} />
      <Stack.Screen name="AcademySettings"  component={AcademySettingsScreen} />
      <Stack.Screen name="BillingSettings" component={BillingSettingsScreen} />
      <Stack.Screen name="VideoPlayer"     component={VideoPlayerScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
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
