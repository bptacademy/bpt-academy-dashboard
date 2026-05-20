f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# Reduce volpairCard marginBottom
txt = txt.replace(
    'borderWidth: 1.5, borderColor: theme.primaryBorder,\n    marginBottom: 10,',
    'borderWidth: 1.5, borderColor: theme.primaryBorder,\n    marginBottom: 6,'
)

# Tighten belowHero padding
txt = txt.replace(
    '    paddingTop: 14,\n    paddingBottom: 8,',
    '    paddingTop: 10,\n    paddingBottom: 6,'
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
