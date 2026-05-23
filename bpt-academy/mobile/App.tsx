import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';
import { supabase } from './src/lib/supabase';

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  // Handle deep links for password reset
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        const parsed = new URL(url.replace('#', '?'));
        const accessToken  = parsed.searchParams.get('access_token');
        const refreshToken = parsed.searchParams.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
        navRef.current?.navigate('ResetPassword');
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Navigation navRef={navRef} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
