import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { theme, fonts } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { user, refreshUser } = useAuth();

  const [pushVolley, setPushVolley] = useState(true);
  const [pushServe, setPushServe] = useState(true);
  const [pushPostMatch, setPushPostMatch] = useState(true);
  const [pushSync, setPushSync] = useState(false);
  const [showDistance, setShowDistance] = useState(true);
  const [radarVisible, setRadarVisible] = useState<boolean>(
    user?.radar_visible !== undefined ? user.radar_visible : true,
  );

  const handleRadarVisibleToggle = async (value: boolean) => {
    setRadarVisible(value);
    if (user?.id) {
      await supabase.from('users').update({ radar_visible: value }).eq('id', user.id);
      await refreshUser();
    }
  };

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const ToggleRow = ({ label, sub, value, onChange, last }: any) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={theme.textPrimary}
      />
    </View>
  );

  const NavRow = ({ label, sub, screen, last }: any) => (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={() => navigation.navigate(screen)}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Text style={styles.rowArrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPadding }]}>

        <Section title="Notifications">
          <ToggleRow label="Volley matches" sub="When you and someone match" value={pushVolley} onChange={setPushVolley} />
          <ToggleRow label="New Serves" sub="Messages from connections" value={pushServe} onChange={setPushServe} />
          <ToggleRow label="Post-match prompts" sub="24h after you play" value={pushPostMatch} onChange={setPushPostMatch} />
          <ToggleRow label="Sync complete" sub="When new matches are imported" value={pushSync} onChange={setPushSync} last />
        </Section>

        <Section title="Privacy">
          <ToggleRow
            label="Show distance"
            sub="Let others see roughly how far you are"
            value={showDistance}
            onChange={setShowDistance}
          />
          <ToggleRow
            label="Appear on Radar"
            sub="Let other players discover you nearby"
            value={radarVisible}
            onChange={handleRadarVisibleToggle}
            last
          />
        </Section>

        <Section title="Account">
          <NavRow label="Blocked users" screen="BlockedUsers" />
          <NavRow label="Delete account" screen="DeleteAccount" last />
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  backText: { fontSize: 16, color: theme.textSecondary, fontFamily: fonts.bodyLight },
  scroll: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: fonts.bodyBold, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  sectionCard: {
    backgroundColor: theme.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, color: theme.textPrimary, fontFamily: fonts.bodyLight },
  rowSub: { fontSize: 12, color: theme.textMuted, marginTop: 2, fontFamily: fonts.bodyLight },
  rowArrow: { fontSize: 20, color: theme.textMuted },
});
