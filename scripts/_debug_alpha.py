import struct, zlib, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
png = ROOT / "public" / "sprites" / "neko1-0.png"
ase = Path(os.environ.get("USERPROFILE", "")) / "Downloads" / "neko1.aseprite"

def count_alpha_rgba(buf, total):
    nz = sum(1 for i in range(3, len(buf), 4) if buf[i] > 0)
    return nz, total

def read_png_rgba(path):
    data = path.read_bytes()
    o = 8
    w = h = 0
    idats = []
    while o < len(data):
        ln = struct.unpack(">I", data[o:o+4])[0]; o += 4
        typ = data[o:o+4].decode(); o += 4
        chunk = data[o:o+ln]; o += ln + 4
        if typ == "IHDR":
            w, h = struct.unpack(">II", chunk[:8])
        elif typ == "IDAT":
            idats.append(chunk)
        elif typ == "IEND":
            break
    raw = zlib.decompress(b"".join(idats))
    stride = w * 4
    rgba = bytearray(stride * h)
    src = 0
    for y in range(h):
        src += 1
        rgba[y*stride:(y+1)*stride] = raw[src:src+stride]
        src += stride
    return w, h, rgba

w, h, rgba = read_png_rgba(png)
nz, tot = count_alpha_rgba(rgba, w*h)
print(f"PNG {png.name} fileBytes={png.stat().st_size}")
print(f"PNG nonZeroAlpha={nz}/{tot}")

# minimal aseprite frame0 alpha from parser (indexed + compressed cel)
def u16(b,o): return b[o]|(b[o+1]<<8)
def u32(b,o): return b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24)
def i16(b,o):
    v = u16(b,o)
    return v-65536 if v>=32768 else v

def decode_compressed_rgba(data, cel_w, cel_h):
    out = bytearray(cel_w*cel_h*4)
    src = cel_h*2
    for y in range(cel_h):
        row_bytes = u16(data, y*2)
        row_end = src + row_bytes
        x = 0
        while src < row_end and x < cel_w:
            b = data[src]; src += 1
            if not (b & 0x80):
                count = (b & 0x7f) + 1
                for _ in range(count):
                    if x >= cel_w: break
                    di = (y*cel_w+x)*4
                    out[di:di+4] = data[src:src+4]; src += 4; x += 1
            else:
                count = (b & 0x7f) + 1
                r,g,bl,a = data[src:src+4]; src += 4
                for _ in range(count):
                    if x >= cel_w: break
                    di = (y*cel_w+x)*4
                    out[di:di+4] = bytes([r,g,bl,a]); x += 1
        src = row_end
    return out

def parse_palette(buf, offset, size):
    pal = [[0,0,0,0] for _ in range(256)]
    o = offset + 6
    end = offset + 6 + size
    if size >= 8: o += 8
    while o + 6 <= end:
        has_name = buf[o]; o += 1
        r,g,b,a,idx = buf[o:o+5]; o += 5
        pal[idx] = [r,g,b,a]
        if has_name:
            nl = u16(buf,o); o += 2+nl
    return pal

buf = ase.read_bytes()
W,H = u16(buf,8), u16(buf,10)
fc = u16(buf,6)
depth = u16(buf,28)
bpp = 4 if depth==32 else 2 if depth==16 else 1
pal = [[0,0,0,0] for _ in range(256)]
off = 128
pixels = bytearray(W*H*4)
for f in range(fc):
    data_size = u32(buf, off)
    frame_end = off + 6 + data_size
    off += 6 + 16
    pixels = bytearray(W*H*4)
    while off < frame_end:
        cs = u32(buf, off)
        ct = u16(buf, off+4)
        cd = off + 6
        ce = cd + cs
        if ct in (0x2019, 0x2020):
            pal = parse_palette(buf, off, cs)
        if ct == 0x2005:
            cx,cy = i16(buf,cd+2), i16(buf,cd+4)
            ctpe = u16(buf, cd+7)
            if ctpe != 1:
                cw,ch = u16(buf,cd+9), u16(buf,cd+11)
                if ctpe == 0:
                    raw = buf[cd+13:ce]
                    if bpp == 4:
                        for y in range(ch):
                            for x in range(cw):
                                si=(y*cw+x)*4
                                px,py=cx+x,cy+y
                                if 0<=px<W and 0<=py<H:
                                    di=(py*W+px)*4
                                    pixels[di:di+4]=raw[si:si+4]
                    else:
                        for y in range(ch):
                            for x in range(cw):
                                idx = raw[y*cw+x]
                                px,py=cx+x,cy+y
                                if idx==0: continue
                                if 0<=px<W and 0<=py<H:
                                    di=(py*W+px)*4
                                    c=pal[idx]
                                    pixels[di:di+4]=bytes(c)
                elif ctpe == 2:
                    cl = u32(buf, cd+13)
                    comp = buf[cd+17:cd+17+cl]
                    infl = zlib.decompress(comp, -15)
                    rgba_cel = decode_compressed_rgba(infl, cw, ch)
                    for y in range(ch):
                        for x in range(cw):
                            si=(y*cw+x)*4
                            px,py=cx+x,cy+y
                            if 0<=px<W and 0<=py<H:
                                di=(py*W+px)*4
                                pixels[di:di+4]=rgba_cel[si:si+4]
        off = ce
    break

pnz, _ = count_alpha_rgba(pixels, W*H)
print(f"Parser neko1 frame0 nonZeroAlpha={pnz}/{W*H}")