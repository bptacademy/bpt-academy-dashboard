import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation';
import { supabase } from './src/lib/supabase';

export default function App() {
  const [stripeKey, setStripeKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase
      .from('academy_settings')
      .select('value')
      .eq('key', 'stripe_publishable_key')
      .single()
      .then(({ data }) => {
        if (data?.value) setStripeKey(data.value);
      });
  }, []);

  return (
    <StripeProvider publishableKey={stripeKey ?? 'pk_live_placeholder'}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </StripeProvider>
  );
}
