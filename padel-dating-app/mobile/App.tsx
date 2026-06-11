import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';
import SplashScreen from './src/screens/auth/SplashScreen';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded] = useFonts({
    'AdelphiPETRIAL-Eb':   require('./assets/fonts/AdelphiPETRIAL-Eb.otf'),
    'AdelphiPETRIAL-EbIt': require('./assets/fonts/AdelphiPETRIAL-EbIt.otf'),
    'AdelphiPETRIAL-Lt':   require('./assets/fonts/AdelphiPETRIAL-Lt.otf'),
    'AdelphiPETRIAL-LtIt': require('./assets/fonts/AdelphiPETRIAL-LtIt.otf'),
    'Brinnan Bold':        require('./assets/fonts/Brinnan Bold.otf'),
    'Brinnan Light':       require('./assets/fonts/Brinnan Light.otf'),
  });
  // Timeout fallback: if fonts don't load in 3s (Metro asset URL bug in dev), proceed anyway
  const [fontsTimeout, setFontsTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontsTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Wait for fonts before showing splash (so wordmark/tagline render correctly)
  if (!fontsLoaded && !fontsTimeout) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1628', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00D4C8" />
      </View>
    );
  }

  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
