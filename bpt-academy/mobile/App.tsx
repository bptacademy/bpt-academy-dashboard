import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';
import { supabase } from './src/lib/supabase';

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  const [fontsLoaded] = useFonts({
    'AdelphiPETRIAL-Eb':   require('./assets/fonts/AdelphiPETRIAL-Eb.otf'),
    'AdelphiPETRIAL-EbIt': require('./assets/fonts/AdelphiPETRIAL-EbIt.otf'),
    'AdelphiPETRIAL-Lt':   require('./assets/fonts/AdelphiPETRIAL-Lt.otf'),
    'AdelphiPETRIAL-LtIt': require('./assets/fonts/AdelphiPETRIAL-LtIt.otf'),
    'Brinnan Bold':        require('./assets/fonts/Brinnan Bold.otf'),
    'Brinnan Light':       require('./assets/fonts/Brinnan Light.otf'),
  });

  // Handle deep links for password reset
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        // Parse the tokens from the URL and set the session
        const parsed = new URL(url.replace('#', '?'));
        const accessToken  = parsed.searchParams.get('access_token');
        const refreshToken = parsed.searchParams.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
        navRef.current?.navigate('ResetPassword');
      }
    };

    // App opened from background via deep link
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    // App opened cold via deep link
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1628', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Navigation navRef={navRef} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
