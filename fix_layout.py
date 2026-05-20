f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# ── 1. Replace identity overlay JSX — add score box top-right inline with name ──
old_identity = """        {/* ── Identity overlay — bottom-left of photo ── */}
        <View style={styles.heroIdentity} pointerEvents="none">
          {/* Name + level pill */}
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{firstName}</Text>
            {stats?.level_value && (
              <View style={styles.heroLevelPill}>
                <Text style={styles.heroLevelText}>{stats.level_value.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Level label */}
          {stats?.level_value && (
            <Text style={styles.heroLevelDesc}>{levelLabel(stats.level_value)} · Playtomic</Text>
          )}

          {/* City */}
          {profile?.city && (
            <Text style={styles.heroCity}>📍 {profile.city}</Text>
          )}

          {/* Home club badge */}
          {profile?.home_club_name && (
            <View style={styles.heroClubBadge}>
              <Text style={styles.heroClubText}>🏟️ {profile.home_club_name}</Text>
            </View>
          )}

          {/* Intent badge */}
          {(profile?.looking_for === 'date' || profile?.looking_for === 'both') && (
            <View style={styles.heroIntentBadge}>
              <Text style={styles.heroIntentText}>
                {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
              </Text>
            </View>
          )}
        </View>"""

new_identity = """        {/* ── Identity overlay — bottom of photo ── */}
        <View style={styles.heroIdentity} pointerEvents="box-none">
          {/* Top row: left = name+level, right = score box */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName}>{firstName}</Text>
                {stats?.level_value && (
                  <View style={styles.heroLevelPill}>
                    <Text style={styles.heroLevelText}>{stats.level_value.toFixed(2)}</Text>
                  </View>
                )}
              </View>
              {stats?.level_value && (
                <Text style={styles.heroLevelDesc}>{levelLabel(stats.level_value)} · Playtomic</Text>
              )}
            </View>

            {/* Compact Volpair Score box — top right */}
            <TouchableOpacity
              style={styles.heroScoreBox}
              onPress={() => volpairScore && setShowScore(true)}
              activeOpacity={volpairScore ? 0.8 : 1}
              pointerEvents="box-only"
            >
              <Text style={styles.heroScoreLabel}>Volpair</Text>
              <Text style={styles.heroScoreValue}>{volpairScore?.total_score ?? '—'}</Text>
            </TouchableOpacity>
          </View>

          {/* City */}
          {profile?.city && (
            <Text style={styles.heroCity}>📍 {profile.city}</Text>
          )}

          {/* Home club badge */}
          {profile?.home_club_name && (
            <View style={styles.heroClubBadge}>
              <Text style={styles.heroClubText}>🏟️ {profile.home_club_name}</Text>
            </View>
          )}

          {/* Intent badge */}
          {(profile?.looking_for === 'date' || profile?.looking_for === 'both') && (
            <View style={styles.heroIntentBadge}>
              <Text style={styles.heroIntentText}>
                {profile.looking_for === 'both' ? '💘 Open to dating' : '💘 Looking to date'}
              </Text>
            </View>
          )}
        </View>"""

txt = txt.replace(old_identity, new_identity)

# ── 2. Replace belowHero section — CTAs first, then View full profile ──
old_below = """      {/* ── Below photo: score card + view full profile ── */}
      <View style={styles.belowHero}>
        {/* Volpair Score card */}
        <TouchableOpacity
          style={styles.volpairCard}
          onPress={() => volpairScore && setShowScore(true)}
          activeOpacity={volpairScore ? 0.8 : 1}
        >
          <View style={styles.volpairCardLeft}>
            <Text style={styles.volpairLabel}>Volpair Score</Text>
            <Text style={styles.volpairSub}>Your compatibility match</Text>
            {volpairScore && <Text style={styles.volpairTap}>Tap to see breakdown →</Text>}
          </View>
          <Text style={styles.volpairValue}>{volpairScore?.total_score ?? '—'}</Text>
        </TouchableOpacity>

        {/* View full profile button */}
        <TouchableOpacity
          style={styles.viewProfileBtn}
          onPress={() => setShowFullProfile(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewProfileText}>View full profile ↓</Text>
        </TouchableOpacity>
      </View>

      {/* ── Fixed CTA bar ── */}
      <View style={[styles.actionBar, { paddingBottom: 2 }]}>
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
            </TouchableOpacity>"""

new_below = """      {/* ── Below photo: CTAs + view full profile ── */}
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
            </TouchableOpacity>"""

txt = txt.replace(old_below, new_below)

# ── 3. Fix the closing of the old actionBar — replace with closing belowHero + remove old actionBar ──
old_close = """          </View>
        )}
      </View>"""

new_close = """          </View>
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

# Only replace the first occurrence (the actionBar closing, not the sheet)
txt = txt.replace(old_close, new_close, 1)

# ── 4. Remove the old standalone actionBar wrapper (now empty) ──
old_actionbar_wrapper = """      {/* ── Fixed CTA bar ── */}
      <View style={[styles.actionBar, { paddingBottom: 2 }]}>"""
txt = txt.replace(old_actionbar_wrapper, "      {/* CTAs now in belowHero above */}")

# ── 5. Remove the stray closing </View> that was actionBar's close ──
# The actionBar View close tag — it comes right after the Modals comment
old_bar_close = """      {/* ── Modals ── */}"""
new_bar_close = """
      {/* ── Modals ── */}"""
txt = txt.replace(old_bar_close, new_bar_close)

# ── 6. Add new style entries for heroTopRow, heroLeft, heroScoreBox ──
old_hero_name_row = "  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },"
new_hero_name_row = """  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  heroLeft: { flex: 1, marginRight: 10 },
  heroScoreBox: {
    backgroundColor: 'rgba(0,212,200,0.2)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,212,200,0.45)',
    paddingHorizontal: 10, paddingVertical: 8,
    alignItems: 'center', minWidth: 58,
  },
  heroScoreLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: 'rgba(0,212,200,0.9)', marginBottom: 2 },
  heroScoreValue: { fontSize: 26, fontFamily: fonts.headlineLightIt, color: '#FFFFFF', lineHeight: 28 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },"""

txt = txt.replace(old_hero_name_row, new_hero_name_row)

# ── 7. Update belowHero style — just padding, no flex ──
old_belowHero_style = """  belowHero: {
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },"""
new_belowHero_style = """  belowHero: {
    backgroundColor: theme.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },"""
txt = txt.replace(old_belowHero_style, new_belowHero_style)

# ── 8. Update actionBtns to have no top margin (it's now in belowHero) ──
old_actionBtns = "  actionBtns: { flexDirection: 'row', gap: 8 },"
new_actionBtns = "  actionBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },"
txt = txt.replace(old_actionBtns, new_actionBtns)

# ── 9. Update viewProfileBtn — remove top margin since CTAs are above ──
old_viewBtn = """  viewProfileBtn: {
    alignSelf: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 9,
    borderWidth: 1, borderColor: theme.border,
  },"""
new_viewBtn = """  viewProfileBtn: {
    alignSelf: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border,
  },"""
txt = txt.replace(old_viewBtn, new_viewBtn)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
