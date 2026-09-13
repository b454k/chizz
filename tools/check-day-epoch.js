// node tools/check-day-epoch.js
//
// The daily clock exists twice and cannot be reduced further: the server side is one
// module, lib/day.js, imported by both functions; the client side is a copy inside
// index.html, because that file is a single self-contained page with no imports and no
// build step, which is the shape of the whole project.
//
// If those two ever disagree the failure is silent. The client generates the wrong
// day's words, posts its score to the wrong board, and the server expires the round at
// the wrong hour, with nothing anywhere reporting a problem. So this asserts they
// match. Run it before a deploy, or after touching either copy.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const shared = fs.readFileSync(path.join(root, "lib", "day.js"), "utf8");
const page = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");

function find(source, label, re) {
  const all = [...source.matchAll(re)];
  if (all.length !== 1) {
    console.error("FAIL: expected exactly one " + label + ", found " + all.length);
    process.exit(1);
  }
  return all[0];
}

const epochRe = /Date\.UTC\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
const dayMsRe = /DAY_MS\s*=\s*(\d+)/g;

const a = find(shared, "epoch in lib/day.js", epochRe).slice(1, 7).join(",");
const b = find(page, "epoch in public/index.html", epochRe).slice(1, 7).join(",");
const am = find(shared, "DAY_MS in lib/day.js", dayMsRe)[1];
const bm = find(page, "DAY_MS in public/index.html", dayMsRe)[1];

let bad = false;
if (a !== b) {
  console.error("FAIL: the epochs disagree");
  console.error("  lib/day.js        Date.UTC(" + a + ")");
  console.error("  public/index.html Date.UTC(" + b + ")");
  bad = true;
}
if (am !== bm) {
  console.error("FAIL: DAY_MS disagrees — " + am + " vs " + bm);
  bad = true;
}
if (bad) {
  console.error("");
  console.error("The client and server would disagree about what day it is. Scores would");
  console.error("land on the wrong board and daily rounds would expire at the wrong time.");
  process.exit(1);
}

// And that the day it produces is sane, so a typo inside a matching pair still shows up.
const [y, mo, d, h, mi, s] = a.split(",").map(Number);
const epoch = Date.UTC(y, mo, d, h, mi, s);
const day = Math.floor((Date.now() - epoch) / Number(am)) + 1;
const weekday = new Date(epoch + Number(am) / 2).getUTCDay();

console.log("day 1 starts   " + new Date(epoch).toISOString() + "  (midnight in Turkey)");
console.log("day 1 falls on " + ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][weekday]);
console.log("today is day   " + day);
if (weekday !== 2) {
  console.error("FAIL: day 1 was meant to be a Tuesday");
  process.exit(1);
}
if (day < 1) {
  console.error("FAIL: the epoch is in the future, so there is no day 1 yet");
  process.exit(1);
}
console.log("");
console.log("client and server agree.");
