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

// Shared coach/admin screens
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
import ProgramModulesScreen from '../screens/coach/ProgramModulesScreen';
import PromotionManageScreen from '../screens/coach/PromotionManageScreen';

// Admin-only screens
import CoachHomeScreen from '../screens/coach/CoachHomeScreen'; // admin home
import BulkMessageScreen from '../screens/coach/BulkMessageScreen';
import PaymentReconciliationScreen from '../screens/coach/PaymentReconciliationScreen';
import AcademySettingsScreen from '../screens/coach/AcademySettingsScreen';
import BillingSettingsScreen from '../screens/coach/BillingSettingsScreen';

// Coach-only home
import CoachDashboardScreen from '../screens/coach/CoachDashboardScreen';

// Super Admin
import SuperAdminHomeScreen from '../screens/superadmin/SuperAdminHomeScreen';

// Messaging
import NewConversationScreen from '../screens/messaging/NewConversationScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

const Stack = createNativeStackNavigator();

// ─── Shared deep screens (used across coach + admin + super admin stacks) ───
function SharedDeepScreens() {
  return (
    <>
      <Stack.Screen name="ProgramRoster"    component={ProgramRosterScreen} />
      <Stack.Screen name="StudentDetail"    component={StudentDetailScreen} />
      <Stack.Screen name="UploadVideo"      component={UploadVideoScreen} />
      <Stack.Screen name="Attendance"       component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"       component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage"  component={PromotionManageScreen} />
      <Stack.Screen name="ProgramModules"   component={ProgramModulesScreen} />
      <Stack.Screen name="VideoPlayer"      component={VideoPlayerScreen} />
      <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
      <Stack.Screen name="TournamentList"   component={TournamentListScreen} />
      <Stack.Screen name="Chat"             component={ChatScreen} />
      <Stack.Screen name="NewConversation"  component={NewConversationScreen} />
    </>
  );
}

// ─── Auth stack ─────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Student stack ───────────────────────────────────────────────────────
function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"        component={HomeScreen} />
      <Stack.Screen name="Programs"    component={ProgramsScreen} />
      <Stack.Screen name="Videos"      component={VideosScreen} />
      <Stack.Screen name="Progress"    component={ProgressScreen} />
      <Stack.Screen name="Messages"    component={MessagesScreen} />
      <Stack.Screen name="Profile"     component={ProfileScreen} />
      <Stack.Screen name="Tournaments" component={TournamentListScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
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

// ─── Coach stack (restricted — no billing / settings / payments) ─────────
function CoachStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Home */}
      <Stack.Screen name="Dashboard"   component={CoachDashboardScreen} />
      {/* Coaching tools */}
      <Stack.Screen name="Manage"      component={ManageProgramsScreen} />
      <Stack.Screen name="Videos"      component={ManageVideosScreen} />
      <Stack.Screen name="Students"    component={ManageStudentsScreen} />
      <Stack.Screen name="Messages"    component={MessagesScreen} />
      <Stack.Screen name="Announce"    component={SendAnnouncementScreen} />
      <Stack.Screen name="Divisions"   component={DivisionDashboardScreen} />
      <Stack.Screen name="Tournaments" component={TournamentManageScreen} />
      <Stack.Screen name="Profile"     component={ProfileScreen} />
      {/* Shared deep screens */}
      {SharedDeepScreens()}
    </Stack.Navigator>
  );
}

// ─── Admin stack (full — except super admin user management) ─────────────
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Home */}
      <Stack.Screen name="Dashboard"   component={CoachHomeScreen} />
      {/* All management */}
      <Stack.Screen name="Manage"      component={ManageProgramsScreen} />
      <Stack.Screen name="Videos"      component={ManageVideosScreen} />
      <Stack.Screen name="Students"    component={ManageStudentsScreen} />
      <Stack.Screen name="Messages"    component={MessagesScreen} />
      <Stack.Screen name="Announce"    component={SendAnnouncementScreen} />
      <Stack.Screen name="Divisions"   component={DivisionDashboardScreen} />
      <Stack.Screen name="Tournaments" component={TournamentManageScreen} />
      <Stack.Screen name="Profile"     component={ProfileScreen} />
      {/* Admin-only */}
      <Stack.Screen name="Payments"         component={PaymentReconciliationScreen} />
      <Stack.Screen name="BulkMsg"          component={BulkMessageScreen} />
      <Stack.Screen name="AcademySettings"  component={AcademySettingsScreen} />
      <Stack.Screen name="BillingSettings"  component={BillingSettingsScreen} />
      {/* Shared deep screens */}
      {SharedDeepScreens()}
    </Stack.Navigator>
  );
}

// ─── Super Admin stack (everything + user management) ────────────────────
function SuperAdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Super Admin home (user management hub) */}
      <Stack.Screen name="SuperAdminHome" component={SuperAdminHomeScreen} />
      {/* Full admin access underneath */}
      <Stack.Screen name="Dashboard"   component={CoachHomeScreen} />
      <Stack.Screen name="Manage"      component={ManageProgramsScreen} />
      <Stack.Screen name="Videos"      component={ManageVideosScreen} />
      <Stack.Screen name="Students"    component={ManageStudentsScreen} />
      <Stack.Screen name="Messages"    component={MessagesScreen} />
      <Stack.Screen name="Announce"    component={SendAnnouncementScreen} />
      <Stack.Screen name="Divisions"   component={DivisionDashboardScreen} />
      <Stack.Screen name="Tournaments" component={TournamentManageScreen} />
      <Stack.Screen name="Profile"     component={ProfileScreen} />
      <Stack.Screen name="Payments"         component={PaymentReconciliationScreen} />
      <Stack.Screen name="BulkMsg"          component={BulkMessageScreen} />
      <Stack.Screen name="AcademySettings"  component={AcademySettingsScreen} />
      <Stack.Screen name="BillingSettings"  component={BillingSettingsScreen} />
      {/* Shared deep screens */}
      {SharedDeepScreens()}
    </Stack.Navigator>
  );
}

// ─── Root navigator ──────────────────────────────────────────────────────
export default function RootNavigator() {
  const { session, loading, isSuperAdmin, isAdmin, isCoach } = useAuth();
  if (loading) return null;

  const renderStack = () => {
    if (!session)    return <AuthStack />;
    if (isSuperAdmin) return <SuperAdminStack />;
    if (isAdmin)      return <AdminStack />;
    if (isCoach)      return <CoachStack />;
    return <StudentStack />;
  };

  return (
    <NavigationContainer>
      {renderStack()}
    </NavigationContainer>
  );
}
