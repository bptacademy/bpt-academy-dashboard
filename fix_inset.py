f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# Pass insets.bottom into belowHero paddingBottom inline
txt = txt.replace(
    '      <View style={styles.belowHero}>',
    '      <View style={[styles.belowHero, { paddingBottom: 12 + insets.bottom }]}>'
)

# Remove paddingBottom from the static style (now handled inline)
txt = txt.replace(
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    paddingBottom: 12,\n    alignSelf: \'stretch\',\n    flexShrink: 1,\n  },',
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    alignSelf: \'stretch\',\n    flexShrink: 1,\n  },'
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
