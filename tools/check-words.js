// node tools/check-words.js
//
// Words the owner has rejected must never come back, a word must never sit in two
// silhouette families, and the three things that exist twice -- the pool, the bird list
// and the table of other answers that count -- must say the same in both places.
//
// The table is the one that can do real damage unseen: an answer listed for one drawing
// must not be, or be within one edit of, any other word in the pool, or it would quietly
// answer for a drawing it has nothing to do with.
//
// All of it was being kept in my head, which is how a word removed in September was
// proposed again days later, and how a half-applied edit once left docs/words.json and
// public/index.html disagreeing about which family a word was in. This checks the files.
//
// Run it after touching docs/words.json, docs/BANNED-WORDS.md, or the pool in the page.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const banned = readBanned(path.join(root, "docs", "BANNED-WORDS.md"));
const pool = JSON.parse(fs.readFileSync(path.join(root, "docs", "words.json"), "utf8"));
const page = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");

// The banned list lives in prose, under headings that say when and why. Only the
// "## Rejected ..." sections are lists of words; the others explain.
function readBanned(file) {
  const text = fs.readFileSync(file, "utf8");
  const words = new Set();
  let inList = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("## ")) { inList = /^## Rejected/.test(line); continue; }
    if (!inList || !line || line.startsWith("#") || line.startsWith("`") || line.startsWith("See ")) continue;
    if (/^[A-Z]/.test(line) || line.includes("→")) continue;        // explanatory prose
    for (const w of line.split(",")) {
      const word = w.trim().replace(/[.`]/g, "");
      if (word && !word.includes(" is ")) words.add(word);
    }
  }
  return words;
}

// The pool as the game actually holds it
function readPagePool() {
  const src = page.slice(page.indexOf("const DAILY_POOL"), page.indexOf("const DAILY_FAMILIES"));
  const out = {};
  for (const m of src.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  }
  return out;
}

function readPageList(name) {
  const at = page.indexOf("const " + name);
  if (at < 0) return null;
  const end = page.indexOf(";", at);
  return [...page.slice(at, end).matchAll(/"([^"]+)"/g)].map(x => x[1]);
}

let bad = 0;
const fail = msg => { console.error("FAIL: " + msg); bad++; };

// 1. no rejected word, and no word in two families
const seen = new Map();
for (const family of pool.families) {
  for (const word of family.words) {
    if (banned.has(word)) fail("rejected word in the pool — " + word + " (" + family.id + ")");
    if (seen.has(word)) fail(word + " is in two families — " + seen.get(word) + " and " + family.id);
    seen.set(word, family.id);
  }
}

// 2. the record and the running copy must agree, word for word
const pagePool = readPagePool();
const pageFamilies = Object.keys(pagePool).sort();
const recordFamilies = pool.families.map(f => f.id).sort();
if (pageFamilies.join(",") !== recordFamilies.join(",")) {
  fail("different families: page has " + pageFamilies.join(" ") + ", record has " + recordFamilies.join(" "));
} else {
  for (const f of pool.families) {
    const mine = f.words.slice().sort().join("|");
    const theirs = (pagePool[f.id] || []).slice().sort().join("|");
    if (mine !== theirs) {
      fail(f.id + " differs: " + f.words.length + " words in docs/words.json, " +
           (pagePool[f.id] || []).length + " in public/index.html");
    }
  }
}

// 3. so must the bird list
const pageBirds = readPageList("DAILY_BIRDS") || [];
const recordBirds = (pool.rules && pool.rules.birds) || [];
if (pageBirds.slice().sort().join("|") !== recordBirds.slice().sort().join("|")) {
  fail("the bird list differs: " + pageBirds.length + " in the page, " + recordBirds.length + " in the record");
}
for (const b of pageBirds) {
  if (!seen.has(b)) fail("a bird that is in no family — " + b);
}

// 4. the other answers that count
//
// norm and withinOneEdit are read out of the page rather than written again here: the
// question is what the game will accept, so it has to be the game's own judge.
const judge = (function () {
  const from = page.indexOf("const TURKISH_FOLD");
  const to = page.indexOf("function isCorrect");
  if (from < 0 || to < 0) return null;
  try { return new Function(page.slice(from, to) + "; return { norm, withinOneEdit };")(); }
  catch (e) { return null; }
})();

const also = pool.also || {};
const pageAlso = (function () {
  const at = page.indexOf("const ALSO = {");
  if (at < 0) return null;
  const end = page.indexOf("\n};", at);
  const out = {};
  for (const m of page.slice(at, end).matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  }
  return out;
})();

let alsoCount = 0;
if (!judge) fail("could not read the page's own judge (norm/withinOneEdit)");
if (!pageAlso) fail("the page has no ALSO table");
for (const [word, answers] of Object.entries(also)) {
  if (!seen.has(word)) fail("an answer listed for a word that is not in the pool — " + word);
  for (const answer of answers) {
    alsoCount++;
    if (!judge) continue;
    const a = judge.norm(answer);
    if (!a) { fail("an empty answer listed for " + word); continue; }
    if (judge.withinOneEdit(a, judge.norm(word))) {
      fail('"' + answer + '" for ' + word + " is already accepted as a typo");
    }
    for (const other of seen.keys()) {
      if (other === word) continue;
      if (judge.withinOneEdit(a, judge.norm(other))) {
        fail('"' + answer + '" for ' + word + " would also answer for " + other);
      }
    }
  }
}
if (pageAlso) {
  const mine = JSON.stringify(Object.keys(also).sort().map(w => [w, also[w].slice().sort()]));
  const theirs = JSON.stringify(Object.keys(pageAlso).sort().map(w => [w, pageAlso[w].slice().sort()]));
  if (mine !== theirs) fail("the table of other answers differs between docs/words.json and the page");
}

console.log("rejected words on record:  " + banned.size);
console.log("daily pool:                " + seen.size + " words in " + pool.families.length + " families");
console.log("birds:                     " + pageBirds.length + ", capped at " +
            ((pool.rules && pool.rules.birdsPerSet) || "?") + " a day");
console.log("other answers that count:  " + alsoCount + " for " + Object.keys(also).length + " words");

if (bad) {
  console.error("");
  console.error(bad + " problem(s). See docs/BANNED-WORDS.md for what must not come back.");
  process.exit(1);
}
console.log("");
console.log("nothing rejected is in play, no word is in two families, no listed answer");
console.log("belongs to another drawing, and the record and the running copy agree.");
