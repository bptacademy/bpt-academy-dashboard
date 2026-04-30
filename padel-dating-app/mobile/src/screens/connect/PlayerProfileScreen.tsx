import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function PlayerProfileScreen({ route }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Player Profile</Text>
      <Text style={styles.sub}>{route.params?.userId}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  sub: { color: '#4A6080', marginTop: 8 },
});
