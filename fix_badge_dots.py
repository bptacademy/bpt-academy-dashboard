f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# 1. Photo count badge — move up to sit above the ⋯ report button (top: 56 → top: 48)
txt = txt.replace(
    "    position: 'absolute', top: 56, right: 16,",
    "    position: 'absolute', top: 48, right: 60,"
)

# 2. Dot indicators — move up 3% from bottom of photo
txt = txt.replace(
    "  heroDots: {\n    position: 'absolute', bottom: 80, left: 0, right: 0,\n    flexDirection: 'row', justifyContent: 'center', gap: 5,\n  },",
    "  heroDots: {\n    position: 'absolute', bottom: SCREEN_HEIGHT * 0.13, left: 0, right: 0,\n    flexDirection: 'row', justifyContent: 'center', gap: 5,\n  },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
