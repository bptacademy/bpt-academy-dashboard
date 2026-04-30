import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function MutualVolleyMatchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💘</Text>
      <Text style={styles.text}>It's a match!</Text>
      <Text style={styles.sub}>The court is yours.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  text: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  sub: { color: '#E63F6B', marginTop: 8, fontSize: 16 },
});
