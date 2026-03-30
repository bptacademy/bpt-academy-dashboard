import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title: string;
  dark?: boolean;
}

export default function ScreenHeader({ title, dark = false }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogoPress = () => {
    // Only pop if we're deeper than root in this stack — avoids POP_TO_TOP error
    const state = navigation.getState();
    if (state && state.index > 0) {
      navigation.popToTop();
    }
  };

  return (
    <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
      {/* Logo — taps to root of current stack */}
      <TouchableOpacity onPress={handleLogoPress} style={styles.logoBtn}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Page title — centred */}
      <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>

      {/* Empty view for balance */}
      <View style={styles.rightPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center', marginHorizontal: 8 },
  titleDark: { color: '#FFFFFF' },
  rightPlaceholder: { width: 44 },
});
