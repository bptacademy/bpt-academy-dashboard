import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  total: number;
  current: number; // 1-based
}

export default function OnboardingProgress({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            i < current ? styles.barActive : styles.barInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  barActive: { backgroundColor: '#E63F6B' },
  barInactive: { backgroundColor: '#1A2C42' },
});
