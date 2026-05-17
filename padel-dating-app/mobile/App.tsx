import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';

export default function App() {
  const [fontsLoaded] = useFonts({
    'AdelphiPETRIAL-Eb':   require('./assets/fonts/AdelphiPETRIAL-Eb.otf'),
    'AdelphiPETRIAL-EbIt': require('./assets/fonts/AdelphiPETRIAL-EbIt.otf'),
    'AdelphiPETRIAL-Lt':   require('./assets/fonts/AdelphiPETRIAL-Lt.otf'),
    'AdelphiPETRIAL-LtIt': require('./assets/fonts/AdelphiPETRIAL-LtIt.otf'),
    'Brinnan Bold':        require('./assets/fonts/Brinnan Bold.otf'),
    'Brinnan Light':       require('./assets/fonts/Brinnan Light.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#00D4C8" />
      </View>
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
