import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, ActivityIndicator, TextInput, Dimensions, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Profile, UserRole } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;

// ─── Helpers ────────────────────────────────────────────────────────────
const ROLES: { key: UserRole; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'super_admin', label: 'Super Admin', emoji: '👑', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'admin',       label: 'Admin',       emoji: '🛡️',  color: '#16A34A', bg: '#F0FDF4' },
  { key: 'coach',       label: 'Coach',       emoji: '🎾',  color: '#EA580C', bg: '#FFF7ED' },
  { key: 'student',     label: 'Student',     emoji: '🎓',  color: '#2563EB', bg: '#EFF6FF' },
  { key: 'parent',      label: 'Parent',      emoji: '👪',  color: '#0891B2', bg: '#ECFEFF' },
];

const roleInfo = (role: UserRole) => ROLES.find((r) => r.key === role) ?? ROLES[3];

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

// ─── Component ──────────────────────────────────────────────────────────
export default function SuperAdminHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile: me } = useAuth();

  const [stats, setStats] = useState({ total: 0, students: 0, coaches: 0, admins: 0, superAdmins: 0 });
  const [users, setUsers]       = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalUser, setModalUser]   = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [saving, setSaving]         = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (!data) return;
    setUsers(data);
    setStats({
      total:       data.length,
      students:    data.filter((u) => u.role === 'student').length,
      coaches:     data.filter((u) => u.role === 'coach').length,
      admins:      data.filter((u) => u.role === 'admin').length,
      superAdmins: data.filter((u) => u.role === 'super_admin').length,
    });
  }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchUsers(); setRefreshing(false); };
  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.full_name.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [users, search, roleFilter]);

  const openRoleModal = (user: Profile) => {
    if (user.id === me?.id) {
      Alert.alert('Cannot edit yourself', 'Use another Super Admin account to change your own role.');
      return;
    }
    setModalUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!modalUser) return;
    if (selectedRole === modalUser.role) { setModalUser(null); return; }

    if (selectedRole === 'super_admin') {
      Alert.alert(
        '👑 Promote to Super Admin?',
        `${modalUser.full_name} will have full platform control. This cannot be undone easily.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Promote', style: 'destructive', onPress: () => doSaveRole() },
        ]
      );
      return;
    }

    if (modalUser.role === 'super_admin') {
      Alert.alert(
        '⚠️ Remove Super Admin?',
        `${modalUser.full_name} will lose all Super Admin privileges.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'destructive', onPress: () => doSaveRole() },
        ]
      );
      return;
    }

    await doSaveRole();
  };

  const doSaveRole = async () => {
    if (!modalUser) return;
    setSaving(true);
    const { error } = await supabase.rpc('assign_user_role', {
      target_user_id: modalUser.id,
      new_role: selectedRole,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setModalUser(null);
    Alert.alert('✅ Role updated', `${modalUser.full_name} is now ${selectedRole.replace('_', ' ')}.`);
    fetchUsers();
  };

  const STAT_ITEMS = [
    { label: 'Total',       value: stats.total,       color: '#374151', filter: 'all' as const },
    { label: 'Students',    value: stats.students,    color: '#2563EB', filter: 'student' as const },
    { label: 'Coaches',     value: stats.coaches,     color: '#EA580C', filter: 'coach' as const },
    { label: 'Admins',      value: stats.admins,      color: '#16A34A', filter: 'admin' as const },
    { label: 'Super Admin', value: stats.superAdmins, color: '#7C3AED', filter: 'super_admin' as const },
  ];

  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScreenHeader
        title=""
        homeHeader
        profileName={me?.full_name}
        profileRole={me?.role}
        profileAvatar={(me as any)?.avatar_url ?? null}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 104) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky stats bar */}
        <View style={styles.statsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            {STAT_ITEMS.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[styles.statCell, roleFilter === s.filter && { borderBottomWidth: 2, borderBottomColor: s.color }]}
                onPress={() => setRoleFilter(s.filter)}
              >
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search + role filter chips */}
        <View style={styles.filterBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search users…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChips}>
            {(['all', 'super_admin', 'admin', 'coach', 'student', 'parent'] as const).map((r) => {
              const active = roleFilter === r;
              const info = r !== 'all' ? roleInfo(r as UserRole) : null;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, active && { backgroundColor: info?.color ?? '#374151', borderColor: info?.color ?? '#374151' }]}
                  onPress={() => setRoleFilter(r)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {r === 'all' ? 'All' : `${info?.emoji} ${info?.label}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* User list */}
        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          )}
          {filtered.map((user) => {
            const ri = roleInfo(user.role);
            const isMe = user.id === me?.id;
            return (
              <TouchableOpacity
                key={user.id}
                style={styles.card}
                onPress={() => openRoleModal(user)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: ri.color }]}>
                  <Text style={styles.avatarText}>{initials(user.full_name)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{user.full_name}</Text>
                    {isMe && <Text style={styles.meBadge}>YOU</Text>}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: ri.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: ri.color }]}>
                      {ri.emoji} {ri.label}
                    </Text>
                  </View>
                  {user.phone && <Text style={styles.phone}>{user.phone}</Text>}
                </View>
                {!isMe && <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Role change modal */}
      <Modal
        visible={!!modalUser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalUser(null)}
      >
        {modalUser && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalUser(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Change Role</Text>
              <TouchableOpacity onPress={handleSaveRole} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#16A34A" />
                  : <Text style={[styles.modalSave, selectedRole === modalUser.role && { opacity: 0.4 }]}>Save</Text>
                }
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalUser}>
                <View style={[styles.modalAvatar, { backgroundColor: roleInfo(modalUser.role).color }]}>
                  <Text style={styles.modalAvatarText}>{initials(modalUser.full_name)}</Text>
                </View>
                <Text style={styles.modalUserName}>{modalUser.full_name}</Text>
                <Text style={styles.modalCurrentRole}>
                  Current: {roleInfo(modalUser.role).emoji} {roleInfo(modalUser.role).label}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Assign New Role</Text>

              {ROLES.map((r) => {
                const selected = selectedRole === r.key;
                const isCurrent = modalUser.role === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[
                      styles.roleOption,
                      selected && { borderColor: r.color, borderWidth: 2, backgroundColor: r.bg },
                    ]}
                    onPress={() => setSelectedRole(r.key)}
                  >
                    <View style={styles.roleOptionLeft}>
                      <Text style={styles.roleOptionEmoji}>{r.emoji}</Text>
                      <View>
                        <Text style={[styles.roleOptionLabel, selected && { color: r.color, fontWeight: '700' }]}>
                          {r.label}{isCurrent ? ' (current)' : ''}
                        </Text>
                        <Text style={styles.roleOptionDesc}>
                          {r.key === 'super_admin' && 'Full platform control · manage all users & settings'}
                          {r.key === 'admin'       && 'Org-level · manage coaches, students, billing'}
                          {r.key === 'coach'       && 'Own programs & students · no settings access'}
                          {r.key === 'student'     && 'Standard student access'}
                          {r.key === 'parent'      && 'View child progress & receive notifications'}
                        </Text>
                      </View>
                    </View>
                    {selected && <Text style={[styles.roleOptionCheck, { color: r.color }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {selectedRole === 'super_admin' && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    👑 Super Admin has full access to everything — including user management and billing. Only grant to trusted team members.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },

  // Stats bar — horizontal scroll
  statsBar: { backgroundColor: 'rgba(11,22,40,0.9)', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsScroll: { flexDirection: 'row', paddingHorizontal: 8 },
  statCell: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20,
    minWidth: 80, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  statNum: { fontSize: 22, fontWeight: '700', color: '#F0F6FC' },
  statLabel: { fontSize: 11, color: '#7A8FA6', marginTop: 3, fontWeight: '500' },

  filterBar: { backgroundColor: 'rgba(11,22,40,0.85)', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  searchInput: {
    backgroundColor: 'rgba(23,34,64,0.9)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: '#F0F6FC',
  },
  roleChips: { gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: 1, borderColor: 'rgba(30,48,80,0.8)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(17,30,51,0.85)',
  },
  chipText: { fontSize: 13, color: '#7A8FA6', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: 'rgba(17,30,51,0.85)', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(30,48,80,0.8)',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
  cardInfo: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#F0F6FC' },
  meBadge: {
    fontSize: 10, fontWeight: '800', color: '#7C3AED',
    backgroundColor: '#F5F3FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, letterSpacing: 0.5,
  },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  phone: { fontSize: 12, color: '#9CA3AF' },
  chevron: { fontSize: 22, color: '#D1D5DB', marginLeft: 8 },
  empty: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  section: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  actionIcon: { fontSize: 30, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6B7280' },
  modalSave: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  modalBody: { padding: 24 },
  modalUser: { alignItems: 'center', marginBottom: 28 },
  modalAvatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 24 },
  modalUserName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalCurrentRole: { fontSize: 14, color: '#6B7280' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  roleOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  roleOptionEmoji: { fontSize: 26 },
  roleOptionLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  roleOptionDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  roleOptionCheck: { fontSize: 20, fontWeight: '700' },
  warningBox: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#DDD6FE', marginTop: 8 },
  warningText: { fontSize: 13, color: '#5B21B6', lineHeight: 20 },
});
