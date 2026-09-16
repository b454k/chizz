// node tools/check-words.js
//
// Words the owner has rejected must never come back, and a word must never sit in two
// silhouette families. Both were being kept in my head, which is how a word removed in
// September was proposed again days later. This checks the files instead.
//
// Run it after touching docs/words.json or the sets in public/index.html.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const banned = readBanned(path.join(root, "docs", "BANNED-WORDS.md"));
const pool = JSON.parse(fs.readFileSync(path.join(root, "docs", "words.json"), "utf8"));
const page = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");

// The banned list lives in prose, under headings that say when and why. Every line that
// is not a heading, a fence, a link or a sentence is a comma-separated run of words.
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

let bad = 0;

// 1. the daily pool
const seen = new Map();
for (const family of pool.families) {
  for (const word of family.words) {
    if (banned.has(word)) {
      console.error("FAIL: banned word in the pool — " + word + " (" + family.id + ")");
      bad++;
    }
    if (seen.has(word)) {
      console.error("FAIL: " + word + " is in two families — " + seen.get(word) + " and " + family.id);
      bad++;
    }
    seen.set(word, family.id);
  }
}

// 2. the hand-made sets, read from the file the game actually runs
const setWords = new Set();
const setsBlock = page.slice(page.indexOf("const SETS"), page.indexOf("const TEXT"));
for (const m of setsBlock.matchAll(/"([^"\\]{2,40})"/g)) {
  const word = m[1];
  if (/^set-\d\d$/.test(word) || /^[a-z]+[A-Z]/.test(word)) continue;   // ids and keys
  setWords.add(word);
}
for (const word of setWords) {
  if (banned.has(word)) {
    console.error("FAIL: banned word in the hand-made sets — " + word);
    bad++;
  }
}

console.log("banned words on record: " + banned.size);
console.log("daily pool:             " + seen.size + " words in " + pool.families.length + " families");
console.log("hand-made sets:         " + setWords.size + " distinct words");

if (bad) {
  console.error("");
  console.error(bad + " problem(s). A rejected word must not come back: see docs/BANNED-WORDS.md.");
  process.exit(1);
}
console.log("");
console.log("no banned word is in play, and no word is in two families.");
