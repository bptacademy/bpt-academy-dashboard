import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
export default function PlatformSelectScreen({ navigation }: any) {
  const platforms = [
    { id: 'playtomic', label: '🎾 Playtomic' },
    { id: 'matchi', label: '🏸 Matchi' },
    { id: 'on_the_court', label: '🎯 On the Court' },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your platform</Text>
      {platforms.map(p => (
        <TouchableOpacity key={p.id} style={styles.btn} onPress={() => navigation.navigate('PlatformLogin', { platform: p.id })}>
          <Text style={styles.btnText}>{p.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 32, textAlign: 'center' },
  btn: { backgroundColor: '#1A2C42', borderRadius: 14, padding: 18, marginBottom: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
