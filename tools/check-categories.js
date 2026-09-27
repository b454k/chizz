// node tools/check-categories.js
//
// The pool is kept twice over: by silhouette family, which is what the game deals from,
// and by subject in docs/categories.json, which is what a person reads and what a
// "pick a subject" mode would use one day. Two lists of the same words drift the moment
// a word is added to one of them, so this checks them against each other:
//
//   - every pool word is in exactly one category
//   - no category holds a word the pool does not have
//   - docs/CATEGORIES.md is what tools/make-categories.js would write today

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pool = JSON.parse(fs.readFileSync(path.join(root, "docs", "words.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(path.join(root, "docs", "categories.json"), "utf8"));

let bad = 0;
const fail = msg => { console.error("FAIL: " + msg); bad++; };

const inPool = new Set();
for (const f of pool.families) for (const w of f.words) inPool.add(w);

const seen = new Map();
for (const c of data.categories) {
  for (const w of c.words) {
    if (!inPool.has(w)) fail("in " + c.id + " but not in the pool — " + w);
    if (seen.has(w)) fail(w + " is in two categories — " + seen.get(w) + " and " + c.id);
    seen.set(w, c.id);
  }
}
for (const w of inPool) if (!seen.has(w)) fail("in the pool but in no category — " + w);

const md = path.join(root, "docs", "CATEGORIES.md");
const current = fs.readFileSync(md, "utf8");
const nl = current.includes("\r\n") ? "\r\n" : "\n";
if (require("./make-categories.js").render(nl) !== current) {
  fail("docs/CATEGORIES.md is out of date — run: node tools/make-categories.js");
}

console.log("categories:                " + data.categories.length +
            ", holding " + seen.size + " words");
const widest = data.categories.reduce((a, b) => (a.words.length >= b.words.length ? a : b));
console.log("largest:                   " + widest.id + " (" + widest.words.length + ")");
if (bad) {
  console.error(bad + " problem(s).");
  process.exit(1);
}
console.log("");
console.log("every word is in exactly one category, and the readable copy is current.");
