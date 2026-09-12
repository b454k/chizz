// GET /api/card/A7K2.png  ->  the round's 20 drawings as one PNG, 4 across and 5 down
//
// This is the picture chat apps show when the link is pasted. It is drawn here from
// the strokes already in KV rather than uploaded by the player, which means it costs
// no extra storage and works for rounds shared before it existed.
//
// The words are deliberately NOT written on it. A preview that labelled each drawing
// would hand the recipient every answer before they opened the game.
//
// No image library: a PNG is a handful of chunks around a zlib stream, and a zlib
// stream is allowed to be uncompressed. Line art at one bit per pixel is small enough
// that skipping compression costs nothing worth having -- roughly 100 KB -- and the
// whole thing stays inside the CPU budget because the drawing writes straight into
// the packed rows instead of building an image and squeezing it afterwards.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

const COLS = 4, ROWS = 5, CELL = 200;
const W = COLS * CELL, H = ROWS * CELL;
const PAD = 12;                 // keeps strokes off the cell edges
const PEN = 2;                  // half-width of the pen, in pixels

const PAPER = [0xe8, 0xe5, 0xde];
const INK   = [0x17, 0x18, 0x1c];

/* ----------------------------------------------------------------- png --- */

const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function adler32(bytes) {
  let a = 1, b = 0;
  // The modulo only has to happen before the sums could overflow, not every byte.
  for (let i = 0; i < bytes.length;) {
    const end = Math.min(i + 3000, bytes.length);
    for (; i < end; i++) { a += bytes[i]; b += a; }
    a %= 65521; b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// A zlib stream of stored (uncompressed) deflate blocks.
function zlibStored(raw) {
  const MAX = 65535;
  const blocks = Math.ceil(raw.length / MAX) || 1;
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let p = 0;
  out[p++] = 0x78; out[p++] = 0x01;
  for (let i = 0; i < raw.length; i += MAX) {
    const len = Math.min(MAX, raw.length - i);
    out[p++] = (i + len >= raw.length) ? 1 : 0;        // BFINAL, BTYPE 00
    out[p++] = len & 0xFF; out[p++] = (len >>> 8) & 0xFF;
    out[p++] = ~len & 0xFF; out[p++] = (~len >>> 8) & 0xFF;
    out.set(raw.subarray(i, i + len), p); p += len;
  }
  const ad = adler32(raw);
  out[p++] = (ad >>> 24) & 0xFF; out[p++] = (ad >>> 16) & 0xFF;
  out[p++] = (ad >>> 8) & 0xFF; out[p++] = ad & 0xFF;
  return out.subarray(0, p);
}

function buildPng(rows, rowBytes) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, W);
  view.setUint32(4, H);
  ihdr[8] = 1;      // one bit per pixel
  ihdr[9] = 3;      // indexed colour
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const plte = new Uint8Array([PAPER[0], PAPER[1], PAPER[2], INK[0], INK[1], INK[2]]);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", zlibStored(rows)),
    chunk("IEND", new Uint8Array(0))
  ];
  let total = 0;
  parts.forEach(function (p) { total += p.length; });
  const png = new Uint8Array(total);
  let at = 0;
  parts.forEach(function (p) { png.set(p, at); at += p.length; });
  return png;
}

/* -------------------------------------------------------------- drawing --- */

// Rows are packed as PNG wants them: one filter byte, then one bit per pixel.
function makeRows() {
  const rowBytes = Math.ceil(W / 8);
  return { rows: new Uint8Array((rowBytes + 1) * H), rowBytes: rowBytes };
}

function setPixel(rows, rowBytes, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  rows[y * (rowBytes + 1) + 1 + (x >> 3)] |= 0x80 >> (x & 7);
}

function stamp(rows, rowBytes, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) setPixel(rows, rowBytes, cx + dx, cy + dy);
  }
}

function line(rows, rowBytes, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(rows, rowBytes, Math.round(x0 + dx * t), Math.round(y0 + dy * t), PEN);
  }
}

function drawCell(rows, rowBytes, strokes, ox, oy) {
  const size = CELL - PAD * 2;
  for (let s = 0; s < strokes.length; s++) {
    const pts = strokes[s];
    if (!Array.isArray(pts) || !pts.length) continue;
    const at = function (i) {
      return [
        ox + PAD + (Number(pts[i][0]) || 0) / 255 * size,
        oy + PAD + (Number(pts[i][1]) || 0) / 255 * size
      ];
    };
    if (pts.length === 1) {                      // a tap is still a mark
      const p = at(0);
      stamp(rows, rowBytes, Math.round(p[0]), Math.round(p[1]), PEN);
      continue;
    }
    for (let i = 1; i < pts.length; i++) {
      const a = at(i - 1), b = at(i);
      line(rows, rowBytes, a[0], a[1], b[0], b[1]);
    }
  }
}

function render(drawings) {
  const made = makeRows();
  const rows = made.rows, rowBytes = made.rowBytes;

  // Boxes sit flush against each other, so a hairline is what separates them.
  for (let c = 1; c < COLS; c++) {
    for (let y = 0; y < H; y++) setPixel(rows, rowBytes, c * CELL, y);
  }
  for (let r = 1; r < ROWS; r++) {
    for (let x = 0; x < W; x++) setPixel(rows, rowBytes, x, r * CELL);
  }

  for (let i = 0; i < COLS * ROWS; i++) {
    const strokes = Array.isArray(drawings[i]) ? drawings[i] : [];
    drawCell(rows, rowBytes, strokes, (i % COLS) * CELL, Math.floor(i / COLS) * CELL);
  }
  return buildPng(rows, rowBytes);
}

/* ------------------------------------------------------------- handler --- */

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return new Response("storage not bound", { status: 500 });

  const code = String(params.code || "").trim().toUpperCase().replace(/\.PNG$/, "");
  if (!CODE_PATTERN.test(code)) return new Response("not found", { status: 404 });

  const data = await env.GAMES.get(code, { type: "json" });
  if (!data) return new Response("not found", { status: 404 });

  const drawings = Array.isArray(data.drawings) ? data.drawings
                 : Array.isArray(data.cizimler) ? data.cizimler : [];

  const png = render(drawings);
  return new Response(png, {
    headers: {
      "content-type": "image/png",
      // The drawings never change once saved, so this can be cached hard. Chat apps
      // fetch it once per link and then serve their own copy anyway.
      "cache-control": "public, max-age=86400, s-maxage=604800"
    }
  });
}

export function onRequest() {
  return new Response("GET only", { status: 405 });
}
