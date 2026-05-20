f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# ── 1. Add CTAs + View full profile inside heroIdentity, after intent badge ──
old_identity_close = """          {/* Intent badge */}
          {(profile?.looking_for === 'date' || profile?.looking_for === 'both') && (
            <View style={styles.heroIntentBadge}>
              <Text style={styles.heroIntentText}>
                {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
              </Text>
            </View>
          )}
        </View>"""

new_identity_close = """          {/* Intent badge */}
          {(profile?.looking_for === 'date' || profile?.looking_for === 'both') && (
            <View style={styles.heroIntentBadge}>
              <Text style={styles.heroIntentText}>
                {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
              </Text>
            </View>
          )}

          {/* ── CTAs inside overlay ── */}
          <View style={styles.heroCtaSpacer} />
          {myAction ? (
            <View style={styles.actionedRow}>
              <Text style={styles.actionedText}>
                {myAction === 'play_again' ? '🎾 Play request sent!' :
                 myAction === 'connect'    ? '👋 Connection sent!'   :
                 '💘 Volley sent — fingers crossed!'}
              </Text>
            </View>
          ) : (
            <View style={styles.actionBtns}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('play_again')} activeOpacity={0.8}>
                <Text style={styles.actionBtnEmoji}>🎾</Text>
                <Text style={styles.actionBtnText}>Play again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('connect')} activeOpacity={0.8}>
                <Text style={styles.actionBtnEmoji}>👋</Text>
                <Text style={styles.actionBtnText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={() => handleAction('volley')} activeOpacity={0.8}>
                <Text style={styles.actionBtnEmoji}>💘</Text>
                <Text style={[styles.actionBtnText, styles.volleyBtnText]}>Volley</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* View full profile */}
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => setShowFullProfile(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewProfileText}>View full profile ↓</Text>
          </TouchableOpacity>
        </View>"""

txt = txt.replace(old_identity_close, new_identity_close)

# ── 2. Remove the belowHero section entirely ──
old_below = """      {/* ── Below photo: CTAs + view full profile ── */}
      <View style={styles.belowHero}>
        {/* 3 CTA buttons */}
        {myAction ? (
          <View style={styles.actionedRow}>
            <Text style={styles.actionedText}>
              {myAction === 'play_again' ? '🎾 Play request sent!' :
               myAction === 'connect'    ? '👋 Connection sent!'   :
               '💘 Volley sent — fingers crossed!'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('play_again')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>🎾</Text>
              <Text style={styles.actionBtnText}>Play again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('connect')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>👋</Text>
              <Text style={styles.actionBtnText}>Connect</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.volleyBtn]} onPress={() => handleAction('volley')} activeOpacity={0.8}>
              <Text style={styles.actionBtnEmoji}>💘</Text>
              <Text style={[styles.actionBtnText, styles.volleyBtnText]}>Volley</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View full profile button */}
        <TouchableOpacity
          style={styles.viewProfileBtn}
          onPress={() => setShowFullProfile(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewProfileText}>View full profile ↓</Text>
        </TouchableOpacity>
      </View>"""

txt = txt.replace(old_below, '')

# ── 3. heroIdentity — extend to bottom including insets, keep pointerEvents box-none ──
txt = txt.replace(
    "  heroIdentity: {\n    position: 'absolute', bottom: 0, left: 0, right: 0,\n    paddingHorizontal: 18, paddingBottom: 16, paddingTop: 48,\n    backgroundColor: 'rgba(8,16,28,0.60)',\n  },",
    "  heroIdentity: {\n    position: 'absolute', bottom: 0, left: 0, right: 0,\n    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 16,\n    backgroundColor: 'rgba(8,16,28,0.72)',\n  },"
)

# ── 4. Make heroContainer fill full screen height ──
txt = txt.replace(
    'const HERO_HEIGHT = SCREEN_HEIGHT * 0.78;',
    'const HERO_HEIGHT = SCREEN_HEIGHT;'
)

# ── 5. Add heroCtaSpacer style ──
txt = txt.replace(
    "  heroIntentText: { fontSize: 12, color: '#C4B5FD', fontFamily: fonts.bodyBold },",
    "  heroIntentText: { fontSize: 12, color: '#C4B5FD', fontFamily: fonts.bodyBold },\n  heroCtaSpacer: { height: 12 },"
)

# ── 6. actionBtns — remove marginBottom (now inside overlay) ──
txt = txt.replace(
    "  actionBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },",
    "  actionBtns: { flexDirection: 'row', gap: 10, marginBottom: 10 },"
)

# ── 7. Update viewProfileBtn to suit overlay (lighter border) ──
txt = txt.replace(
    "  viewProfileBtn: {\n    alignSelf: 'center',\n    backgroundColor: theme.bgCard,\n    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 8,\n    borderWidth: 1, borderColor: theme.border,\n  },",
    "  viewProfileBtn: {\n    alignSelf: 'center', marginTop: 8,\n    backgroundColor: 'rgba(255,255,255,0.12)',\n    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 8,\n    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',\n  },"
)

# ── 8. viewProfileText — white ──
txt = txt.replace(
    "  viewProfileText: { fontSize: 13, color: theme.textSecondary, fontFamily: fonts.bodyBold },",
    "  viewProfileText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyBold },"
)

# ── 9. actionBtn background — slightly more visible on photo ──
txt = txt.replace(
    "    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',\n    gap: 5, paddingVertical: 9, borderRadius: 12,\n    backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.border,",
    "    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',\n    gap: 5, paddingVertical: 9, borderRadius: 12,\n    backgroundColor: 'rgba(10,21,32,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
