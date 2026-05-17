import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../lib/theme';
import { useVolleyMatch } from '../hooks/useVolleyMatch';
import { usePushNotifications } from '../hooks/usePushNotifications';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import EmailSignupScreen from '../screens/auth/EmailSignupScreen';
import OnboardingResumeScreen from '../screens/auth/OnboardingResumeScreen';
import PlatformSelectScreen from '../screens/auth/PlatformSelectScreen';
import PlatformLoginScreen from '../screens/auth/PlatformLoginScreen';
import PlaytomicWebLoginScreen from '../screens/auth/PlaytomicWebLoginScreen';
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
import RadarScreen from '../screens/radar/RadarScreen';

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
const RadarStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const ONBOARDING_SCREENS = (Stack: any) => (
  <>
    <Stack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
    <Stack.Screen name="PlatformLogin" component={PlatformLoginScreen} />
    <Stack.Screen name="PlaytomicWebLogin" component={PlaytomicWebLoginScreen} />
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
      <ConnectStack.Screen name="Notifications" component={NotificationsScreen} />
    </ConnectStack.Navigator>
  );
}

function PlayNavigator() {
  return (
    <PlayStack.Navigator screenOptions={{ headerShown: false }}>
      <PlayStack.Screen name="PlayHome" component={PlayHomeScreen} />
      {/* PlayerProfile accessible from Court History cards */}
      <PlayStack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
    </PlayStack.Navigator>
  );
}

function RadarNavigator() {
  return (
    <RadarStack.Navigator screenOptions={{ headerShown: false }}>
      <RadarStack.Screen name="RadarHome" component={RadarScreen} />
      <RadarStack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
    </RadarStack.Navigator>
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

function MainTabs({ navRef }: { navRef: React.RefObject<NavigationContainerRef<any>> }) {
  const insets = useSafeAreaInsets();

  usePushNotifications((notification) => {
    const data = notification.request.content.data as any;
    if (data?.type === 'match' && data?.connectionId) {
      navRef.current?.navigate('Connect', {
        screen: 'MutualVolleyMatch',
        params: { connectionId: data.connectionId },
      });
    } else if (data?.type === 'serve' && data?.connectionId) {
      navRef.current?.navigate('Messages', {
        screen: 'Conversation',
        params: { connectionId: data.connectionId },
      });
    } else if (data?.type === 'volley') {
      navRef.current?.navigate('Connect');
    }
  });

  useVolleyMatch((match) => {
    navRef.current?.navigate('Connect', {
      screen: 'MutualVolleyMatch',
      params: {
        connectionId: match.connectionId,
        matchedUserId: match.matchedUserId,
        matchedUserName: match.matchedUserName,
        matchedUserPhoto: match.matchedUserPhoto,
      },
    });
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 48 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Connect: '💘', Play: '🎾', Radar: '📡', Messages: '💬', Profile: '👤',
          };
          return (
            <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.4 }}>
              {icons[route.name]}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Connect" component={ConnectNavigator} />
      <Tab.Screen name="Play" component={PlayNavigator} />
      <Tab.Screen name="Radar" component={RadarNavigator} />
      <Tab.Screen name="Messages" component={MessagesNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { session, user, loading } = useAuth();
  const navRef = useRef<NavigationContainerRef<any>>(null);

  if (loading) return null;

  return (
    <NavigationContainer ref={navRef}>
      {!session ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="EmailSignup" component={EmailSignupScreen} />
          {ONBOARDING_SCREENS(RootStack)}
        </RootStack.Navigator>
      ) : !user?.profile_complete ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="OnboardingResume" component={OnboardingResumeScreen} />
          {ONBOARDING_SCREENS(RootStack)}
        </RootStack.Navigator>
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs">
            {() => <MainTabs navRef={navRef} />}
          </RootStack.Screen>
          <RootStack.Screen
            name="PlaytomicWebLoginModal"
            component={PlaytomicWebLoginScreen}
            options={{ presentation: 'modal' }}
          />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
