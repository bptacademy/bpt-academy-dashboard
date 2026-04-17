import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ScreenHeader from '../../components/common/ScreenHeader';

type ConfirmStatus = 'confirmed' | 'declined' | 'maybe' | 'pending';

interface Props {
  navigation: any;
  route: {
    params: {
      session_id: string;
      program_title: string;
      session_time: string;
      editable_until: string;
    };
  };
}

export default function AttendanceConfirmScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const { session_id, program_title, session_time, editable_until } = route.params;

  const [current, setCurrent] = useState<ConfirmStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const deadline = new Date(editable_until);
  const isPastDeadline = new Date() > deadline;
  const sessionDate = new Date(session_time);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });

  useEffect(() => {
    const fetch = async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('attendance_confirmations')
        .select('status')
        .eq('session_id', session_id)
        .eq('student_id', profile.id)
        .maybeSingle();
      if (data) setCurrent(data.status as ConfirmStatus);
      setLoading(false);
    };
    fetch();
  }, [profile, session_id]);

  const handleSelect = async (status: ConfirmStatus) => {
    if (isPastDeadline) {
      Alert.alert('Deadline passed', `You can no longer change your response after ${formatDate(deadline)}.`);
      return;
    }
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('attendance_confirmations')
      .upsert({
        session_id,
        student_id: profile.id,
        status,
        responded_at: new Date().toISOString(),
        editable_until,
      }, { onConflict: 'session_id,student_id' });

    if (error) {
      Alert.alert('Error', 'Could not save your response. Please try again.');
    } else {
      setCurrent(status);
    }
    setSaving(false);
  };

  const options: { status: ConfirmStatus; label: string; icon: string; color: string; bg: string }[] = [
    { status: 'confirmed', label: "Yes, I'll be there",  icon: '✅', color: '#16A34A', bg: '#ECFDF5' },
    { status: 'maybe',     label: "Maybe / Not sure",    icon: '🤔', color: '#D97706', bg: '#FFFBEB' },
    { status: 'declined',  label: "No, I can't make it", icon: '❌', color: '#DC2626', bg: '#FEF2F2' },
  ];

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />

      <ScreenHeader title="Confirm Attendance" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>

        {/* Session info card */}
        <View style={styles.sessionCard}>
          <Text style={styles.programTitle}>{program_title}</Text>
          <Text style={styles.sessionTime}>📅 {formatDate(sessionDate)}</Text>
          {!isPastDeadline ? (
            <Text style={styles.deadline}>
              ⏰ Change deadline: {formatDate(deadline)}
            </Text>
          ) : (
            <View style={styles.deadlinePassed}>
              <Text style={styles.deadlinePassedText}>🔒 Deadline passed — response locked</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.prompt}>Will you attend this session?</Text>

            {options.map((opt) => {
              const isSelected = current === opt.status;
              return (
                <TouchableOpacity
                  key={opt.status}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: isSelected ? opt.bg : '#FFFFFF', borderColor: isSelected ? opt.color : '#E5E7EB' },
                    isSelected && styles.optionSelected,
                    isPastDeadline && styles.optionDisabled,
                  ]}
                  onPress={() => handleSelect(opt.status)}
                  disabled={saving || isPastDeadline}
                  activeOpacity={0.75}
                >
                  <Text style={styles.optionIcon}>{opt.icon}</Text>
                  <Text style={[styles.optionLabel, isSelected && { color: opt.color, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Text style={[styles.checkMark, { color: opt.color }]}>●</Text>}
                </TouchableOpacity>
              );
            })}

            {saving && (
              <ActivityIndicator size="small" color="#16A34A" style={{ marginTop: 16 }} />
            )}

            {current !== 'pending' && !isPastDeadline && (
              <Text style={styles.changeHint}>
                You can change your response until {formatDate(deadline)}.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20  paddingBottom: 80,},

  sessionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 28,
  },
  programTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sessionTime: { fontSize: 14, color: '#374151', marginBottom: 6 },
  deadline: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  deadlinePassed: {
    marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  deadlinePassedText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },

  prompt: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 18, marginBottom: 12,
    borderWidth: 2, gap: 14,
  },
  optionSelected: {
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  optionDisabled: { opacity: 0.6 },
  optionIcon: { fontSize: 24 },
  optionLabel: { flex: 1, fontSize: 16, color: '#374151' },
  checkMark: { fontSize: 14 },

  changeHint: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    marginTop: 12, lineHeight: 20,
  },
});
