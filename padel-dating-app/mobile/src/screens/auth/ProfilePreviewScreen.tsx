import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function ProfilePreviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Preview</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  sub: { color: '#4A6080', marginTop: 8 },
});
