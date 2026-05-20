f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# 1. Reduce photo by 5% (SCREEN_HEIGHT * 1.0 → 0.95)
txt = txt.replace(
    'const HERO_HEIGHT = SCREEN_HEIGHT;',
    'const HERO_HEIGHT = SCREEN_HEIGHT * 0.95;'
)

# 2. Move photo count badge below status bar (top: 16 → top: insets.top + 48)
txt = txt.replace(
    "  photoBadge: {\n    position: 'absolute', top: 16, right: 16,\n    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,\n    paddingHorizontal: 10, paddingVertical: 4,\n  },",
    "  photoBadge: {\n    position: 'absolute', top: 56, right: 16,\n    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,\n    paddingHorizontal: 10, paddingVertical: 4,\n  },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
