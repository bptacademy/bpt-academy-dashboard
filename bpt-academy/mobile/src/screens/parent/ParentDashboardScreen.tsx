import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Profile, Division, DIVISION_LABELS, DIVISION_COLORS } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

interface ChildStats {
  upcomingSessions: number;
  attendancePct: number;
  currentLevel: string;
}

interface ChildCard extends Profile {
  stats: ChildStats;
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ParentDashboardScreen({ navigation }: any) {
  const { profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [children, setChildren] = useState<ChildCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = useCallback(async () => {
    if (!profile) return;

    const { data: accessRows } = await supabase
      .from('parent_access')
      .select('student_id')
      .eq('parent_id', profile.id);

    if (!accessRows || accessRows.length === 0) {
      setChildren([]);
      return;
    }

    const studentIds = accessRows.map((r: any) => r.student_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds);

    if (!profiles) {
      setChildren([]);
      return;
    }

    const now = new Date().toISOString();

    const cards = await Promise.all(
      profiles.map(async (child: Profile): Promise<ChildCard> => {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('program_id')
          .eq('student_id', child.id)
          .eq('status', 'active');

        let upcomingSessions = 0;
        if (enrollments && enrollments.length > 0) {
          const programIds = enrollments.map((e: any) => e.program_id);
          const { count } = await supabase
            .from('program_sessions')
            .select('*', { count: 'exact', head: true })
            .in('program_id', programIds)
            .gte('scheduled_at', now);
          upcomingSessions = count ?? 0;
        }

        const { data: attended } = await supabase
          .from('session_attendance')
          .select('attended')
          .eq('student_id', child.id);
        let attendancePct = 0;
        if (attended && attended.length > 0) {
          const yes = attended.filter((a: any) => a.attended).length;
          attendancePct = Math.round((yes / attended.length) * 100);
        }

        const division = child.division as Division | undefined;
        const currentLevel = division ? (DIVISION_LABELS[division] ?? division) : 'Not set';

        return { ...child, stats: { upcomingSessions, attendancePct, currentLevel } };
      }),
    );

    setChildren(cards);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchChildren().finally(() => setLoading(false));
    }, [fetchChildren]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChildren();
    setRefreshing(false);
  };

  const renderChildCard = (child: ChildCard) => {
    const initial = child.full_name?.charAt(0)?.toUpperCase() ?? '?';
    const division = child.division as Division | undefined;
    const divColor = division ? (DIVISION_COLORS[division] ?? '#16A34A') : '#16A34A';
    const divLabel = division ? (DIVISION_LABELS[division] ?? division) : 'Junior';
    const age = child.date_of_birth ? calcAge(child.date_of_birth) : null;

    return (
      <View key={child.id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: divColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.childName}>{child.full_name}</Text>
            {age !== null && <Text style={styles.childAge}>{age} years old</Text>}
            <View style={[styles.divisionBadge, { backgroundColor: divColor + '20', borderColor: divColor }]}>
              <Text style={[styles.divisionBadgeText, { color: divColor }]}>{divLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{child.stats.upcomingSessions}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{child.stats.attendancePct}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue} numberOfLines={1}>{child.stats.currentLevel}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('ParentChildDetail', { child })}
        >
          <Text style={styles.viewBtnText}>View Profile →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScreenHeader
        title=""
        homeHeader
        profileName={profile?.full_name}
        profileRole={profile?.role}
        profileAvatar={(profile as any)?.avatar_url ?? null}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingText}>Loading your children's profiles...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />}
        >
          <Text style={styles.sectionTitle}>
            {children.length === 0
              ? 'No children registered yet'
              : `Your ${children.length === 1 ? 'Child' : 'Children'}`}
          </Text>

          {children.map(renderChildCard)}

          {children.length < 3 && (
            <TouchableOpacity
              style={styles.addChildBtn}
              onPress={() => navigation.navigate('AddChild')}
            >
              <Text style={styles.addChildIcon}>+</Text>
              <Text style={styles.addChildText}>Add Child</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, backgroundColor: 'transparent' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', marginBottom: 14, marginTop: 4 },

  card: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  childName: { fontSize: 17, fontWeight: '700', color: '#F0F6FC' },
  childAge: { fontSize: 13, color: '#7A8FA6', marginTop: 1 },
  divisionBadge: {
    marginTop: 6, alignSelf: 'flex-start', borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3,
  },
  divisionBadgeText: { fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(23,34,64,0.6)', borderRadius: 10, paddingVertical: 12, marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#22C55E', maxWidth: 80 },
  statLabel: { fontSize: 11, color: '#7A8FA6', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },

  viewBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  addChildBtn: {
    borderWidth: 2, borderColor: '#16A34A', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8,
  },
  addChildIcon: { fontSize: 22, color: '#16A34A', fontWeight: '700' },
  addChildText: { fontSize: 15, color: '#16A34A', fontWeight: '700' },

  signOutBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { fontSize: 14, color: '#6B7280' },
});
