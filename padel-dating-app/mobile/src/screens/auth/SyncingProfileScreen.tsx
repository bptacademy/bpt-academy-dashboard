import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
export default function SyncingProfileScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#E63F6B" />
      <Text style={styles.text}>Building your profile from your match history…</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { color: '#7A9CC0', fontSize: 16, marginTop: 24, textAlign: 'center', lineHeight: 24 },
});
