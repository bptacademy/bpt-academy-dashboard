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
    const state = navigation.getState();
    if (state && state.index > 0) {
      // Deep in a stack — pop back to root of this stack
      navigation.popToTop();
    } else {
      // Already at root of this stack — jump to HomeTab / DashboardTab
      const parent = navigation.getParent();
      if (parent) {
        const parentState = parent.getState();
        const firstTab = parentState?.routeNames?.[0];
        if (firstTab) {
          parent.navigate(firstTab);
        }
      }
    }
  };

  return (
    <View style={[styles.header, dark && styles.headerDark, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={handleLogoPress} style={styles.logoBtn}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>{title}</Text>
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
