import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, TextInput, Image, Dimensions} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Video } from '../../types';
import ScreenHeader from '../../components/common/ScreenHeader';

export default function VideosScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
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
    <View style={styles.root}>
      <Image source={require('../../../assets/bg.png')} style={styles.bgImage} resizeMode="cover" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarPadding }}
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7A8FA6" />}
      >
        <ScreenHeader title="Videos" />

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search videos, drills, skills..."
            placeholderTextColor="#7A8FA6"
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

                  <Text style={styles.uploader}>by BPT Academy</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1628' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  container: { flex: 1 },
  searchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, fontSize: 15, color: '#F0F6FC', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: 'rgba(17,30,51,0.90)', borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  thumbnail: { height: 160, backgroundColor: '#0B1628', alignItems: 'center', justifyContent: 'center' },
  thumbnailIcon: { fontSize: 48 },
  duration: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F0F6FC', flex: 1, marginRight: 8 },
  bookmark: { fontSize: 20 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagGreen: { backgroundColor: 'rgba(22,163,74,0.15)' },
  tagText: { fontSize: 12, color: '#F0F6FC' },
  tagTextGreen: { color: '#4ADE80' },
  uploader: { fontSize: 12, color: '#7A8FA6' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#7A8FA6', fontSize: 15 },
});
