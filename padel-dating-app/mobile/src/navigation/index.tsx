import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Auth / Onboarding screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import EmailSignupScreen from '../screens/auth/EmailSignupScreen';
import PlatformSelectScreen from '../screens/auth/PlatformSelectScreen';
import PlatformLoginScreen from '../screens/auth/PlatformLoginScreen';
import SyncingProfileScreen from '../screens/auth/SyncingProfileScreen';
import ProfilePreviewScreen from '../screens/auth/ProfilePreviewScreen';
import Question1LocationScreen from '../screens/auth/Question1LocationScreen';
import Question2IntentScreen from '../screens/auth/Question2IntentScreen';
import Question3VisibilityScreen from '../screens/auth/Question3VisibilityScreen';
import Question4BioScreen from '../screens/auth/Question4BioScreen';
import PhotoUploadScreen from '../screens/auth/PhotoUploadScreen';
import OnboardingCompleteScreen from '../screens/auth/OnboardingCompleteScreen';

// Main app screens
import ConnectHomeScreen from '../screens/connect/ConnectHomeScreen';
import PlayerProfileScreen from '../screens/connect/PlayerProfileScreen';
import MutualVolleyMatchScreen from '../screens/connect/MutualVolleyMatchScreen';
import ConversationScreen from '../screens/connect/ConversationScreen';
import ConnectionsListScreen from '../screens/connect/ConnectionsListScreen';
import PlayHomeScreen from '../screens/play/PlayHomeScreen';
import MyProfileScreen from '../screens/profile/MyProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MyStatsScreen from '../screens/profile/MyStatsScreen';
import PlatformSyncScreen from '../screens/profile/PlatformSyncScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ConnectStack = createNativeStackNavigator();
const PlayStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ConnectNavigator() {
  return (
    <ConnectStack.Navigator screenOptions={{ headerShown: false }}>
      <ConnectStack.Screen name="ConnectHome" component={ConnectHomeScreen} />
      <ConnectStack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <ConnectStack.Screen name="MutualVolleyMatch" component={MutualVolleyMatchScreen} />
      <ConnectStack.Screen name="Conversation" component={ConversationScreen} />
    </ConnectStack.Navigator>
  );
}

function PlayNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayHome" component={PlayHomeScreen} />
    </PlayStack.Navigator>
  );
}

function MessagesNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="ConnectionsList" component={ConnectionsListScreen} />
      <MessagesStack.Screen name="Conversation" component={ConversationScreen} />
    </MessagesStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="MyProfile" component={MyProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="MyStats" component={MyStatsScreen} />
      <ProfileStack.Screen name="PlatformSync" component={PlatformSyncScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0D1B2A', borderTopColor: '#1A2C42', height: 60 },
        tabBarActiveTintColor: '#E63F6B',
        tabBarInactiveTintColor: '#4A6080',
        tabBarLabel: ({ color }) => {
          const labels: Record<string, string> = {
            Connect: '💘', Play: '🎾', Messages: '💬', Profile: '👤',
          };
          return <Text style={{ fontSize: 20 }}>{labels[route.name]}</Text>;
        },
        tabBarShowLabel: true,
        tabBarIcon: () => null,
      })}
    >
      <Tab.Screen name="Connect" component={ConnectNavigator} />
      <Tab.Screen name="Play" component={PlayNavigator} />
      <Tab.Screen name="Messages" component={MessagesNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

// Onboarding stack — used when logged in but profile not complete
function OnboardingNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
      <RootStack.Screen name="PlatformLogin" component={PlatformLoginScreen} />
      <RootStack.Screen name="SyncingProfile" component={SyncingProfileScreen} />
      <RootStack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
      <RootStack.Screen name="Question1Location" component={Question1LocationScreen} />
      <RootStack.Screen name="Question2Intent" component={Question2IntentScreen} />
      <RootStack.Screen name="Question3Visibility" component={Question3VisibilityScreen} />
      <RootStack.Screen name="Question4Bio" component={Question4BioScreen} />
      <RootStack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <RootStack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </RootStack.Navigator>
  );
}

export default function Navigation() {
  const { session, user, loading } = useAuth();

  if (loading) return null;

  // Not logged in → show welcome + email signup
  if (!session) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="EmailSignup" component={EmailSignupScreen} />
          <RootStack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
          <RootStack.Screen name="PlatformLogin" component={PlatformLoginScreen} />
          <RootStack.Screen name="SyncingProfile" component={SyncingProfileScreen} />
          <RootStack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
          <RootStack.Screen name="Question1Location" component={Question1LocationScreen} />
          <RootStack.Screen name="Question2Intent" component={Question2IntentScreen} />
          <RootStack.Screen name="Question3Visibility" component={Question3VisibilityScreen} />
          <RootStack.Screen name="Question4Bio" component={Question4BioScreen} />
          <RootStack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
          <RootStack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  // Logged in but profile not complete → onboarding
  if (!user?.profile_complete) {
    return (
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  }

  // Fully onboarded → main app
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
