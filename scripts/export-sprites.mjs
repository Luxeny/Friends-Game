/**
 * Export .aseprite from Downloads → public/sprites/
 * Run: node scripts/export-sprites.mjs
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "sprites");
const SRC = path.join(process.env.USERPROFILE || "", "Downloads");

function u16(buf, o) {
  return buf.readUInt16LE(o);
}
function u32(buf, o) {
  return buf.readUInt32LE(o);
}
function i16(buf, o) {
  return buf.readInt16LE(o);
}

function decodeCompressedRgba(data, celW, celH) {
  const out = Buffer.alloc(celW * celH * 4);
  let src = celH * 2;

  for (let y = 0; y < celH; y++) {
    const rowBytes = u16(data, y * 2);
    const rowEnd = src + rowBytes;
    let x = 0;

    while (src < rowEnd && x < celW) {
      const b = data[src++];
      if (!(b & 0x80)) {
        const count = (b & 0x7f) + 1;
        for (let i = 0; i < count && x < celW; i++) {
          const di = (y * celW + x) * 4;
          out[di] = data[src++];
          out[di + 1] = data[src++];
          out[di + 2] = data[src++];
          out[di + 3] = data[src++];
          x++;
        }
      } else {
        const count = (b & 0x7f) + 1;
        const r = data[src++];
        const g = data[src++];
        const bl = data[src++];
        const a = data[src++];
        for (let i = 0; i < count && x < celW; i++) {
          const di = (y * celW + x) * 4;
          out[di] = r;
          out[di + 1] = g;
          out[di + 2] = bl;
          out[di + 3] = a;
          x++;
        }
      }
    }
    src = rowEnd;
  }

  return out;
}

function blitRgba(src, celW, celH, canvasW, canvasH, celX, celY, out) {
  for (let y = 0; y < celH; y++) {
    for (let x = 0; x < celW; x++) {
      const si = (y * celW + x) * 4;
      const a = src[si + 3];
      if (a === 0) continue;
      const px = celX + x;
      const py = celY + y;
      if (px < 0 || px >= canvasW || py < 0 || py >= canvasH) continue;
      const di = (py * canvasW + px) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = a;
    }
  }
}

function blitRaw(data, celW, celH, canvasW, canvasH, celX, celY, out, bpp, palette) {
  for (let y = 0; y < celH; y++) {
    for (let x = 0; x < celW; x++) {
      const si = (y * celW + x) * bpp;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (bpp === 4) {
        r = data[si];
        g = data[si + 1];
        b = data[si + 2];
        a = data[si + 3];
      } else if (bpp === 2) {
        const v = u16(data, si);
        a = (v >> 8) & 0xff;
        r = g = b = v & 0xff;
      } else {
        const idx = data[si];
        if (idx === 0) continue;
        [r, g, b, a] = palette[idx] || [0, 0, 0, 0];
      }

      if (a === 0) continue;
      const px = celX + x;
      const py = celY + y;
      if (px < 0 || px >= canvasW || py < 0 || py >= canvasH) continue;
      const di = (py * canvasW + px) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
}

function parsePaletteChunk(buf, offset, size) {
  const palette = Array.from({ length: 256 }, () => [0, 0, 0, 0]);
  let o = offset + 6;
  const end = offset + 6 + size;
  if (size >= 8) o += 8;
  while (o + 6 <= end) {
    const hasName = buf[o++];
    const r = buf[o++];
    const g = buf[o++];
    const b = buf[o++];
    const a = buf[o++];
    const idx = buf[o++];
    palette[idx] = [r, g, b, a];
    if (hasName) {
      const nameLen = u16(buf, o);
      o += 2 + nameLen;
    }
  }
  return palette;
}

function parseCelChunk(buf, chunkData, chunkEnd, w, h, pixels, bpp, palette) {
  const celX = i16(buf, chunkData + 2);
  const celY = i16(buf, chunkData + 4);
  const celType = u16(buf, chunkData + 7);

  if (celType === 1) return;

  const celW = u16(buf, chunkData + 9);
  const celH = u16(buf, chunkData + 11);

  if (celType === 0) {
    blitRaw(
      buf.subarray(chunkData + 13, chunkEnd),
      celW,
      celH,
      w,
      h,
      celX,
      celY,
      pixels,
      bpp,
      palette
    );
    return;
  }

  if (celType === 2) {
    const compLen = u32(buf, chunkData + 13);
    const compStart = chunkData + 17;
    const compEnd = compLen > 0 ? compStart + compLen : chunkEnd;
    const compressed = buf.subarray(compStart, compEnd);
    const inflated = zlib.inflateSync(compressed);
    const rgba = decodeCompressedRgba(inflated, celW, celH);
    blitRgba(rgba, celW, celH, w, h, celX, celY, pixels);
  }
}

function parseAseprite(buffer) {
  const w = u16(buffer, 8);
  const h = u16(buffer, 10);
  const frameCount = u16(buffer, 6);
  const colorDepth = u16(buffer, 12);
  const bpp = colorDepth === 32 ? 4 : colorDepth === 16 ? 2 : 1;

  let palette = Array.from({ length: 256 }, () => [0, 0, 0, 0]);
  let offset = 128;
  const frames = [];

  for (let f = 0; f < frameCount; f++) {
    const frameStart = offset;
    const dataSize = u32(buffer, frameStart);
    const frameEnd = frameStart + dataSize;
    const duration = u16(buffer, frameStart + 4 + 2 + 2);
    offset = frameStart + 4 + 2 + 2 + 2 + 3;

    const pixels = new Uint8ClampedArray(w * h * 4);

    while (offset + 6 <= frameEnd) {
      const chunkSize = u32(buffer, offset);
      const chunkType = u16(buffer, offset + 4);
      const chunkData = offset + 6;
      const chunkEnd = chunkData + chunkSize;

      if (chunkType === 0x2019 || chunkType === 0x2020) {
        palette = parsePaletteChunk(buffer, offset, chunkSize);
      }

      if (chunkType === 0x2005) {
        parseCelChunk(buffer, chunkData, chunkEnd, w, h, pixels, bpp, palette);
      }

      offset = chunkEnd;
    }

    frames.push({ duration: duration || 100, pixels });
    offset = frameEnd;
  }

  return { width: w, height: h, frames };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, t, data, crc]);
}

function writePng(filePath, width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }

  fs.writeFileSync(
    filePath,
    Buffer.concat([
      signature,
      pngChunk("IHDR", ihdr),
      pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      pngChunk("IEND", Buffer.alloc(0)),
    ])
  );
}

function greenify(pixels) {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a === 0) continue;
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    const t = lum / 255;
    out[i] = Math.round(6 + t * 28);
    out[i + 1] = Math.round(120 + t * 77);
    out[i + 2] = Math.round(40 + t * 54);
    out[i + 3] = a;
  }
  return out;
}

function exportFile(name) {
  const srcPath = path.join(SRC, `${name}.aseprite`);
  if (!fs.existsSync(srcPath)) {
    console.warn(`Skip ${name}: ${srcPath}`);
    return;
  }

  const { width, height, frames } = parseAseprite(fs.readFileSync(srcPath));
  const meta = {
    name,
    width,
    height,
    frames: frames.map((frame, i) => {
      const file = `${name}-${i}.png`;
      writePng(path.join(OUT, file), width, height, greenify(frame.pixels));
      return { file, duration: frame.duration };
    }),
  };

  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(meta, null, 2));
  console.log(`OK ${name}: ${frames.length} frame(s) ${width}x${height}`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const name of ["note", "neko1", "neko2", "neko3"]) exportFile(name);

for (const name of ["neko1", "note"]) {
  const { frames, width, height } = parseAseprite(
    fs.readFileSync(path.join(SRC, `${name}.aseprite`))
  );
  let alpha = 0;
  for (let i = 3; i < frames[0].pixels.length; i += 4) {
    if (frames[0].pixels[i] > 0) alpha++;
  }
  console.log(`DEBUG ${name}: alpha=${alpha}/${width * height}`);
}
