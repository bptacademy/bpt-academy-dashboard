const { Jimp } = require('jimp');
const path = require('path');

(async () => {
  const img = await Jimp.read(path.resolve(__dirname, 'logo.png'));

  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    if (a < 10) return;

    // Make near-black pixels transparent
    if (r < 40 && g < 40 && b < 40) {
      this.bitmap.data[idx + 3] = 0;
      return;
    }

    // If blue dominates -> turn white
    if (b > r && b > g) {
      this.bitmap.data[idx]     = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
    }
  });

  await img.write(path.resolve(__dirname, 'logo-fixed.png'));
  console.log('Done: logo-fixed.png');
})().catch(console.error);
