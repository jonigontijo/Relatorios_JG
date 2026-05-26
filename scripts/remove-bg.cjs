const sharp = require("sharp");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3];
const threshold = Number(process.argv[4] ?? 80);

if (!input || !output) {
  console.error("Usage: node remove-bg.cjs <input.png> <output.png> [threshold]");
  process.exit(1);
}

(async () => {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixels = Buffer.from(data);

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);

    if (max <= threshold) {
      pixels[i + 3] = 0;
    } else if (max < threshold * 2) {
      const factor = (max - threshold) / threshold;
      pixels[i + 3] = Math.min(255, Math.round(pixels[i + 3] * factor));
    }
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(output);

  console.log(`wrote ${output} (${width}x${height})`);
})();
