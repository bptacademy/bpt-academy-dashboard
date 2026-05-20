f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# Increase hero height so photo + belowHero fills full screen
txt = txt.replace(
    'const HERO_HEIGHT = SCREEN_HEIGHT * 0.72;',
    'const HERO_HEIGHT = SCREEN_HEIGHT * 0.82;'
)

# Restore container background
txt = txt.replace(
    "  container: { flex: 1, backgroundColor: 'transparent', flexDirection: 'column' },",
    "  container: { flex: 1, backgroundColor: theme.bg, flexDirection: 'column' },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
