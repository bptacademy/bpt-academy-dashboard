import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ImageBackground } from 'react-native';
const APP_BG = require('../../assets/volpair-bg-v2.png');
import { theme } from '../lib/theme';
import { useVolleyMatch } from '../hooks/useVolleyMatch';
import { usePushNotifications } from '../hooks/usePushNotifications';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import EmailSignupScreen from '../screens/auth/EmailSignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OnboardingResumeScreen from '../screens/auth/OnboardingResumeScreen';
import PlatformSelectScreen from '../screens/auth/PlatformSelectScreen';
import PlatformLoginScreen from '../screens/auth/PlatformLoginScreen';
import PlaytomicWebLoginScreen from '../screens/auth/PlaytomicWebLoginScreen';
import SyncingProfileScreen from '../screens/auth/SyncingProfileScreen';
import ProfilePreviewScreen from '../screens/auth/ProfilePreviewScreen';
import Question0NameScreen from '../screens/auth/Question0NameScreen';
import Question0DOBScreen from '../screens/auth/Question0DOBScreen';
import Question1LocationScreen from '../screens/auth/Question1LocationScreen';
import Question2IntentScreen from '../screens/auth/Question2IntentScreen';
import Question3VisibilityScreen from '../screens/auth/Question3VisibilityScreen';
import Question4BioScreen from '../screens/auth/Question4BioScreen';
import Question5LevelScreen from '../screens/auth/Question5LevelScreen';
import Question6PlayStyleScreen from '../screens/auth/Question6PlayStyleScreen';
import Question7AvailabilityScreen from '../screens/auth/Question7AvailabilityScreen';
import PhotoUploadScreen from '../screens/auth/PhotoUploadScreen';
import OnboardingCompleteScreen from '../screens/auth/OnboardingCompleteScreen';
import PermissionNotificationsScreen from '../screens/auth/PermissionNotificationsScreen';
import PermissionLocationScreen from '../screens/auth/PermissionLocationScreen';

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
import OTCConnectScreen from '../screens/profile/OTCConnectScreen';

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

// ─── Tab bar icons ────────────────────────────────────────────────────────────
const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Connect:  { inactive: require('../../assets/icons/connect-inactive.png'),  active: require('../../assets/icons/connect-active.png') },
  Play:     { inactive: require('../../assets/icons/play-inactive.png'),     active: require('../../assets/icons/play-active.png') },
  Radar:    { inactive: require('../../assets/icons/radar-inactive.png'),    active: require('../../assets/icons/radar-active.png') },
  Messages: { inactive: require('../../assets/icons/messages-inactive.png'), active: require('../../assets/icons/messages-active.png') },
  Profile:  { inactive: require('../../assets/icons/profile-inactive.png'),  active: require('../../assets/icons/profile-active.png') },
};

// ─── Floating pill tab bar ────────────────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.tabBarWrapper, { bottom: 24 }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
                {icons && (
                  <Image
                    source={isFocused ? icons.active : icons.inactive}
                    style={styles.tabIcon}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 16, 30, 0.72)',
    borderRadius: 40,
    width: '94%',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  iconPillActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabIcon: {
    width: 38,
    height: 38,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.primary,
    marginTop: 4,
  },
});

// ─── Navigators ───────────────────────────────────────────────────────────────

const ONBOARDING_SCREENS = (Stack: any) => (
  <>
    <Stack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
    <Stack.Screen name="PlatformLogin" component={PlatformLoginScreen} />
    <Stack.Screen name="PlaytomicWebLogin" component={PlaytomicWebLoginScreen} />
    <Stack.Screen name="SyncingProfile" component={SyncingProfileScreen} />
    <Stack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
    <Stack.Screen name="Question0Name" component={Question0NameScreen} />
    <Stack.Screen name="Question0DOB" component={Question0DOBScreen} />
    <Stack.Screen name="Question1Location" component={Question1LocationScreen} />
    <Stack.Screen name="Question2Intent" component={Question2IntentScreen} />
    <Stack.Screen name="Question3Visibility" component={Question3VisibilityScreen} />
    <Stack.Screen name="Question4Bio" component={Question4BioScreen} />
    <Stack.Screen name="Question5Level" component={Question5LevelScreen} />
    <Stack.Screen name="Question6PlayStyle" component={Question6PlayStyleScreen} />
    <Stack.Screen name="Question7Availability" component={Question7AvailabilityScreen} />
    <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
    <Stack.Screen name="PermissionNotifications" component={PermissionNotificationsScreen} />
    <Stack.Screen name="PermissionLocation" component={PermissionLocationScreen} />
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
      <ProfileStack.Screen name="OTCConnect" component={OTCConnectScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs({ navRef }: { navRef: React.RefObject<NavigationContainerRef<any>> }) {
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
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
    <ImageBackground source={APP_BG} style={{ flex: 1 }} resizeMode="cover">
    <NavigationContainer ref={navRef}>
      {!session ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          <RootStack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
          <RootStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <RootStack.Screen name="EmailSignup" component={EmailSignupScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
    </ImageBackground>
  );
}
