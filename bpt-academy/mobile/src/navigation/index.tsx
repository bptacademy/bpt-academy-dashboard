import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ParentRegisterScreen from '../screens/auth/ParentRegisterScreen';

// Parent screens
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import ParentChildDetailScreen from '../screens/parent/ParentChildDetailScreen';
import AddChildScreen from '../screens/parent/AddChildScreen';

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
import CalendarDayScreen from '../screens/student/CalendarDayScreen';
import AttendanceConfirmScreen from '../screens/student/AttendanceConfirmScreen';
import ReEnrollmentScreen from '../screens/student/ReEnrollmentScreen';

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
import ScheduleGeneratorScreen from '../screens/coach/ScheduleGeneratorScreen';
import PromotionManageScreen from '../screens/coach/PromotionManageScreen';

// Admin-only screens
import CoachHomeScreen from '../screens/coach/CoachHomeScreen';
import BulkMessageScreen from '../screens/coach/BulkMessageScreen';
import PaymentReconciliationScreen from '../screens/coach/PaymentReconciliationScreen';
import AcademySettingsScreen from '../screens/coach/AcademySettingsScreen';
import BillingSettingsScreen from '../screens/coach/BillingSettingsScreen';

// Coach-only home
import CoachDashboardScreen from '../screens/coach/CoachDashboardScreen';

// Super Admin
import SuperAdminHomeScreen from '../screens/superadmin/SuperAdminHomeScreen';
import SuperAdminMessagesScreen from '../screens/superadmin/SuperAdminMessagesScreen';
import ReportsScreen from '../screens/superadmin/ReportsScreen';

// Notifications (shared — all roles)
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/legal/TermsOfServiceScreen';

// Messaging
import NewConversationScreen from '../screens/messaging/NewConversationScreen';
import ChatScreen from '../screens/messaging/ChatScreen';

// Tab bar shared options
function useTabBarScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom;
  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopColor: '#E5E7EB',
      borderTopWidth: 1,
      paddingTop: 6,
      paddingBottom: bottomPad,
      height: 56 + bottomPad,
    },
    tabBarActiveTintColor: '#16A34A',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
    tabBarLabelPosition: 'below-icon' as const,
  };
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ParentRegister" component={ParentRegisterScreen} />
    </Stack.Navigator>
  );
}

// Parent Stack
function ParentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentDashboard"   component={ParentDashboardScreen} />
      <Stack.Screen name="ParentChildDetail" component={ParentChildDetailScreen} />
      <Stack.Screen name="AddChild"          component={AddChildScreen} />
      <Stack.Screen name="Payment"           component={PaymentScreen} />
      <Stack.Screen name="Profile"           component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// ─── STUDENT ────────────────────────────────────────────────────────────────

function StudentHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"                component={HomeScreen} />
      <Stack.Screen name="CalendarDay"         component={CalendarDayScreen} />
      <Stack.Screen name="ProgramDetail"       component={ProgramDetailScreen} />
      <Stack.Screen name="VideoPlayer"         component={VideoPlayerScreen} />
      <Stack.Screen name="TournamentDetail"    component={TournamentDetailScreen} />
      <Stack.Screen name="Videos"              component={VideosScreen} />
      <Stack.Screen name="Progress"            component={ProgressScreen} />
      <Stack.Screen name="Leaderboard"         component={LeaderboardScreen} />
      <Stack.Screen name="Tournaments"         component={TournamentListScreen} />
      <Stack.Screen name="TournamentList"      component={TournamentListScreen} />
      <Stack.Screen name="MyCoachNotes"        component={MyCoachNotesScreen} />
      <Stack.Screen name="Payment"             component={PaymentScreen} />
      <Stack.Screen name="Chat"                component={ChatScreen} />
      <Stack.Screen name="NewConversation"     component={NewConversationScreen} />
      <Stack.Screen name="AttendanceConfirm"   component={AttendanceConfirmScreen} />
      <Stack.Screen name="ReEnrollment"        component={ReEnrollmentScreen} />
      <Stack.Screen name="Notifications"       component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function StudentProgramsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Programs"           component={ProgramsScreen} />
      <Stack.Screen name="ProgramDetail"      component={ProgramDetailScreen} />
      <Stack.Screen name="VideoPlayer"        component={VideoPlayerScreen} />
      <Stack.Screen name="Payment"            component={PaymentScreen} />
      <Stack.Screen name="AttendanceConfirm"  component={AttendanceConfirmScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function StudentMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Messages"           component={MessagesScreen} />
      <Stack.Screen name="MyCoachNotes"       component={MyCoachNotesScreen} />
      <Stack.Screen name="Chat"               component={ChatScreen} />
      <Stack.Screen name="NewConversation"    component={NewConversationScreen} />
      <Stack.Screen name="AttendanceConfirm"  component={AttendanceConfirmScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function StudentProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile"            component={ProfileScreen} />
      <Stack.Screen name="AttendanceConfirm"  component={AttendanceConfirmScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function StudentTabs() {
  const tabBarScreenOptions = useTabBarScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen name="HomeTab"     component={StudentHomeStack}     options={{ title: 'Home',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tab.Screen name="ProgramsTab" component={StudentProgramsStack} options={{ title: 'Programs', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }} />
      <Tab.Screen name="MessagesTab" component={StudentMessagesStack} options={{ title: 'Messages', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
      <Tab.Screen name="ProfileTab"  component={StudentProfileStack}  options={{ title: 'Profile',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

// ─── COACH ──────────────────────────────────────────────────────────────────

function CoachHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"          component={CoachDashboardScreen} />
      <Stack.Screen name="Manage"             component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"      component={ProgramRosterScreen} />
      <Stack.Screen name="ProgramModules"     component={ProgramModulesScreen} />
      <Stack.Screen name="ScheduleGenerator"  component={ScheduleGeneratorScreen} />
      <Stack.Screen name="ManageVideos"       component={ManageVideosScreen} />
      <Stack.Screen name="UploadVideo"        component={UploadVideoScreen} />
      <Stack.Screen name="VideoPlayer"        component={VideoPlayerScreen} />
      <Stack.Screen name="DivisionDashboard"  component={DivisionDashboardScreen} />
      <Stack.Screen name="TournamentManage"   component={TournamentManageScreen} />
      <Stack.Screen name="TournamentDetail"   component={TournamentDetailScreen} />
      <Stack.Screen name="Announce"           component={SendAnnouncementScreen} />
      <Stack.Screen name="Chat"               component={ChatScreen} />
      <Stack.Screen name="NewConversation"    component={NewConversationScreen} />
      <Stack.Screen name="Students"           component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"      component={StudentDetailScreen} />
      <Stack.Screen name="Attendance"         component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"         component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage"    component={PromotionManageScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function CoachStudentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Students"        component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"   component={StudentDetailScreen} />
      <Stack.Screen name="Attendance"      component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"      component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage" component={PromotionManageScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function CoachMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Messages"        component={MessagesScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Announce"        component={SendAnnouncementScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function CoachProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile"           component={ProfileScreen} />
      <Stack.Screen name="Manage"            component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"     component={ProgramRosterScreen} />
      <Stack.Screen name="ManageVideos"      component={ManageVideosScreen} />
      <Stack.Screen name="Students"          component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"     component={StudentDetailScreen} />
      <Stack.Screen name="DivisionDashboard" component={DivisionDashboardScreen} />
      <Stack.Screen name="Attendance"        component={AttendanceScreen} />
      <Stack.Screen name="Notifications"     component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function CoachTabs() {
  const tabBarScreenOptions = useTabBarScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen name="HomeTab"     component={CoachHomeStack}     options={{ title: 'Home',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tab.Screen name="StudentsTab" component={CoachStudentsStack} options={{ title: 'Students', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text> }} />
      <Tab.Screen name="MessagesTab" component={CoachMessagesStack} options={{ title: 'Messages', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
      <Tab.Screen name="ProfileTab"  component={CoachProfileStack}  options={{ title: 'Profile',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

function AdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"          component={CoachHomeScreen} />
      <Stack.Screen name="Reports"            component={ReportsScreen} />
      <Stack.Screen name="Manage"             component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"      component={ProgramRosterScreen} />
      <Stack.Screen name="ProgramModules"     component={ProgramModulesScreen} />
      <Stack.Screen name="ScheduleGenerator"  component={ScheduleGeneratorScreen} />
      <Stack.Screen name="VideoPlayer"        component={VideoPlayerScreen} />
      <Stack.Screen name="Payments"           component={PaymentReconciliationScreen} />
      <Stack.Screen name="BulkMsg"            component={BulkMessageScreen} />
      <Stack.Screen name="Announce"           component={SendAnnouncementScreen} />
      <Stack.Screen name="AcademySettings"    component={AcademySettingsScreen} />
      <Stack.Screen name="BillingSettings"    component={BillingSettingsScreen} />
      <Stack.Screen name="DivisionDashboard"  component={DivisionDashboardScreen} />
      <Stack.Screen name="TournamentManage"   component={TournamentManageScreen} />
      <Stack.Screen name="TournamentDetail"   component={TournamentDetailScreen} />
      <Stack.Screen name="ManageVideos"       component={ManageVideosScreen} />
      <Stack.Screen name="UploadVideo"        component={UploadVideoScreen} />
      <Stack.Screen name="Students"           component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"      component={StudentDetailScreen} />
      <Stack.Screen name="Attendance"         component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"         component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage"    component={PromotionManageScreen} />
      <Stack.Screen name="Chat"               component={ChatScreen} />
      <Stack.Screen name="NewConversation"    component={NewConversationScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function AdminStudentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Students"        component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"   component={StudentDetailScreen} />
      <Stack.Screen name="Attendance"      component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"      component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage" component={PromotionManageScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function AdminProgramsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Manage"            component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"     component={ProgramRosterScreen} />
      <Stack.Screen name="ProgramModules"    component={ProgramModulesScreen} />
      <Stack.Screen name="ScheduleGenerator" component={ScheduleGeneratorScreen} />
      <Stack.Screen name="ManageVideos"      component={ManageVideosScreen} />
      <Stack.Screen name="UploadVideo"       component={UploadVideoScreen} />
      <Stack.Screen name="VideoPlayer"       component={VideoPlayerScreen} />
      <Stack.Screen name="StudentDetail"     component={StudentDetailScreen} />
      <Stack.Screen name="Notifications"     component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function AdminMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Messages"        component={MessagesScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const tabBarScreenOptions = useTabBarScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen name="DashboardTab" component={AdminDashboardStack} options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }} />
      <Tab.Screen name="StudentsTab"  component={AdminStudentsStack}  options={{ title: 'Students',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text> }} />
      <Tab.Screen name="ProgramsTab"  component={AdminProgramsStack}  options={{ title: 'Programs',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }} />
      <Tab.Screen name="MessagesTab"  component={AdminMessagesStack}  options={{ title: 'Messages',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
    </Tab.Navigator>
  );
}

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────

function SuperAdminDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"          component={CoachHomeScreen} />
      <Stack.Screen name="Reports"            component={ReportsScreen} />
      <Stack.Screen name="Manage"             component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"      component={ProgramRosterScreen} />
      <Stack.Screen name="ProgramModules"     component={ProgramModulesScreen} />
      <Stack.Screen name="ScheduleGenerator"  component={ScheduleGeneratorScreen} />
      <Stack.Screen name="VideoPlayer"        component={VideoPlayerScreen} />
      <Stack.Screen name="Students"           component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"      component={StudentDetailScreen} />
      <Stack.Screen name="Attendance"         component={AttendanceScreen} />
      <Stack.Screen name="CoachNotes"         component={CoachNotesScreen} />
      <Stack.Screen name="PromotionManage"    component={PromotionManageScreen} />
      <Stack.Screen name="ManageVideos"       component={ManageVideosScreen} />
      <Stack.Screen name="UploadVideo"        component={UploadVideoScreen} />
      <Stack.Screen name="Payments"           component={PaymentReconciliationScreen} />
      <Stack.Screen name="BulkMsg"            component={BulkMessageScreen} />
      <Stack.Screen name="Announce"           component={SendAnnouncementScreen} />
      <Stack.Screen name="AcademySettings"    component={AcademySettingsScreen} />
      <Stack.Screen name="BillingSettings"    component={BillingSettingsScreen} />
      <Stack.Screen name="DivisionDashboard"  component={DivisionDashboardScreen} />
      <Stack.Screen name="TournamentManage"   component={TournamentManageScreen} />
      <Stack.Screen name="TournamentDetail"   component={TournamentDetailScreen} />
      <Stack.Screen name="Chat"               component={ChatScreen} />
      <Stack.Screen name="NewConversation"    component={NewConversationScreen} />
      <Stack.Screen name="Notifications"      component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function SuperAdminUsersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuperAdminHome" component={SuperAdminHomeScreen} />
      <Stack.Screen name="StudentDetail"  component={StudentDetailScreen} />
      <Stack.Screen name="Notifications"  component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function SuperAdminMessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Messages"        component={SuperAdminMessagesScreen} />
      <Stack.Screen name="Chat"            component={ChatScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="BulkMsg"         component={BulkMessageScreen} />
      <Stack.Screen name="Announce"        component={SendAnnouncementScreen} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function SuperAdminProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile"           component={ProfileScreen} />
      <Stack.Screen name="Manage"            component={ManageProgramsScreen} />
      <Stack.Screen name="ProgramRoster"     component={ProgramRosterScreen} />
      <Stack.Screen name="ManageVideos"      component={ManageVideosScreen} />
      <Stack.Screen name="Students"          component={ManageStudentsScreen} />
      <Stack.Screen name="StudentDetail"     component={StudentDetailScreen} />
      <Stack.Screen name="DivisionDashboard" component={DivisionDashboardScreen} />
      <Stack.Screen name="Attendance"        component={AttendanceScreen} />
      <Stack.Screen name="Notifications"     component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy"   component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService"  component={TermsOfServiceScreen} />
    </Stack.Navigator>
  );
}

function SuperAdminTabs() {
  const tabBarScreenOptions = useTabBarScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabBarScreenOptions}>
      <Tab.Screen name="DashboardTab" component={SuperAdminDashboardStack} options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }} />
      <Tab.Screen name="UsersTab"     component={SuperAdminUsersStack}     options={{ title: 'Users',     tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👑</Text> }} />
      <Tab.Screen name="MessagesTab"  component={SuperAdminMessagesStack}  options={{ title: 'Messages',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
      <Tab.Screen name="ProfileTab"   component={SuperAdminProfileStack}   options={{ title: 'Profile',   tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function RootNavigator() {
  const { session, loading, isSuperAdmin, isAdmin, isCoach, profile } = useAuth();
  if (loading) return null;
  const renderStack = () => {
    if (!session)                   return <AuthStack />;
    if (isSuperAdmin)               return <SuperAdminTabs />;
    if (isAdmin)                    return <AdminTabs />;
    if (isCoach)                    return <CoachTabs />;
    if (profile?.role === 'parent') return <ParentStack />;
    return <StudentTabs />;
  };
  return <NavigationContainer>{renderStack()}</NavigationContainer>;
}
