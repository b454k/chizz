// Draws the site icon -- an orange "c" on the dark rounded square -- as PNG and ICO files.
//
// Search engines and link previews do not read an SVG icon: they ask for /favicon.ico or a
// PNG, and without one they show a globe. The "c" is drawn as geometry (a thick arc with
// round ends) rather than as a letter, so it looks the same everywhere with no font involved.
// public/icon.svg draws the same shape; change both together.
//
//   node tools/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "public");
const BG = [0x13, 0x14, 0x18];
const INK = [0xff, 0x5c, 0x3d];

// In the SVG's 64-unit square.
const RX = 14, CX = 33, CY = 32, R = 12, HALF = 4, GAP = 45;

function sample(x, y, rounded){
  if (rounded){
    const qx = Math.max(RX - x, 0, x - (64 - RX));
    const qy = Math.max(RX - y, 0, y - (64 - RX));
    if (qx * qx + qy * qy > RX * RX) return null;
  }
  const dx = x - CX, dy = y - CY;
  const a = Math.atan2(dy, dx) * 180 / Math.PI;
  let d;
  if (Math.abs(a) >= GAP) d = Math.abs(Math.hypot(dx, dy) - R);
  else {
    const ex = CX + R * Math.cos(GAP * Math.PI / 180), ey = R * Math.sin(GAP * Math.PI / 180);
    d = Math.min(Math.hypot(x - ex, y - (CY - ey)), Math.hypot(x - ex, y - (CY + ey)));
  }
  return d <= HALF ? INK : BG;
}

function render(size, rounded){
  const SS = 8;
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++){
    for (let pxl = 0; pxl < size; pxl++){
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++){
        for (let sx = 0; sx < SS; sx++){
          const c = sample((pxl + (sx + 0.5) / SS) * 64 / size, (py + (sy + 0.5) / SS) * 64 / size, rounded);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a++;
        }
      }
      const o = (py * size + pxl) * 4;
      if (a){ px[o] = Math.round(r / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(b / a); }
      px[o + 3] = Math.round(255 * a / (SS * SS));
    }
  }
  return png(size, px);
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return buf => { let c = -1; for (const byte of buf) c = t[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();

function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba){
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0); head.writeUInt32BE(size, 4);
  head[8] = 8; head[9] = 6;                         // 8-bit RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", head), chunk("IDAT", zlib.deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))
  ]);
}

// An .ico holding PNG images, which every current reader of favicon.ico accepts.
function ico(images){
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(([size, data], i) => {
    const e = 6 + 16 * i;
    head[e] = size >= 256 ? 0 : size; head[e + 1] = size >= 256 ? 0 : size;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head].concat(images.map(i => i[1])));
}

fs.writeFileSync(path.join(OUT, "favicon.ico"), ico([[16, render(16, true)], [32, render(32, true)], [48, render(48, true)]]));
// Home screens round the corners themselves, so these two are full squares.
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), render(180, false));
fs.writeFileSync(path.join(OUT, "icon-512.png"), render(512, false));
console.log("favicon.ico, apple-touch-icon.png, icon-512.png written");
