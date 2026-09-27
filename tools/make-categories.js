// node tools/make-categories.js
//
// Writes docs/CATEGORIES.md from docs/categories.json. The categories are hand-kept, like
// the pool itself; this only turns them into something readable, so the two cannot drift
// into different orders or counts.
//
// Run tools/check-categories.js afterwards, or instead: it fails if a word is in the pool
// and not in a category, is in two categories, or is in a category and not in the pool.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "docs", "categories.json"), "utf8"));
const collator = new Intl.Collator("tr");

function wrap(words, nl) {
  const out = [];
  let line = "";
  for (const w of words) {
    const piece = (line ? ", " : "") + w;
    if (line.length + piece.length > 88) { out.push(line + ","); line = w; }
    else line += piece;
  }
  if (line) out.push(line);
  return out.join(nl);
}

function render(nl) {
  const total = data.categories.reduce((n, c) => n + c.words.length, 0);
  const lines = [
    "# Words by subject",
    "",
    "The same " + total + " words as [`words.json`](words.json), sorted by what they are rather",
    "than by the shape they draw as. The game deals by silhouette family -- see",
    "[`WORDS.md`](WORDS.md) -- so this file is for reading, and for the day a player gets to",
    "pick a subject to draw from.",
    "",
    "Every word sits in **exactly one** category. `tools/check-categories.js` fails if a word",
    "is in the pool and not here, is here twice, or is here and not in the pool.",
    "",
    "| category | in Turkish | words |",
    "|---|---|---:|"
  ];
  for (const c of data.categories) lines.push("| " + c.en + " | `" + c.tr + "` | " + c.words.length + " |");
  lines.push("");
  for (const c of data.categories) {
    lines.push("## " + c.en, "", "`" + c.tr + "` · " + c.words.length + " words", "");
    lines.push(c.words.length
      ? wrap(c.words.slice().sort(collator.compare), nl)
      : ["None, and there will be none. A round is twenty things to draw and then match back",
         "to their words, and an action drew as the same stick figure whichever action it was.",
         "The 67 verbs offered on 2026-09-26 and the 17 on 2026-09-27 were all left out."].join(nl));
    lines.push("");
  }
  return lines.join(nl);
}

module.exports = { render };

if (require.main === module) {
  const target = path.join(root, "docs", "CATEGORIES.md");
  const nl = fs.readFileSync(path.join(root, "docs", "words.json"), "utf8").includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(target, render(nl));
  console.log("docs/CATEGORIES.md written: " +
    data.categories.reduce((n, c) => n + c.words.length, 0) + " words in " + data.categories.length + " categories");
}
