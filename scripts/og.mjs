// Builds public/og.png (1200×630) from the split-flap hero exported from Figma.
// Run after changing src/assets/og-split-flap.png: `node scripts/og.mjs`
import sharp from 'sharp';

const flap = sharp('src/assets/og-split-flap.png');
const { width, height } = await flap.metadata();
const scale = Math.min(820 / width, 460 / height);
const w = Math.round(width * scale);
const h = Math.round(height * scale);
const tile = await flap.resize(w, h).toBuffer();

// Sky-blue strip along the bottom, like the site footer.
const strip = Buffer.from(`<svg width="1200" height="40"><rect width="1200" height="40" fill="#71CBEB"/></svg>`);

await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#F5F7F9' } })
  .composite([
    { input: tile, left: Math.round((1200 - w) / 2), top: Math.round((590 - h) / 2) },
    { input: strip, left: 0, top: 590 },
  ])
  .png()
  .toFile('public/og.png');
console.log('public/og.png written');
