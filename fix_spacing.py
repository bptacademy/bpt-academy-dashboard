f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# Tighten belowHero — equal padding top/bottom, no stretching
txt = txt.replace(
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 10,\n    paddingBottom: 8,\n  },',
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 12,\n    paddingBottom: 12,\n  },'
)

# Add gap between CTAs and view full profile
txt = txt.replace(
    "  actionBtns: { flexDirection: 'row', gap: 10 },",
    "  actionBtns: { flexDirection: 'row', gap: 10, marginBottom: 14 },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
