f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# heroContainer fills full screen, photo sits at top
txt = txt.replace(
    "  heroContainer: {\n    width: SCREEN_WIDTH,\n    height: HERO_HEIGHT,\n    backgroundColor: theme.bgDeep,\n  },",
    "  heroContainer: {\n    width: SCREEN_WIDTH,\n    height: SCREEN_HEIGHT,\n    backgroundColor: theme.bg,\n  },"
)

# heroIdentity stretches from overlay top all the way to screen bottom
txt = txt.replace(
    "  heroIdentity: {\n    position: 'absolute', bottom: 0, left: 0, right: 0,\n    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 16,\n    backgroundColor: 'rgba(8,16,28,0.72)',\n  },",
    "  heroIdentity: {\n    position: 'absolute', bottom: 0, left: 0, right: 0,\n    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24,\n    backgroundColor: 'rgba(8,16,28,0.85)',\n  },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
