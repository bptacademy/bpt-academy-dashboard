f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# belowHero should not stretch — alignSelf: flex-start makes it wrap content height
txt = txt.replace(
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    paddingBottom: 12,\n  },',
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    paddingBottom: 12,\n    alignSelf: \'stretch\',\n    flexShrink: 1,\n  },'
)

# Root container — add justifyContent so children stack from top
txt = txt.replace(
    "  container: { flex: 1, backgroundColor: theme.bg },",
    "  container: { flex: 1, backgroundColor: theme.bg, flexDirection: 'column' },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
