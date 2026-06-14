const fs = require("fs");
const path = require("path");
const input = path.join("public", "icons", "note.png");
const out = path.join("scripts", "note-pixels.txt");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (e) {
    console.error("sharp not available:", e.message);
    process.exit(1);
  }
  const img = sharp(input);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const lines = [];
  lines.push(`width=${w}`);
  lines.push(`height=${h}`);
  const coords = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a !== 0) coords.push(`${x},${y}`);
    }
  }
  lines.push(`pixel_count=${coords.length}`);
  lines.push(...coords);
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(JSON.stringify({ width: w, height: h, pixelCount: coords.length, outFile: out }));
}

main().catch((e) => { console.error(e); process.exit(1); });
