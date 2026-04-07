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

  // Show back arrow whenever we're deeper than the root of this stack
  const state = navigation.getState();
  const canGoBack = state && state.index > 0;

  const handleLogoPress = () => {
    const parent = navigation.getParent();
    if (parent) {
      const parentState = parent.getState();
      const firstTab = parentState?.routeNames?.[0];
      if (firstTab) parent.navigate(firstTab);
    }
  };

  return (
    <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
      {/* Left: back arrow when deep, logo at tab root */}
      {canGoBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backIcon, dark && styles.backIconDark]}>‹</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handleLogoPress} style={styles.logoBtn}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Title */}
      <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>

      {/* Right placeholder keeps title centred */}
      <View style={canGoBack ? styles.rightPlaceholderSmall : styles.rightPlaceholder} />
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

  // Logo (tab root)
  logoBtn: { width: 88, height: 72, justifyContent: 'center' },
  logo: { width: 88, height: 72 },

  // Back arrow (deep in stack)
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { fontSize: 34, color: '#374151', lineHeight: 40 },
  backIconDark: { color: '#FFFFFF' },

  title: {
    flex: 1, fontSize: 17, fontWeight: '700', color: '#111827',
    textAlign: 'center', marginHorizontal: 8,
  },
  titleDark: { color: '#FFFFFF' },

  // Balancing placeholder — matches left element width
  rightPlaceholder: { width: 88 },      // matches logo width
  rightPlaceholderSmall: { width: 44 }, // matches back button width
});
