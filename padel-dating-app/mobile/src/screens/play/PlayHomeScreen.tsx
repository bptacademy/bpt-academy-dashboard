import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function PlayHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎾 Play</Text>
      <Text style={styles.sub}>Find a partner coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  sub: { color: '#4A6080', marginTop: 8 },
});
