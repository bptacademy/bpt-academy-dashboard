f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

txt = txt.replace(
    "    backgroundColor: 'rgba(8,16,28,0.85)',\n    backgroundColor: 'rgba(8,16,28,0.72)',",
    "    backgroundColor: 'rgba(8,16,28,0.85)',"
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
