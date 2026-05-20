f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
txt = f.read()
f.close()

# Remove flex:1 and justifyContent from belowHero so it doesn't stretch
txt = txt.replace(
    'belowHero: {\n    flex: 1,\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 10,\n    paddingBottom: 6,\n    justifyContent: \'center\',\n  },',
    'belowHero: {\n    backgroundColor: theme.bg,\n    paddingHorizontal: 16,\n    paddingTop: 10,\n    paddingBottom: 6,\n  },'
)

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').write(txt)
print('done')
