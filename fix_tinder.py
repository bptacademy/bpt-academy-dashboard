f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# 1. Photo fills full screen
txt = txt.replace(
    'const HERO_HEIGHT = SCREEN_HEIGHT * 0.62;',
    'const HERO_HEIGHT = SCREEN_HEIGHT;'
)

# 2. heroContainer fills full screen, no background colour needed
txt = txt.replace(
    "  heroContainer: {\n    width: SCREEN_WIDTH,\n    height: SCREEN_HEIGHT,\n    backgroundColor: theme.bg,\n  },",
    "  heroContainer: {\n    width: SCREEN_WIDTH,\n    height: SCREEN_HEIGHT,\n  },"
)

# 3. heroIdentity — fix pointerEvents so CTAs are tappable
txt = txt.replace(
    '<View style={styles.heroIdentity} pointerEvents="box-none">',
    '<View style={styles.heroIdentity}>'
)

# 4. heroScoreBox — remove pointerEvents prop
txt = txt.replace(
    '              pointerEvents="box-only"\n            >', '              >'
)

# 5. root container — transparent so nothing shows below
txt = txt.replace(
    "  container: { flex: 1, backgroundColor: theme.bg, flexDirection: 'column' },",
    "  container: { flex: 1, backgroundColor: '#000', flexDirection: 'column' },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
