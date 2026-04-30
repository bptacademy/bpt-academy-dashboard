import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Text style={styles.logo}>volpair</Text>
        <Text style={styles.tagline}>Find your pair.</Text>
      </View>
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('PlatformSelect')}>
          <Text style={styles.btnText}>Connect with Playtomic</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PlatformSelect')}>
          <Text style={styles.altLink}>Don't have Playtomic? Use a different platform</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 48, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  tagline: { fontSize: 18, color: '#E63F6B', marginTop: 8, fontWeight: '500' },
  bottom: { paddingBottom: 24, gap: 16 },
  btn: { backgroundColor: '#E63F6B', borderRadius: 16, padding: 18, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  altLink: { color: '#4A6080', fontSize: 13, textAlign: 'center' },
});
