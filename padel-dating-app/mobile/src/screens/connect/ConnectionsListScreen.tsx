import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function ConnectionsListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>💬 Messages</Text>
      <Text style={styles.sub}>Your connections will appear here</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  sub: { color: '#4A6080', marginTop: 8 },
});
