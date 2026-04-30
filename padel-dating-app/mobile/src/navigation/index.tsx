import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../lib/theme';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import EmailSignupScreen from '../screens/auth/EmailSignupScreen';
import OnboardingResumeScreen from '../screens/auth/OnboardingResumeScreen';
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

import ConnectHomeScreen from '../screens/connect/ConnectHomeScreen';
import PlayerProfileScreen from '../screens/connect/PlayerProfileScreen';
import MutualVolleyMatchScreen from '../screens/connect/MutualVolleyMatchScreen';
import ConversationScreen from '../screens/connect/ConversationScreen';
import ConnectionsListScreen from '../screens/connect/ConnectionsListScreen';
import PostMatchPromptScreen from '../screens/connect/PostMatchPromptScreen';

import PlayHomeScreen from '../screens/play/PlayHomeScreen';

import MyProfileScreen from '../screens/profile/MyProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MyStatsScreen from '../screens/profile/MyStatsScreen';
import PlatformSyncScreen from '../screens/profile/PlatformSyncScreen';

import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import BlockedUsersScreen from '../screens/settings/BlockedUsersScreen';
import DeleteAccountScreen from '../screens/settings/DeleteAccountScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ConnectStack = createNativeStackNavigator();
const PlayStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const ONBOARDING_SCREENS = (Stack: any) => (
  <>
    <Stack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
    <Stack.Screen name="PlatformLogin" component={PlatformLoginScreen} />
    <Stack.Screen name="SyncingProfile" component={SyncingProfileScreen} />
    <Stack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
    <Stack.Screen name="Question1Location" component={Question1LocationScreen} />
    <Stack.Screen name="Question2Intent" component={Question2IntentScreen} />
    <Stack.Screen name="Question3Visibility" component={Question3VisibilityScreen} />
    <Stack.Screen name="Question4Bio" component={Question4BioScreen} />
    <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
    <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
  </>
);

function ConnectNavigator() {
  return (
    <ConnectStack.Navigator screenOptions={{ headerShown: false }}>
      <ConnectStack.Screen name="ConnectHome" component={ConnectHomeScreen} />
      <ConnectStack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <ConnectStack.Screen name="MutualVolleyMatch" component={MutualVolleyMatchScreen} />
      <ConnectStack.Screen name="Conversation" component={ConversationScreen} />
      <ConnectStack.Screen name="PostMatchPrompt" component={PostMatchPromptScreen} />
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
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Connect: '💘', Play: '🎾', Messages: '💬', Profile: '👤',
          };
          return (
            <Text style={{ fontSize: 26, opacity: focused ? 1 : 0.4 }}>
              {icons[route.name]}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Connect" component={ConnectNavigator} />
      <Tab.Screen name="Play" component={PlayNavigator} />
      <Tab.Screen name="Messages" component={MessagesNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { session, user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      {!session ? (
        // Not logged in → Welcome + sign up + full onboarding
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="EmailSignup" component={EmailSignupScreen} />
          {ONBOARDING_SCREENS(RootStack)}
        </RootStack.Navigator>
      ) : !user?.profile_complete ? (
        // Logged in but not finished — resume from the right step
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="OnboardingResume" component={OnboardingResumeScreen} />
          {ONBOARDING_SCREENS(RootStack)}
        </RootStack.Navigator>
      ) : (
        // Fully onboarded → main app
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
