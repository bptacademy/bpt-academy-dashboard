import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Image, FlatList,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { theme, fonts } from '../../lib/theme';
import { useConnections } from '../../hooks/useConnections';
const _BG = require('../../../assets/volpair-bg-v2.png');

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ConnectionsListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarPadding();
  const { connections, loading } = useConnections();

  return (
    <ImageBackground source={_BG} style={{ flex: 1 }} resizeMode="cover">
    <View style={{flex:1, backgroundColor:'transparent'}}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>Your serves and connections</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : connections.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>💘</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            When you and someone both send a Volley, your conversation opens here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={connections}
          contentContainerStyle={{ paddingBottom: tabBarPadding, paddingTop: 8 }}
          keyExtractor={item => item.connectionId}
          renderItem={({ item }) => {
            const initials = item.otherUserName
              .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('Conversation', {
                  connectionId: item.connectionId,
                })}
                activeOpacity={0.75}
              >
                <View style={styles.avatarWrapper}>
                  {item.otherUserPhoto ? (
                    <Image
                      source={{ uri: item.otherUserPhoto }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.otherUserName.split(' ')[0]}</Text>
                    <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <Text
                    style={[styles.lastServe, item.unreadCount > 0 && styles.lastServeUnread]}
                    numberOfLines={1}
                  >
                    {item.lastMessage ?? 'Matched — send your first Serve 🎾'}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>
                      {item.unreadCount > 9 ? '9+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  headerTitle: { fontSize: 26, fontFamily: fonts.headlineBold, color: theme.textPrimary },
  headerSub: { fontSize: 12.8, color: theme.textMuted, marginTop: 2, fontFamily: fonts.bodyLight },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontFamily: fonts.headlineBold, color: theme.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22, fontFamily: fonts.bodyLight },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.bgCard,
  },
  avatarWrapper: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: theme.primaryDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.primaryBorder, overflow: 'hidden',
  },
  avatarImage: { width: 50, height: 50 },
  avatarInitials: { fontSize: 18, fontFamily: fonts.headlineBold, color: theme.primary },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 17.1, fontFamily: fonts.bodyBold, color: theme.textPrimary },
  time: { fontSize: 12.8, color: theme.textMuted, fontFamily: fonts.bodyLight },
  lastServe: { fontSize: 13.9, color: theme.textMuted, fontFamily: fonts.bodyLight },
  lastServeUnread: { color: theme.textSecondary, fontFamily: fonts.bodyBold },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: { fontSize: 11, fontFamily: fonts.headlineLightIt, color: '#05020E' },
});
