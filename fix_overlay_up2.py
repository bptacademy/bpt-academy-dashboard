f = open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'r')
lines = f.readlines()
f.close()

# Find heroIdentity: { line and rewrite the block
for i, line in enumerate(lines):
    if '  heroIdentity: {' in line:
        lines[i]   = "  heroIdentity: {\n"
        lines[i+1] = "    position: 'absolute', bottom: SCREEN_HEIGHT * 0.10, left: 0, right: 0,\n"
        lines[i+2] = "    paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24,\n"
        lines[i+3] = "    backgroundColor: 'rgba(8,16,28,0.85)',\n"
        # remove the old comment line if present
        if '// Layered' in lines[i+4]:
            lines[i+4] = "  },\n"
        break

open('/Users/iamfabiandavid/.openclaw/workspace/padel-dating-app/mobile/src/screens/connect/PlayerProfileScreen.tsx', 'w').writelines(lines)
print('done')
