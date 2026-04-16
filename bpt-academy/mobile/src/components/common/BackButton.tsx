import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  color?: string;
}

export default function BackButton({ color = '#F0F6FC' }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  if (!navigation.canGoBack()) return null;

  return (
    <TouchableOpacity
      style={[styles.btn, { top: insets.top + 8 }]}
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.arrow, { color }]}>‹</Text>
      <Text style={[styles.label, { color }]}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  arrow: { fontSize: 28, lineHeight: 32, marginRight: 2 },
  label: { fontSize: 16, fontWeight: '600' },
});
