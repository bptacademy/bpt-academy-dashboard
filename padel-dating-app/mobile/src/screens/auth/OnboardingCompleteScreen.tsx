import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
export default function OnboardingCompleteScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎾</Text>
      <Text style={styles.title}>You're in.</Text>
      <Text style={styles.sub}>Your first match is waiting.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('MainTabs')}>
        <Text style={styles.btnText}>Let's go</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  sub: { fontSize: 16, color: '#7A9CC0', marginBottom: 48 },
  btn: { backgroundColor: '#E63F6B', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 18 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
