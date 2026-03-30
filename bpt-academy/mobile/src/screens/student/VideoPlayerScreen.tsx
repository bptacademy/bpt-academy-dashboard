import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Video as VideoType } from '../../types';
import BackHeader from '../../components/common/BackHeader';

const { width } = Dimensions.get('window');

export default function VideoPlayerScreen({ route, navigation }: any) {
  const video = route.params?.video as VideoType;
  const { profile, isCoach, isAdmin, isSuperAdmin } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = isCoach || isAdmin || isSuperAdmin;

  // Build the playback URL from mux_playback_id (Storage path)
  const getVideoUrl = (): string => {
    if (!video?.mux_playback_id) return '';
    return supabase.storage
      .from('training-videos')
      .getPublicUrl(video.mux_playback_id).data.publicUrl;
  };

  const playbackUrl = getVideoUrl();

  const player = useVideoPlayer(
    playbackUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    (p) => {
      p.loop = false;
      // Don't autoplay — let user press play
    }
  );

  const fetchComments = async () => {
    if (!video?.id) return;
    const { data } = await supabase
      .from('video_comments')
      .select('id, content, created_at, author_id, author:author_id(full_name)')
      .eq('video_id', video.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const checkBookmark = async () => {
    if (!profile?.id || !video?.id || isStaff) return;
    const { data } = await supabase
      .from('video_bookmarks')
      .select('video_id')
      .eq('student_id', profile.id)
      .eq('video_id', video.id)
      .maybeSingle();
    setBookmarked(!!data);
  };

  useEffect(() => {
    fetchComments();
    checkBookmark();
  }, []);

  const toggleBookmark = async () => {
    if (!profile?.id || isStaff) return;
    if (bookmarked) {
      await supabase.from('video_bookmarks').delete()
        .eq('student_id', profile.id).eq('video_id', video.id);
      setBookmarked(false);
    } else {
      await supabase.from('video_bookmarks').insert({
        student_id: profile.id,
        video_id: video.id,
      });
      setBookmarked(true);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !profile?.id) return;
    setSubmitting(true);
    const { error } = await supabase.from('video_comments').insert({
      video_id: video.id,
      author_id: profile.id,
      content: newComment.trim(),
    });
    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setNewComment('');
    fetchComments();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <BackHeader title={video?.title ?? 'Video'} />
      <ScrollView>
        {/* Video Player */}
        <View style={styles.playerContainer}>
          {playbackUrl ? (
            <VideoView
              style={styles.video}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
            />
          ) : (
            <View style={styles.noVideo}>
              <Text style={styles.noVideoText}>Video unavailable</Text>
            </View>
          )}
        </View>

        {/* Video info */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.videoTitle}>{video?.title}</Text>
            {/* Bookmark only for students */}
            {!isStaff && (
              <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkBtn}>
                <Text style={styles.bookmarkIcon}>{bookmarked ? '🔖' : '🏷️'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tags}>
            {video?.drill_type && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>🏓 {video.drill_type}</Text>
              </View>
            )}
            {video?.skill_focus && (
              <View style={[styles.tag, styles.tagGreen]}>
                <Text style={[styles.tagText, styles.tagTextGreen]}>🎯 {video.skill_focus}</Text>
              </View>
            )}
          </View>

          {video?.description ? (
            <Text style={styles.description}>{video.description}</Text>
          ) : null}
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>💬 Comments ({comments.length})</Text>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {((c.author as any)?.full_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>
                  {c.author_id === profile?.id ? 'You' : ((c.author as any)?.full_name ?? 'User')}
                </Text>
                <Text style={styles.commentText}>{c.content}</Text>
                <Text style={styles.commentTime}>
                  {new Date(c.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
          {comments.length === 0 && (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.commentInput}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Ask a question or leave a comment..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newComment.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={submitComment}
          disabled={!newComment.trim() || submitting}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  playerContainer: { backgroundColor: '#000', width, height: width * 0.5625 },
  video: { width: '100%', height: '100%' },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noVideoText: { color: '#6B7280', fontSize: 15 },
  info: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  videoTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  bookmarkBtn: { padding: 4, marginLeft: 8 },
  bookmarkIcon: { fontSize: 24 },
  tags: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  tagGreen: { backgroundColor: '#ECFDF5' },
  tagText: { fontSize: 13, color: '#374151' },
  tagTextGreen: { color: '#16A34A' },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  commentsSection: { padding: 16 },
  commentsTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  commentCard: { flexDirection: 'row', marginBottom: 14, gap: 10 },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  commentBody: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 3 },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  noComments: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
    maxHeight: 100, backgroundColor: '#F9FAFB',
  },
  sendBtn: { backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
