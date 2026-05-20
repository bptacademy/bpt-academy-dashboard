f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

txt = txt.replace(
    '      <View style={[styles.belowHero, { paddingBottom: 12 + insets.bottom }]}>',
    '      <View style={styles.belowHero}>'
)

txt = txt.replace(
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    alignSelf: \'stretch\',\n    flexShrink: 1,\n  },',
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    paddingBottom: 12,\n    alignSelf: \'stretch\',\n    flexShrink: 1,\n  },'
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
