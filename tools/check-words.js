// node tools/check-words.js
//
// Words the owner has rejected must never come back, a word must never sit in two
// silhouette families, and the three things that exist twice -- the pool, the bird list
// and the pairs that must not meet -- must say the same in both places.
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

// 2. the hand-made sets, read from the file the game runs
const setWords = new Set();
const setsBlock = page.slice(page.indexOf("const SETS"), page.indexOf("const TEXT"));
for (const m of setsBlock.matchAll(/"([^"\\]{2,40})"/g)) {
  const word = m[1];
  if (/^set-\d\d$/.test(word) || /^[a-z]+[A-Z]/.test(word)) continue;   // ids and keys
  setWords.add(word);
}
for (const word of setWords) {
  if (banned.has(word)) fail("rejected word in the hand-made sets — " + word);
}

// 3. the record and the running copy must agree, word for word
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

// 4. so must the bird list and the pairs that may not meet
const pageBirds = readPageList("DAILY_BIRDS") || [];
const recordBirds = (pool.rules && pool.rules.birds) || [];
if (pageBirds.slice().sort().join("|") !== recordBirds.slice().sort().join("|")) {
  fail("the bird list differs: " + pageBirds.length + " in the page, " + recordBirds.length + " in the record");
}
for (const b of pageBirds) {
  if (!seen.has(b)) fail("a bird that is in no family — " + b);
}

const pagePairs = readPageList("DAILY_NEVER_TOGETHER") || [];
const recordPairs = [].concat(...((pool.rules && pool.rules.neverTogether) || []));
if (pagePairs.slice().sort().join("|") !== recordPairs.slice().sort().join("|")) {
  fail("the never-together pairs differ: page " + JSON.stringify(pagePairs) +
       ", record " + JSON.stringify(recordPairs));
}
for (const w of pagePairs) {
  if (!seen.has(w)) fail("a never-together word that is in no family — " + w);
}

console.log("rejected words on record:  " + banned.size);
console.log("daily pool:                " + seen.size + " words in " + pool.families.length + " families");
console.log("hand-made sets:            " + setWords.size + " distinct words");
console.log("birds:                     " + pageBirds.length + ", capped at " +
            ((pool.rules && pool.rules.birdsPerSet) || "?") + " a day");
console.log("never together:            " + (pagePairs.length ? pagePairs.join(" + ") : "none"));

if (bad) {
  console.error("");
  console.error(bad + " problem(s). See docs/BANNED-WORDS.md for what must not come back.");
  process.exit(1);
}
console.log("");
console.log("nothing rejected is in play, no word is in two families, and the record and");
console.log("the running copy agree.");
