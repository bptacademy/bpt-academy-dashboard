import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Court, CourtBooking } from '../../types';
import BackHeader from '../../components/common/BackHeader';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayLabel(date: Date): string {
  const today = new Date();
  const diff = Math.round((date.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function CourtBookingScreen({ navigation }: { navigation: any }) {
  const { profile } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<CourtBooking[]>([]);
  const [myBookings, setMyBookings] = useState<CourtBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('*').eq('is_active', true).order('name');
    if (data) {
      setCourts(data as Court[]);
      if (data.length > 0 && !selectedCourt) setSelectedCourt(data[0] as Court);
    }
  };

  const fetchBookings = useCallback(async () => {
    if (!selectedCourt) return;
    const dateStr = formatDate(selectedDate);
    const { data } = await supabase
      .from('court_bookings')
      .select('*')
      .eq('court_id', selectedCourt.id)
      .eq('booking_date', dateStr)
      .eq('status', 'confirmed');
    if (data) setBookings(data as CourtBooking[]);
  }, [selectedCourt, selectedDate]);

  const fetchMyBookings = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('court_bookings')
      .select('*, court:courts(*)')
      .eq('student_id', profile.id)
      .eq('status', 'confirmed')
      .gte('booking_date', formatDate(new Date()))
      .order('booking_date')
      .limit(5);
    if (data) setMyBookings(data as CourtBooking[]);
  }, [profile]);

  useEffect(() => {
    fetchCourts().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const isSlotBooked = (hour: number): boolean => {
    const startStr = `${pad(hour)}:00:00`;
    return bookings.some(b => b.start_time === startStr);
  };

  const isMySlot = (hour: number): boolean => {
    if (!profile) return false;
    const startStr = `${pad(hour)}:00:00`;
    return bookings.some(b => b.start_time === startStr && b.student_id === profile.id);
  };

  const handleBook = async (hour: number) => {
    if (!profile || !selectedCourt) return;
    const dateStr = formatDate(selectedDate);
    Alert.alert(
      'Confirm Booking',
      `Book ${selectedCourt.name} on ${dateStr} at ${pad(hour)}:00?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book',
          onPress: async () => {
            setBooking(true);
            const { error } = await supabase.from('court_bookings').insert({
              court_id: selectedCourt.id,
              student_id: profile.id,
              booking_date: dateStr,
              start_time: `${pad(hour)}:00:00`,
              end_time: `${pad(hour + 1)}:00:00`,
              status: 'confirmed',
            });
            setBooking(false);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              await Promise.all([fetchBookings(), fetchMyBookings()]);
            }
          },
        },
      ],
    );
  };

  const handleCancel = async (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('court_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
          await Promise.all([fetchBookings(), fetchMyBookings()]);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <BackHeader title="Court Booking" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Court selector */}
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={styles.loader} />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Court</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courtRow}>
                {courts.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.courtChip, selectedCourt?.id === c.id && styles.courtChipActive]}
                    onPress={() => setSelectedCourt(c)}
                  >
                    <Text style={[styles.courtChipText, selectedCourt?.id === c.id && styles.courtChipTextActive]}>
                      🎾 {c.name}
                    </Text>
                    {c.surface && (
                      <Text style={[styles.courtSurface, selectedCourt?.id === c.id && styles.courtSurfaceActive]}>
                        {c.surface}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {dates.map((date, idx) => {
                  const isSelected = formatDate(date) === formatDate(selectedDate);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dateChip, isSelected && styles.dateChipActive]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelActive]}>
                        {dayLabel(new Date(date))}
                      </Text>
                      <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>
                        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time slot grid */}
            {selectedCourt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Available Slots – {selectedCourt.name}
                </Text>
                <View style={styles.legend}>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#E5E7EB' }]} /><Text style={styles.legendText}>Available</Text></View>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#16A34A' }]} /><Text style={styles.legendText}>My booking</Text></View>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Taken</Text></View>
                </View>
                <View style={styles.slotGrid}>
                  {HOURS.map(hour => {
                    const booked = isSlotBooked(hour);
                    const mine = isMySlot(hour);
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.slot,
                          mine ? styles.slotMine : booked ? styles.slotBooked : styles.slotFree,
                        ]}
                        disabled={booked && !mine}
                        onPress={() => {
                          if (mine) {
                            const b = bookings.find(x => x.start_time === `${pad(hour)}:00:00` && x.student_id === profile?.id);
                            if (b) handleCancel(b.id);
                          } else {
                            handleBook(hour);
                          }
                        }}
                      >
                        <Text style={[styles.slotText, (mine || (!booked)) && styles.slotTextActive]}>
                          {pad(hour)}:00
                        </Text>
                        {mine && <Text style={styles.slotSubText}>Mine</Text>}
                        {booked && !mine && <Text style={styles.slotSubText}>Taken</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {booking && <ActivityIndicator color="#16A34A" style={styles.loader} />}
              </View>
            )}

            {/* My upcoming bookings */}
            {myBookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Upcoming Bookings</Text>
                {myBookings.map(b => (
                  <View key={b.id} style={styles.bookingCard}>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingCourt}>{b.court?.name ?? 'Court'}</Text>
                      <Text style={styles.bookingTime}>
                        📅 {b.booking_date}  🕐 {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.cancelChip} onPress={() => handleCancel(b.id)}>
                      <Text style={styles.cancelChipText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { marginTop: 40 },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  courtRow: { gap: 10, paddingBottom: 4 },
  courtChip: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginRight: 10,
  },
  courtChipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  courtChipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  courtChipTextActive: { color: '#FFFFFF' },
  courtSurface: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  courtSurfaceActive: { color: '#D1FAE5' },
  dateRow: { gap: 8, paddingBottom: 4 },
  dateChip: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginRight: 8, minWidth: 72,
  },
  dateChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  dateChipLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateChipLabelActive: { color: '#9CA3AF' },
  dateChipDay: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  dateChipDayActive: { color: '#FFFFFF' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#6B7280' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: {
    width: '21%', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  slotFree: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  slotBooked: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  slotMine: { backgroundColor: '#ECFDF5', borderColor: '#16A34A' },
  slotText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  slotTextActive: { color: '#111827' },
  slotSubText: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  bookingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center',
  },
  bookingInfo: { flex: 1 },
  bookingCourt: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  bookingTime: { fontSize: 13, color: '#6B7280' },
  cancelChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#EF4444',
  },
  cancelChipText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
});
