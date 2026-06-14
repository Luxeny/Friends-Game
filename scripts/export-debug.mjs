import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function u16(buf, o) {
  return buf.readUInt16LE(o);
}

function findChunkOffset(buf, frameStart, frameEnd) {
  const magicAt = frameStart + 4;
  if (u16(buf, magicAt) !== 0xf1fa) return frameStart + 13;

  for (let skip = 9; skip <= 16; skip++) {
    const o = frameStart + 4 + skip;
    if (o + 6 > frameEnd) continue;
    const size = u32(buf, o);
    const type = u16(buf, o + 4);
    if (size > 0 && size <= frameEnd - o - 6) {
      return o;
    }
    if (size === 0 && type === 0) return o;
  }
  return frameStart + 13;
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

function parseCelChunk(buf, chunkData, chunkEnd, w, h, pixels) {
  const celX = i16(buf, chunkData + 2);
  const celY = i16(buf, chunkData + 4);
  const celType = u16(buf, chunkData + 7);
  const celW = u16(buf, chunkData + 9);
  const celH = u16(buf, chunkData + 11);
  const lines = [
    `cel type=${celType} pos=${celX},${celY} size=${celW}x${celH}`,
  ];

  if (celType === 2) {
    const compLen = u32(buf, chunkData + 13);
    const compStart = chunkData + 17;
    const compEnd = compLen > 0 ? compStart + compLen : chunkEnd;
    const compressed = buf.subarray(compStart, compEnd);
    lines.push(`compLen=${compLen} compressed=${compressed.length} head=${compressed.subarray(0, 4).toString("hex")}`);
    try {
      const inflated = zlib.inflateSync(compressed);
      lines.push(`inflated=${inflated.length}`);
      const rgba = decodeCompressedRgba(inflated, celW, celH);
      blitRgba(rgba, celW, celH, w, h, celX, celY, pixels);
    } catch (e) {
      lines.push(`inflate error: ${e.message}`);
    }
  }
  return lines;
}

const buf = fs.readFileSync(path.join(process.env.USERPROFILE, "Downloads", "neko1.aseprite"));
const w = u16(buf, 8);
const h = u16(buf, 10);
const pixels = new Uint8ClampedArray(w * h * 4);
const out = [];

const frameStart = 128;
const dataSize = u32(buf, frameStart);
const frameEnd = frameStart + dataSize;
let offset = findChunkOffset(buf, frameStart, frameEnd);
out.push(`frameEnd=${frameEnd} fileLen=${buf.length}`);

while (offset + 6 <= frameEnd) {
  const chunkSize = u32(buf, offset);
  const chunkType = u16(buf, offset + 4);
  out.push(`chunk 0x${chunkType.toString(16)} size=${chunkSize}`);
  if (chunkType === 0x2005) {
    out.push(...parseCelChunk(buf, offset + 6, offset + 6 + chunkSize, w, h, pixels));
  }
  offset += 6 + chunkSize;
}

let alpha = 0;
for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) alpha++;
out.push(`alpha=${alpha}`);

fs.writeFileSync(path.join(__dirname, "export-debug.txt"), out.join("\n"));
