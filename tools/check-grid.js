// node tools/check-grid.js
//
// The grid order exists twice and cannot be reduced further: lib/grid.js for the server,
// which the link preview is drawn with, and a copy inside public/index.html, because that
// file is a single self-contained page with no imports and no build step, which is the
// shape of the whole project.
//
// If those two disagree the failure is quiet and ugly: the preview shows the drawings in
// one arrangement, the players see another, and the green and red squares in a shared
// score point at the wrong pictures. That is the bug this check was written after.
//
// Rather than compare the source, this runs both on the same drawings and compares what
// they return, so a difference in the hash, the generator or the shuffle all show up.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const lib = fs.readFileSync(path.join(root, "lib", "grid.js"), "utf8");

function fromPage(name) {
  const at = page.indexOf("function " + name + "(");
  if (at < 0) {
    console.error("FAIL: public/index.html has no " + name + "()");
    process.exit(1);
  }
  const end = page.indexOf("\n}", at);
  return page.slice(at, end + 2);
}

// The page's copy, lifted out and run on its own. dailyRandom comes with it: the shuffle
// is dealt with the same generator as the daily schedule.
const pageGrid = new Function(
  "const N = 20;" + fromPage("dailyRandom") + fromPage("seedFrom") + fromPage("gridOrder") +
  "; return gridOrder;"
)();

// The server's copy, as a module.
const libGrid = new Function(
  lib.replace(/^export /gm, "") + "; return gridOrder;"
)();

// Drawings shaped like the real ones: twenty, each a few strokes of quantised points.
function drawings(seed) {
  let s = seed;
  const next = () => (s = (s * 1103515245 + 12345) % 2147483648) % 256;
  const out = [];
  for (let i = 0; i < 20; i++) {
    const strokes = [];
    for (let k = 0; k < 1 + (next() % 4); k++) {
      const pts = [];
      for (let p = 0; p < 2 + (next() % 30); p++) pts.push([next(), next()]);
      strokes.push(pts);
    }
    out.push(strokes);
  }
  return out;
}

let bad = 0;
const TRIES = 200;
for (let t = 0; t < TRIES; t++) {
  const d = drawings(t + 1);
  const a = pageGrid(d).join(",");
  const b = libGrid(d).join(",");
  if (a !== b) {
    if (bad < 3) {
      console.error("FAIL: the two disagree on drawings #" + t);
      console.error("  public/index.html  " + a);
      console.error("  lib/grid.js        " + b);
    }
    bad++;
  }
}

// And that what they agree on is a real grid, so a matching pair of broken copies still
// shows up: every position filled, every drawing used once, and not simply 0..19.
const one = libGrid(drawings(1));
if (one.length !== 20 || new Set(one).size !== 20 || one.some(i => !(i >= 0 && i < 20))) {
  console.error("FAIL: the order is not a permutation of the twenty drawings — " + one.join(","));
  bad++;
}
if (one.join(",") === [...Array(20).keys()].join(",")) {
  console.error("FAIL: the order is not shuffled at all");
  bad++;
}
if (libGrid(drawings(1)).join(",") === libGrid(drawings(2)).join(",")) {
  console.error("FAIL: different drawings give the same order, so a daily round would give itself away");
  bad++;
}

if (bad) {
  console.error("");
  console.error(bad + " problem(s). The link preview and the game would lay the same round");
  console.error("out differently, and a shared score would point at the wrong drawings.");
  process.exit(1);
}

console.log("grid order:    " + one.join(" "));
console.log("checked:       " + TRIES + " rounds, both copies agree on every one");
console.log("");
console.log("the preview and the players see the same grid.");
