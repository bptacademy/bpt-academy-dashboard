import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';

export default function ReEnrollmentScreen({ route, navigation }: any) {
  const { enrollmentId, programId, programTitle, price, deadline } = route.params;
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  useEffect(() => {
    // Check if already confirmed
    supabase
      .from('enrollments')
      .select('confirmed_next_month, payment_confirmed')
      .eq('id', enrollmentId)
      .single()
      .then(({ data }) => {
        if (data?.confirmed_next_month) setAlreadyConfirmed(true);
        setLoading(false);
      });
  }, [enrollmentId]);

  const deadlineDate = new Date(deadline);
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleConfirmFree = async () => {
    setConfirming(true);
    await supabase
      .from('enrollments')
      .update({ confirmed_next_month: true, payment_confirmed: true })
      .eq('id', enrollmentId);
    // Send in-app notification to coach
    await supabase.from('notifications').insert({
      recipient_id: profile!.id,
      title: '✅ Re-enrollment confirmed',
      body: `You have confirmed your place in ${programTitle} for next month.`,
      type: 'reenrollment',
      read: false,
    });
    setConfirming(false);
    Alert.alert(
      '✅ Confirmed!',
      `Your place in ${programTitle} is secured for next month.`,
      [{ text: 'Great!', onPress: () => navigation.goBack() }]
    );
  };

  const handleConfirmPaid = () => {
    // Navigate to payment screen — on success, update enrollment
    navigation.navigate('Payment', {
      programId,
      studentId: profile!.id,
      amount: price,
      programDivision: 'amateur',
      enrollmentId,
      isReEnrollment: true,
    });
  };

  const handleDecline = () => {
    Alert.alert(
      'Skip Next Month?',
      `If you decline, you will lose your priority spot in ${programTitle}. You can join the waiting list for next month instead.`,
      [
        { text: 'Keep My Spot', style: 'cancel' },
        {
          text: 'Decline', style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            await supabase
              .from('enrollments')
              .update({ confirmed_next_month: false, status: 'completed' })
              .eq('id', enrollmentId);
            setDeclining(false);
            Alert.alert(
              'Noted',
              "You've been removed from next month's program. You can join the waiting list if you change your mind.",
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={styles.loading}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
<ActivityIndicator size="large" color="#16A34A" /></View>
  );

  return (
    <View style={styles.container}>
      <BackHeader title="Re-enrollment" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>

        {alreadyConfirmed ? (
          <View style={styles.confirmedCard}>
            <Text style={styles.confirmedIcon}>✅</Text>
            <Text style={styles.confirmedTitle}>You're confirmed!</Text>
            <Text style={styles.confirmedSub}>
              Your place in {programTitle} for next month is secured.
            </Text>
          </View>
        ) : (
          <>
            {/* Header card */}
            <View style={styles.headerCard}>
              <Text style={styles.headerEmoji}>🎾</Text>
              <Text style={styles.headerTitle}>Continue Next Month?</Text>
              <Text style={styles.headerSub}>{programTitle}</Text>
            </View>

            {/* Deadline */}
            <View style={[styles.deadlineCard, daysLeft <= 2 && styles.deadlineUrgent]}>
              <Text style={styles.deadlineLabel}>
                {daysLeft === 0 ? '⚠️ Deadline is today!' : `⏰ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to confirm`}
              </Text>
              <Text style={styles.deadlineDate}>
                Deadline: {deadlineDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>As a current student you get priority 🏆</Text>
              <Text style={styles.infoText}>
                Confirm your place before the deadline and you'll be automatically enrolled for next month — before anyone on the waiting list.
              </Text>
              {price > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Monthly fee</Text>
                  <Text style={styles.priceValue}>£{parseFloat(price).toFixed(2)}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.confirmBtn, confirming && { opacity: 0.6 }]}
              onPress={price > 0 ? handleConfirmPaid : handleConfirmFree}
              disabled={confirming}
            >
              {confirming
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.confirmBtnText}>
                    {price > 0 ? `✅ Confirm & Pay £${parseFloat(price).toFixed(2)}` : '✅ Confirm My Place — Free'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineBtn, declining && { opacity: 0.6 }]}
              onPress={handleDecline}
              disabled={declining}
            >
              <Text style={styles.declineBtnText}>Skip Next Month</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16  paddingBottom: 80,},

  confirmedCard: {
    backgroundColor: '#ECFDF5', borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0',
  },
  confirmedIcon: { fontSize: 56, marginBottom: 12 },
  confirmedTitle: { fontSize: 22, fontWeight: '800', color: '#16A34A', marginBottom: 8 },
  confirmedSub: { fontSize: 15, color: '#166534', textAlign: 'center', lineHeight: 22 },

  headerCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 14,
  },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  deadlineCard: {
    backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#FED7AA',
  },
  deadlineUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  deadlineLabel: { fontSize: 15, fontWeight: '700', color: '#EA580C', marginBottom: 2 },
  deadlineDate: { fontSize: 13, color: '#9A3412' },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  priceLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  priceValue: { fontSize: 18, fontWeight: '800', color: '#16A34A' },

  confirmBtn: {
    backgroundColor: '#16A34A', borderRadius: 14, padding: 18,
    alignItems: 'center', marginBottom: 12,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  declineBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  declineBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
});
