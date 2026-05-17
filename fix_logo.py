from PIL import Image

img = Image.open('/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile/assets/logo.png').convert('RGBA')
pixels = img.load()
w, h = img.size
count = 0

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Blue BPT pixels: blue dominant over red and green, visible alpha
        if a > 100 and (b - r) > 60 and (b - g) > 60 and b > 100:
            pixels[x, y] = (255, 255, 255, a)
            count += 1

img.save('/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/mobile/assets/logo.png')
print(f"Done — replaced {count} blue pixels with white")
