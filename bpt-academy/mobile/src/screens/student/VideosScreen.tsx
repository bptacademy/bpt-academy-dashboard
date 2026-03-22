import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Video } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

export default function VideosScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [vidRes, bookmarkRes] = await Promise.all([
      supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('student_id', profile!.id),
    ]);
    if (vidRes.data) setVideos(vidRes.data);
    if (bookmarkRes.data) setBookmarkedIds(bookmarkRes.data.map((b) => b.video_id));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleBookmark = async (videoId: string) => {
    const isBookmarked = bookmarkedIds.includes(videoId);
    if (isBookmarked) {
      await supabase.from('video_bookmarks').delete()
        .eq('student_id', profile!.id).eq('video_id', videoId);
      setBookmarkedIds(bookmarkedIds.filter((id) => id !== videoId));
    } else {
      await supabase.from('video_bookmarks').insert({ student_id: profile!.id, video_id: videoId });
      setBookmarkedIds([...bookmarkedIds, videoId]);
    }
  };

  useEffect(() => { if (profile) fetchData(); }, [profile]);

  const filtered = videos.filter((v) =>
    search === '' ||
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.drill_type?.toLowerCase().includes(search.toLowerCase()) ||
    v.skill_focus?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ScreenHeader title="Videos" />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search videos, drills, skills..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.list}>
        {filtered.map((video) => {
          const bookmarked = bookmarkedIds.includes(video.id);
          return (
            <TouchableOpacity
              key={video.id}
              style={styles.card}
              onPress={() => navigation.navigate('VideoPlayer', { video })}
            >
              {/* Thumbnail placeholder */}
              <View style={styles.thumbnail}>
                <Text style={styles.thumbnailIcon}>🎬</Text>
                {video.duration_seconds && (
                  <View style={styles.duration}>
                    <Text style={styles.durationText}>{formatDuration(video.duration_seconds)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text>
                  <TouchableOpacity onPress={() => toggleBookmark(video.id)}>
                    <Text style={styles.bookmark}>{bookmarked ? '🔖' : '🏷️'}</Text>
                  </TouchableOpacity>
                </View>

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

                <Text style={styles.uploader}>
                  by BPT Academy
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No videos found.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  searchContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  list: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  thumbnail: { height: 160, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  thumbnailIcon: { fontSize: 48 },
  duration: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  bookmark: { fontSize: 20 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagGreen: { backgroundColor: '#ECFDF5' },
  tagText: { fontSize: 12, color: '#374151' },
  tagTextGreen: { color: '#16A34A' },
  uploader: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
