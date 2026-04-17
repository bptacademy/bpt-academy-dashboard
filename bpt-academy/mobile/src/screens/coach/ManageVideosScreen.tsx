import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { Video } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

export default function ManageVideosScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setVideos(data);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchVideos(); setRefreshing(false); };
  useEffect(() => { fetchVideos(); }, []);

  const handleDelete = (video: Video) => {
    Alert.alert(
      'Delete video',
      `Are you sure you want to delete "${video.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete from storage if we have a path
            if (video.mux_playback_id) {
              await supabase.storage
                .from('training-videos')
                .remove([video.mux_playback_id]);
            }
            // Delete from DB
            const { error } = await supabase.from('videos').delete().eq('id', video.id);
            if (error) { Alert.alert('Error', error.message); return; }
            setVideos((prev) => prev.filter((v) => v.id !== video.id));
          },
        },
      ]
    );
  };

  const togglePublished = async (video: Video) => {
    const { error } = await supabase
      .from('videos')
      .update({ is_published: !video.is_published })
      .eq('id', video.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, is_published: !v.is_published } : v));
  };

  const filtered = videos.filter((v) =>
    search === '' ||
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.drill_type ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (v.skill_focus ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: tabBarPadding }}
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Videos" />
      <View style={styles.addRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation.navigate('UploadVideo')}>
          <Text style={styles.uploadBtnText}>+ Upload Video</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search videos..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.map((video) => (
          <View key={video.id} style={styles.card}>
            {/* Thumbnail */}
            <TouchableOpacity
              style={styles.thumbnail}
              onPress={() => navigation.navigate('VideoPlayer', { video })}
            >
              <Text style={styles.thumbnailIcon}>🎬</Text>
              <View style={styles.playBadge}>
                <Text style={styles.playBadgeText}>▶ Play</Text>
              </View>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text>

              <View style={styles.tags}>
                {video.drill_type && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{video.drill_type}</Text>
                  </View>
                )}
                {video.skill_focus && (
                  <View style={[styles.tag, styles.tagGreen]}>
                    <Text style={[styles.tagText, styles.tagTextGreen]}>{video.skill_focus}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.date}>Uploaded {formatDate(video.created_at)}</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, video.is_published ? styles.actionBtnGrey : styles.actionBtnGreen]}
                  onPress={() => togglePublished(video)}
                >
                  <Text style={[styles.actionBtnText, video.is_published ? styles.actionBtnTextGrey : styles.actionBtnTextGreen]}>
                    {video.is_published ? 'Unpublish' : 'Publish'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnRed]}
                  onPress={() => handleDelete(video)}
                >
                  <Text style={[styles.actionBtnText, styles.actionBtnTextRed]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>No videos yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('UploadVideo')}
            >
              <Text style={styles.emptyBtnText}>Upload your first video</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  addRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  uploadBtn: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  uploadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  searchContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  list: { padding: 16  paddingBottom: 80,},
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  thumbnail: { height: 160, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  thumbnailIcon: { fontSize: 48 },
  playBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  playBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagGreen: { backgroundColor: '#ECFDF5' },
  tagText: { fontSize: 12, color: '#374151' },
  tagTextGreen: { color: '#16A34A' },
  date: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1 },
  actionBtnGreen: { borderColor: '#16A34A', backgroundColor: '#ECFDF5' },
  actionBtnGrey: { borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  actionBtnRed: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtnTextGreen: { color: '#16A34A' },
  actionBtnTextGrey: { color: '#6B7280' },
  actionBtnTextRed: { color: '#DC2626' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
