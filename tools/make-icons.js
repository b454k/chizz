// Draws the site icon -- a graphite "c" on pencil yellow, with the pencil that is just
// finishing it -- as PNG, ICO and SVG files, and the picture the bare address shows when it
// is pasted into a chat (og.png).
//
// Search engines and link previews do not read an SVG icon: they ask for /favicon.ico or a
// PNG, and without one they show a globe. Everything here is geometry -- strokes, polygons
// and circles, antialiased by their distance from each pixel -- so it looks the same
// everywhere with no font and no image library involved. public/icon.svg is written from
// the same numbers, so the two cannot drift apart.
//
// At tab sizes the outlined pencil turns to mush, so 16, 32 and 48 get a solid one: the
// same shape, fewer lines.
//
//   node tools/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "public");
const INK = [0x1d, 0x1b, 0x18];
const YELLOW = [0xff, 0xc5, 0x3d];
const WOOD = [0xff, 0xf3, 0xdc];
const PAPER = [0xff, 0xff, 0xff];
const PAGE = [0xf4, 0xef, 0xe6];
const DOT = [0xd9, 0xcf, 0xbd];
const LINE2 = [0xcd, 0xbf, 0xa6];

/* ------------------------------------------------------------- geometry --- */

// A path in the SVG subset the drawings here use: M, L, H, V, C, Z, absolute only.
// Curves are flattened into short segments.
function flatten(d){
  const tok = d.match(/[MLHVCZ]|-?\d*\.?\d+/g);
  const lines = [];
  let cur = null, start = null, i = 0, cmd = "";
  const num = () => Number(tok[i++]);
  while (i < tok.length){
    if (/[MLHVCZ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "M"){ cur = [num(), num()]; start = cur; lines.push([cur]); cmd = "L"; continue; }
    const line = lines[lines.length - 1];
    if (cmd === "L"){ cur = [num(), num()]; line.push(cur); }
    else if (cmd === "H"){ cur = [num(), cur[1]]; line.push(cur); }
    else if (cmd === "V"){ cur = [cur[0], num()]; line.push(cur); }
    else if (cmd === "C"){
      const p1 = [num(), num()], p2 = [num(), num()], p3 = [num(), num()], p0 = cur;
      for (let s = 1; s <= 24; s++){
        const t = s / 24, u = 1 - t;
        line.push([u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
                   u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]]);
      }
      cur = p3;
    }
    else if (cmd === "Z"){ line.push(start); cur = start; }
  }
  return lines;
}

function transform(pts, tx, ty, deg, k){
  const a = (deg || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), m = k || 1;
  return pts.map(p => [tx + (p[0] * c - p[1] * s) * m, ty + (p[0] * s + p[1] * c) * m]);
}

function segDist(px, py, a, b){
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  let t = len ? ((px - a[0]) * dx + (py - a[1]) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx - px, y = a[1] + t * dy - py;
  return Math.sqrt(x * x + y * y);
}

function inside(px, py, poly){
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const a = poly[i], b = poly[j];
    if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

function bounds(pts, pad){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

/* A shape answers one question: how far inside it is a point, in the scene's own units.
   Positive inside, negative outside. Coverage then comes from that distance over the size
   of a pixel, which is all the antialiasing a picture made of lines needs. */
const stroke = (lines, width, color) => {
  const segs = [];
  lines.forEach(l => { for (let i = 1; i < l.length; i++) segs.push([l[i - 1], l[i]]); if (l.length === 1) segs.push([l[0], l[0]]); });
  const box = bounds([].concat(...lines), width);
  return { color, box, sd(x, y){ let d = Infinity; for (const s of segs) d = Math.min(d, segDist(x, y, s[0], s[1])); return width / 2 - d; } };
};
const fill = (poly, color) => {
  const box = bounds(poly, 1);
  return { color, box, sd(x, y){
    let d = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j], poly[i]));
    return inside(x, y, poly) ? d : -d;
  } };
};
const disc = (cx, cy, r, color) => ({ color, box: [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1],
  sd(x, y){ return r - Math.hypot(x - cx, y - cy); } });
const roundRect = (x0, y0, w, h, r, color) => ({ color, box: [x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1], sd(x, y){
  const qx = Math.abs(x - (x0 + w / 2)) - (w / 2 - r), qy = Math.abs(y - (y0 + h / 2)) - (h / 2 - r);
  return r - (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0));
} });

// Paints the shapes in order onto an RGBA buffer of size W x H showing the scene's
// [0, SW] x [0, SH]. clip, if given, is a shape outside which nothing is drawn.
function render(W, H, SW, shapes, clip){
  const px = Buffer.alloc(W * H * 4);
  const k = W / SW;                       // pixels per scene unit
  for (let y = 0; y < H; y++){
    for (let x = 0; x < W; x++){
      const sx = (x + 0.5) / k, sy = (y + 0.5) / k;
      let r = 0, g = 0, b = 0, a = 0;
      for (const s of shapes){
        if (sx < s.box[0] || sy < s.box[1] || sx > s.box[2] || sy > s.box[3]) continue;
        const cov = Math.max(0, Math.min(1, 0.5 + s.sd(sx, sy) * k));
        if (!cov) continue;
        r = r + (s.color[0] - r) * cov; g = g + (s.color[1] - g) * cov; b = b + (s.color[2] - b) * cov;
        a = a + (1 - a) * cov;
      }
      const o = (y * W + x) * 4;
      // The colours were blended premultiplied; divide the coverage back out so a soft
      // edge keeps its colour instead of going dark.
      if (a > 0){
        px[o] = Math.round(Math.min(255, r / a));
        px[o + 1] = Math.round(Math.min(255, g / a));
        px[o + 2] = Math.round(Math.min(255, b / a));
      }
      const cut = clip ? Math.max(0, Math.min(1, 0.5 + clip.sd(sx, sy) * k)) : 1;
      px[o + 3] = Math.round(255 * a * cut);
    }
  }
  return px;
}

/* ------------------------------------------------------------ the mark --- */

// In a 64-unit square. The same numbers write public/icon.svg below.
const C_PATH = "M43 20.5 C38 14.5 29 14 22.5 18 C14.5 23 12.5 35 16 42.5 C19.5 50 28.5 52.5 35.5 50 C38.5 49 40.5 47.5 42.5 45.5";
const TIP = [42.5, 45.5], TILT = -45;
const PENCIL = {
  point: [[0, 0], [4.8, -2.4], [4.8, 2.4]],
  cone:  [[4.8, -2.4], [12, -7], [12, 7], [4.8, 2.4]],
  body:  [[12, -7], [56, -7], [56, 7], [12, 7]]
};
const at = pts => transform(pts, TIP[0], TIP[1], TILT);

function markShapes(small){
  const shapes = [];
  shapes.push(stroke(flatten(C_PATH), 8.5, INK));
  if (small){
    // tab sizes: a solid pencil, cone left pale so it still reads as a point
    shapes.push(fill(at(PENCIL.body), INK));
    shapes.push(fill(at(PENCIL.cone), WOOD));
    shapes.push(fill(at(PENCIL.point), INK));
  } else {
    shapes.push(fill(at(PENCIL.body), YELLOW));
    shapes.push(fill(at(PENCIL.cone), WOOD));
    shapes.push(fill(at(PENCIL.point), INK));
    shapes.push(stroke([at(PENCIL.cone.concat([PENCIL.cone[0]]))], 2.4, INK));
    shapes.push(stroke([at(PENCIL.body.concat([PENCIL.body[0]]))], 2.4, INK));
    shapes.push(stroke([at([[12, -2.3], [56, -2.3]])], 1.4, INK));
    shapes.push(stroke([at([[12, 2.3], [56, 2.3]])], 1.4, INK));
  }
  return shapes;
}

function icon(size, rounded){
  const small = size <= 48;
  const tile = rounded ? roundRect(0, 0, 64, 64, 14, YELLOW) : roundRect(-1, -1, 66, 66, 0.01, YELLOW);
  return png(size, size, render(size, size, 64, [tile].concat(markShapes(small)), tile));
}

function iconSvg(){
  const r = p => p.map(q => q.join(",")).join(" ");
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="chizz">',
    '  <!-- Written by tools/make-icons.js from the geometry that draws the PNG and ICO files. -->',
    '  <defs><clipPath id="t"><rect width="64" height="64" rx="14"/></clipPath></defs>',
    '  <g clip-path="url(#t)">',
    '    <rect width="64" height="64" fill="#FFC53D"/>',
    '    <path d="' + C_PATH + '" fill="none" stroke="#1D1B18" stroke-width="8.5" stroke-linecap="round"/>',
    '    <g transform="translate(' + TIP.join(" ") + ') rotate(' + TILT + ')" stroke="#1D1B18" stroke-linejoin="round">',
    '      <polygon points="' + r(PENCIL.body) + '" fill="#FFC53D" stroke-width="2.4"/>',
    '      <polygon points="' + r(PENCIL.cone) + '" fill="#FFF3DC" stroke-width="2.4"/>',
    '      <polygon points="' + r(PENCIL.point) + '" fill="#1D1B18" stroke="none"/>',
    '      <path d="M12 -2.3 H56 M12 2.3 H56" stroke-width="1.4"/>',
    '    </g>',
    '  </g>',
    '</svg>',
    ''
  ].join("\n");
}

/* ------------------------------------------------------ the link card --- */

// The picture a pasted chizz.party shows: the wordmark on the sketchbook page, and four
// drawings from a real round -- a door, a fridge, a phone and a suitcase, tall boxes that
// are hard to tell apart, which is the game. No words on it; the preview's own title
// carries those.
const WORDMARK = [
  "M58 61 C52 52 41 49 32 53 C21 58 17 72 19 82 C22 96 35 102 46 101 C51 100.5 55 98 58 94",
  "M76 14 C76.4 42 75.8 72 76 100",
  "M76.5 74 C80 60 89 52 99 52 C108.5 52 112 60 112 71 L112 100",
  "M131 57 L131 100",
  "M148 57.5 C160 56 172 56 184 57 L150 99 C163 100.5 175 100.5 187 99",
  "M201 57.5 C213 56 225 56 237 57 L203 99 C216 100.5 228 100.5 241 98.5"
];
const SWOOSH = "M16 113 C80 106 165 107 246 110";
// Strokes from round 6G75, in the 0-255 space the game stores them in, lightly simplified.
const DRAWINGS = {
  "kapı": [[[115,63],[136,60],[180,47],[174,70],[173,129],[175,148],[177,153],[181,179],[170,180],[122,200],[104,205],[94,205],[93,198],[101,142],[101,65],[105,35],[108,40]],[[156,110],[159,115],[159,122]]],
  "buzdolabı": [[[102,54],[136,45],[143,44],[152,45],[147,93],[147,133],[154,158],[155,176],[148,181],[139,185],[114,193],[98,196],[81,196],[77,193],[75,189],[75,166],[79,138],[84,116],[89,82],[90,56],[92,52]],[[82,98],[157,99]],[[135,78],[135.5,78]],[[141,108],[141.5,108]]],
  "telefon": [[[95,57],[93,63],[95,57],[93,63],[92,78],[77,159],[75,190],[83,193],[133,202],[132,193],[135,178],[154,118],[167,67],[167,59],[166,57],[163,56],[112,56],[99,60],[95,68]],[[107,176],[106,185]]],
  "valiz": [[[97,77],[85,140],[82,163],[82,174],[145,190],[145,161],[155,102],[155,80],[154,76],[148,70],[138,65],[132,64],[103,64],[94,66],[93,68]],[[108,63],[109,53],[118,35],[121,25],[121,31],[125,40],[130,43],[139,43],[141,44],[142,48],[135,66],[132,81]],[[96,188],[94,194],[94,204],[97,216]],[[128,190],[126,202]]]
};

function card(){
  const W = 1200, H = 630;
  const shapes = [roundRect(-2, -2, W + 4, H + 4, 0.01, PAGE)];
  for (let y = 15; y < H; y += 30) for (let x = 15; x < W; x += 30) shapes.push(disc(x, y, 1.9, DOT));
  // the wordmark, left of centre
  const k = 2.35, ox = 70, oy = 150;
  const mark = d => flatten(d).map(l => transform(l, ox, oy, 0, k));
  shapes.push(stroke(mark(SWOOSH), 11 * k, YELLOW));
  WORDMARK.forEach(d => shapes.push(stroke(mark(d), 13 * k, INK)));
  shapes.push(disc(ox + 131 * k, oy + 31 * k, 9 * k + 2 * k, INK));
  shapes.push(disc(ox + 131 * k, oy + 31 * k, 9 * k - 2 * k, YELLOW));
  // four drawings on paper tiles, tilted as if dropped on the page
  const tiles = [["kapı", 760, 80, -5], ["buzdolabı", 960, 110, 4], ["telefon", 780, 330, 3], ["valiz", 975, 345, -6]];
  tiles.forEach(t => {
    const S = 180, cx = t[1] + S / 2, cy = t[2] + S / 2;
    const sq = [[-S / 2, -S / 2], [S / 2, -S / 2], [S / 2, S / 2], [-S / 2, S / 2]];
    shapes.push(fill(transform(sq, cx, cy + 9, t[3]), INK));                    // the hard shadow
    shapes.push(fill(transform(sq, cx, cy, t[3]), PAPER));
    shapes.push(stroke([transform(sq.concat([sq[0]]), cx, cy, t[3])], 5, INK));
    const lines = DRAWINGS[t[0]].map(l => transform(l.map(p => [p[0] - 127.5, p[1] - 127.5]), cx, cy, t[3], S / 255 * 0.94));
    shapes.push(stroke(lines, 6, INK));
  });
  // the one that was right, marked
  shapes.push(disc(1128, 116, 26, [0x1c, 0x7d, 0x45]));
  shapes.push(stroke([[[1116, 117], [1125, 126], [1141, 107]]], 7, [0xff, 0xff, 0xff]));
  // a pencil across the foot of the wordmark
  const pen = pts => transform(pts, 150, 520, -8, 3.4);
  shapes.push(fill(pen([[12, -7], [120, -7], [120, 7], [12, 7]]), YELLOW));
  shapes.push(fill(pen(PENCIL.cone), WOOD));
  shapes.push(fill(pen(PENCIL.point), INK));
  shapes.push(fill(pen([[120, -7], [132, -7], [132, 7], [120, 7]]), LINE2));
  shapes.push(fill(pen([[132, -7], [142, -7], [146, -3], [146, 3], [142, 7], [132, 7]]), [0xf4, 0x87, 0x9a]));
  shapes.push(stroke([pen([[4.8, -2.4], [12, -7], [146, -7]]), pen([[4.8, 2.4], [12, 7], [146, 7]]), pen([[12, -7], [12, 7]]),
                      pen([[120, -7], [120, 7]]), pen([[132, -7], [132, 7]]), pen([[146, -3.5], [146, 3.5]])], 2.4, INK));
  shapes.push(stroke([pen([[12, -2.3], [120, -2.3]]), pen([[12, 2.3], [120, 2.3]])], 1.2, INK));
  return png(W, H, render(W, H, W, shapes));
}

/* ------------------------------------------------------------ encoding --- */

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

function png(w, h, rgba){
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4);
  head[8] = 8; head[9] = 6;                         // 8-bit RGBA
  const rows = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
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

fs.writeFileSync(path.join(OUT, "favicon.ico"), ico([[16, icon(16, true)], [32, icon(32, true)], [48, icon(48, true)]]));
// Home screens round the corners themselves, so these two are full squares.
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), icon(180, false));
fs.writeFileSync(path.join(OUT, "icon-512.png"), icon(512, false));
fs.writeFileSync(path.join(OUT, "icon.svg"), iconSvg());
fs.writeFileSync(path.join(OUT, "og.png"), card());
console.log("favicon.ico, apple-touch-icon.png, icon-512.png, icon.svg, og.png written");
