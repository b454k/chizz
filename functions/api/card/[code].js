// GET /api/card/A7K2.png  ->  the round's 20 drawings as one PNG, 4 across and 5 down
//
// This is the picture chat apps show when the link is pasted. It is drawn here from
// the strokes already in KV rather than uploaded by the player, which means it costs
// no extra storage and works for rounds shared before it existed.
//
// The words are deliberately NOT written on it. A preview that labelled each drawing
// would hand the recipient every answer before they opened the game.
//
// No image library: a PNG is a handful of chunks around a deflate stream, and line
// art at one bit per pixel is nearly all long runs of identical bytes, which a match
// at distance 1 collapses to a few bits each. That is the whole compressor below --
// enough to make a 1600x2000 sheet cost tens of kilobytes instead of four hundred,
// which is what lets the picture be drawn at a size a phone will not have to enlarge.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

// Rendered at twice the obvious size: a chat app shows the preview around 350 css px
// wide, and on a 3x screen that is over a thousand device pixels. An 800px sheet was
// being enlarged to fit, which is what made it look soft.
const COLS = 4, ROWS = 5, CELL = 400;
const W = COLS * CELL, H = ROWS * CELL;
const PAD = 26;                 // keeps strokes off the cell edges
const PEN = 5;                  // half-width of the pen: an 11px stroke, ~2.75% of a cell

const PAPER = [0xe8, 0xe5, 0xde];
const INK   = [0x17, 0x18, 0x1c];

/* ------------------------------------------------------------- checksums --- */

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

/* --------------------------------------------------------------- deflate --- */

const LEN_BASE  = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
const LEN_EXTRA = [0,0,0,0,0,0,0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0];

// A Huffman code is written high bit first while the stream is packed low bit first,
// so every code has to come out reversed. Reversing them once at startup turns the
// inner loop from eight or nine single-bit writes into one.
function reverseBits(code, bits) {
  let r = 0;
  for (let i = 0; i < bits; i++) r = (r << 1) | ((code >>> i) & 1);
  return r >>> 0;
}

const LIT_REV = new Uint16Array(256), LIT_BITS = new Uint8Array(256);
for (let b = 0; b < 256; b++) {
  const code = b <= 143 ? 0x30 + b : 0x190 + (b - 144);
  const bits = b <= 143 ? 8 : 9;
  LIT_REV[b] = reverseBits(code, bits); LIT_BITS[b] = bits;
}
const LENC_REV = new Uint16Array(286), LENC_BITS = new Uint8Array(286);
for (let c = 256; c <= 285; c++) {
  const code = c <= 279 ? c - 256 : 0xC0 + (c - 280);
  const bits = c <= 279 ? 7 : 8;
  LENC_REV[c] = reverseBits(code, bits); LENC_BITS[c] = bits;
}

// Fixed Huffman, and the only matches looked for are runs of one repeated byte. For a
// sheet that is mostly blank paper that is nearly all of the win.
function deflateFixed(data) {
  // Literal-only output can grow slightly, so leave room rather than reallocating.
  const out = new Uint8Array(data.length + (data.length >> 2) + 64);
  let at = 0, bitBuf = 0, bitCount = 0;

  function putBits(value, count) {          // deflate packs bits low end first
    bitBuf |= (value << bitCount);
    bitCount += count;
    while (bitCount >= 8) { out[at++] = bitBuf & 0xFF; bitBuf >>>= 8; bitCount -= 8; }
  }
  function literal(b) { putBits(LIT_REV[b], LIT_BITS[b]); }
  function lengthCode(c) { putBits(LENC_REV[c], LENC_BITS[c]); }
  function match(len) {                     // always distance 1
    let i = LEN_BASE.length - 1;
    while (LEN_BASE[i] > len) i--;
    lengthCode(257 + i);
    if (LEN_EXTRA[i]) putBits(len - LEN_BASE[i], LEN_EXTRA[i]);
    putBits(0, 5);                          // distance code 0 = distance 1
  }

  putBits(1, 1);                            // final block
  putBits(1, 2);                            // fixed Huffman

  let i = 0;
  while (i < data.length) {
    const b = data[i];
    let j = i + 1;
    while (j < data.length && data[j] === b) j++;
    const run = j - i;
    if (run >= 4) {
      literal(b);
      let rem = run - 1;
      while (rem >= 3) { const take = Math.min(258, rem); match(take); rem -= take; }
      while (rem > 0) { literal(b); rem--; }
    } else {
      for (let k = 0; k < run; k++) literal(b);
    }
    i = j;
  }

  lengthCode(256);                          // end of block
  if (bitCount > 0) out[at++] = bitBuf & 0xFF;
  return out.subarray(0, at);
}

function zlib(raw) {
  const body = deflateFixed(raw);
  const out = new Uint8Array(2 + body.length + 4);
  out[0] = 0x78; out[1] = 0x01;
  out.set(body, 2);
  const ad = adler32(raw);
  const p = 2 + body.length;
  out[p] = (ad >>> 24) & 0xFF; out[p + 1] = (ad >>> 16) & 0xFF;
  out[p + 2] = (ad >>> 8) & 0xFF; out[p + 3] = ad & 0xFF;
  return out;
}

/* ------------------------------------------------------------------- png --- */

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function buildPng(rows) {
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
    chunk("IDAT", zlib(rows)),
    chunk("IEND", new Uint8Array(0))
  ];
  let total = 0;
  parts.forEach(function (p) { total += p.length; });
  const png = new Uint8Array(total);
  let at = 0;
  parts.forEach(function (p) { png.set(p, at); at += p.length; });
  return png;
}

/* --------------------------------------------------------------- drawing --- */

// Rows are packed as PNG wants them: one filter byte, then one bit per pixel.
const ROW_BYTES = Math.ceil(W / 8);

function setPixel(rows, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  rows[y * (ROW_BYTES + 1) + 1 + (x >> 3)] |= 0x80 >> (x & 7);
}

// A run of bits at a time. Setting an eleven pixel wide nib one pixel at a time was
// most of the render cost; whole bytes in the middle of the run go in at once.
function span(rows, y, x0, x1) {
  if (y < 0 || y >= H) return;
  if (x0 < 0) x0 = 0;
  if (x1 > W - 1) x1 = W - 1;
  if (x1 < x0) return;
  const base = y * (ROW_BYTES + 1) + 1;
  const b0 = x0 >> 3, b1 = x1 >> 3;
  const head = 0xFF >> (x0 & 7);
  const tail = (0xFF << (7 - (x1 & 7))) & 0xFF;
  if (b0 === b1) { rows[base + b0] |= head & tail; return; }
  rows[base + b0] |= head;
  for (let b = b0 + 1; b < b1; b++) rows[base + b] = 0xFF;
  rows[base + b1] |= tail;
}

function stamp(rows, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) span(rows, cy + dy, cx - r, cx + r);
}

function line(rows, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  // Nibs PEN apart still overlap by half their width, so the stroke stays solid
  // while doing a fifth of the work of a stamp per pixel.
  const steps = Math.max(1, Math.ceil(dist / PEN));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stamp(rows, Math.round(x0 + dx * t), Math.round(y0 + dy * t), PEN);
  }
}

function drawCell(rows, strokes, ox, oy) {
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
      stamp(rows, Math.round(p[0]), Math.round(p[1]), PEN);
      continue;
    }
    for (let i = 1; i < pts.length; i++) {
      const a = at(i - 1), b = at(i);
      line(rows, a[0], a[1], b[0], b[1]);
    }
  }
}

function render(drawings) {
  const rows = new Uint8Array((ROW_BYTES + 1) * H);

  // Boxes sit flush against each other, so a hairline is what separates them.
  for (let c = 1; c < COLS; c++) {
    for (let y = 0; y < H; y++) span(rows, y, c * CELL, c * CELL + 1);
  }
  for (let r = 1; r < ROWS; r++) {
    span(rows, r * CELL, 0, W - 1);
    span(rows, r * CELL + 1, 0, W - 1);
  }

  for (let i = 0; i < COLS * ROWS; i++) {
    const strokes = Array.isArray(drawings[i]) ? drawings[i] : [];
    drawCell(rows, strokes, (i % COLS) * CELL, Math.floor(i / COLS) * CELL);
  }
  return buildPng(rows);
}

/* --------------------------------------------------------------- handler --- */

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
