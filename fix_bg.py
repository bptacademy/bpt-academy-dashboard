f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

txt = txt.replace(
    "  container: { flex: 1, backgroundColor: theme.bg, flexDirection: 'column' },",
    "  container: { flex: 1, backgroundColor: 'transparent', flexDirection: 'column' },"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
