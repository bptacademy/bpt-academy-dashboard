import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { SkillLevel } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competition'];
const SKILL_COLORS: Record<SkillLevel, string> = {
  beginner: '#3B82F6',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
  competition: '#8B5CF6',
};

export default function ProfileScreen() {
  const { profile, signOut, previewRole, setPreviewRole, effectiveRole, refreshProfile } = useAuth();

  const isActualAdmin = profile?.role === 'admin' || profile?.role === 'coach';
  const isViewingAsStudent = effectiveRole === 'student';

  // Edit form state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Parse stored date (YYYY-MM-DD) into a Date object
  const parseDob = (str: string | null | undefined): Date => {
    if (!str) return new Date(2000, 0, 1);
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const [dobDate, setDobDate] = useState<Date>(parseDob(profile?.date_of_birth));

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    emergency_contact: profile?.emergency_contact ?? '',
    skill_level: (profile?.skill_level ?? 'beginner') as SkillLevel,
  });

  // Format Date → display string
  const formatDobDisplay = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Format Date → ISO string for DB (YYYY-MM-DD)
  const formatDobIso = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isStudent = profile?.role === 'student';

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const filePath = `${profile!.id}.${ext}`;

    setUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: filePath,
        type: `image/${ext}`,
      } as any);

      const res = await fetch(
        `https://nobxhhnhakawhbimrate.supabase.co/storage/v1/object/avatars/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'sb_publishable_vnFb-ACqDwBiYt4PcKXC5Q_Ty8LRYoR',
            'x-upsert': 'true',
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error('Upload failed');

      const avatarUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile!.id);
      await refreshProfile();
      Alert.alert('✅ Photo updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      date_of_birth: formatDobIso(dobDate),
      emergency_contact: form.emergency_contact.trim() || null,
      skill_level: isStudent ? form.skill_level : profile?.skill_level,
    }).eq('id', profile!.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshProfile();
    setEditing(false);
    Alert.alert('✅ Profile saved!');
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('✅ Password changed!');
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.full_name ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Profile" />
      <ScrollView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {uploadingAvatar ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.role}>{profile?.role?.charAt(0).toUpperCase()}{profile?.role?.slice(1)}</Text>
          {profile?.skill_level && (
            <View style={[styles.skillBadge, { backgroundColor: SKILL_COLORS[profile.skill_level] + '25' }]}>
              <Text style={[styles.skillBadgeText, { color: SKILL_COLORS[profile.skill_level] }]}>
                {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Edit / Save toggle */}
        <View style={styles.editToggleRow}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveEditText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.card}>
            <Field label="Full Name" value={form.full_name} editing={editing}
              onChangeText={(v) => setForm({ ...form, full_name: v })} placeholder="Your full name" />
            <View style={styles.divider} />
            <Field label="Phone" value={form.phone} editing={editing}
              onChangeText={(v) => setForm({ ...form, phone: v })} placeholder="+44 7700 000000"
              keyboardType="phone-pad" />
            <View style={styles.divider} />
            {/* Date of Birth — calendar picker */}
            <View style={styles.dobRow}>
              <Text style={styles.dobLabel}>Date of Birth</Text>
              {editing ? (
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dobPickerBtn}>
                  <Text style={styles.dobPickerText}>{formatDobDisplay(dobDate)}</Text>
                  <Text style={styles.dobCalIcon}>📅</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.dobValue}>{profile?.date_of_birth ? formatDobDisplay(parseDob(profile.date_of_birth)) : '—'}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <Field label="Emergency Contact" value={form.emergency_contact} editing={editing}
              onChangeText={(v) => setForm({ ...form, emergency_contact: v })} placeholder="Name & phone number" />
          </View>
        </View>

        {/* Skill level — students only */}
        {isStudent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skill Level</Text>
            <View style={styles.skillGrid}>
              {SKILL_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.skillChip,
                    form.skill_level === level && { backgroundColor: SKILL_COLORS[level], borderColor: SKILL_COLORS[level] },
                    !editing && { opacity: 0.7 },
                  ]}
                  onPress={() => editing && setForm({ ...form, skill_level: level })}
                  disabled={!editing}
                >
                  <Text style={[styles.skillChipText, form.skill_level === level && styles.skillChipTextActive]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setPasswordModal(true)}>
              <Text style={styles.rowLabel}>Change Password</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer (admin only) */}
        {isActualAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>View as Student</Text>
                  <Text style={styles.rowHint}>Preview the student experience</Text>
                </View>
                <Switch
                  value={isViewingAsStudent}
                  onValueChange={(val) => setPreviewRole(val ? 'student' : null)}
                  trackColor={{ false: '#D1D5DB', true: '#16A34A' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        )}

        {/* App */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row}>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.row}>
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>BPT Academy v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Date picker — renders inline on iOS as a spinner */}
      {showDatePicker && (
        <Modal animationType="slide" transparent presentationStyle="overFullScreen">
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalSheet}>
              <View style={styles.dateModalHeader}>
                <Text style={styles.dateModalTitle}>Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateModalDone}>
                  <Text style={styles.dateModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dobDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(_event, date) => { if (date) setDobDate(date); }}
                themeVariant="light"
                textColor="#111827"
                style={{ width: '100%', height: 200, backgroundColor: '#FFFFFF' }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Change password modal */}
      <Modal visible={passwordModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={changingPassword}>
              {changingPassword
                ? <ActivityIndicator color="#16A34A" />
                : <Text style={styles.modalSave}>Save</Text>
              }
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat new password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Reusable field component
function Field({ label, value, editing, onChangeText, placeholder, keyboardType }: {
  label: string; value: string; editing: boolean;
  onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={fieldStyles.row}>
      <Text style={fieldStyles.label}>{label}</Text>
      {editing ? (
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType ?? 'default'}
        />
      ) : (
        <Text style={fieldStyles.value}>{value || '—'}</Text>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, minHeight: 54 },
  label: { fontSize: 15, color: '#374151', flex: 1 },
  value: { fontSize: 15, color: '#6B7280', flex: 1.5, textAlign: 'right' },
  input: { fontSize: 15, color: '#111827', flex: 1.5, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: { backgroundColor: '#FFFFFF', alignItems: 'center', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  cameraIcon: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },
  skillBadge: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  skillBadgeText: { fontSize: 13, fontWeight: '600' },

  // Edit toggle
  editToggleRow: { flexDirection: 'row', gap: 10, padding: 16 },
  editBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  cancelEditBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelEditText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveEditBtn: { flex: 2, backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveEditText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Sections
  section: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chevron: { fontSize: 20, color: '#D1D5DB' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  // Skill level
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillChip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#FFFFFF' },
  skillChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  skillChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Bottom
  signOutBtn: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  signOutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 32 },

  // Password modal
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6B7280' },
  modalSave: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  modalBody: { padding: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 16, color: '#111827', marginBottom: 20, backgroundColor: '#F9FAFB' },

  // DOB row
  dobRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, minHeight: 54 },
  dobLabel: { fontSize: 15, color: '#374151', flex: 1 },
  dobValue: { fontSize: 15, color: '#6B7280' },
  dobPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dobPickerText: { fontSize: 15, color: '#16A34A', fontWeight: '500' },
  dobCalIcon: { fontSize: 16 },

  // Date picker modal
  dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, overflow: 'hidden' },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dateModalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  dateModalDone: { backgroundColor: '#16A34A', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  dateModalDoneText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
