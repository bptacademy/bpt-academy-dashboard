f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

txt = txt.replace(
    "  heroIdentity: {\n    position: 'absolute', bottom: 0, left: 0, right: 0,\n    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24,\n    backgroundColor: 'rgba(8,16,28,0.85)',\n  },",
    "  heroIdentity: {\n    position: 'absolute', bottom: SCREEN_HEIGHT * 0.10, left: 0, right: 0,\n    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24,\n    backgroundColor: 'rgba(8,16,28,0.85)',\n  },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
