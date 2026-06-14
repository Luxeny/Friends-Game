import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const pngPath = path.join(ROOT, "public", "sprites", "neko1-0.png");

function countAlphaInRgba(rgba, w, h) {
  let nz = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) nz++;
  return { nz, total: w * h };
}

function readPngRgba(file) {
  const buf = fs.readFileSync(file);
  let o = 8;
  let w = 0, h = 0;
  const idats = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o); o += 4;
    const type = buf.toString("ascii", o, o + 4); o += 4;
    const data = buf.subarray(o, o + len); o += len; o += 4;
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === "IDAT") idats.push(data);
    if (type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const stride = w * 4;
  const rgba = Buffer.alloc(stride * h);
  let src = 0;
  for (let y = 0; y < h; y++) {
    src++;
    inflated.copy(rgba, y * stride, src, src + stride);
    src += stride;
  }
  return { w, h, rgba };
}

const png = readPngRgba(pngPath);
const pngStats = countAlphaInRgba(png.rgba, png.w, png.h);
console.log("PNG", path.basename(pngPath), "size", fs.statSync(pngPath).size, "bytes");
console.log("PNG non-zero alpha:", pngStats.nz, "/", pngStats.total);

const mod = await import("./export-sprites.mjs").catch(() => null);
