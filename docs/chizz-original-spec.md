# Drawing Memory Game — v1 Build Spec

> **Historical document.** This is the original build brief for what became Chizz,
> translated from Turkish. It describes the v1 design, not the current code — see
> [SPEC.md](SPEC.md) for what the game actually does now. Nothing here has been
> updated or corrected; where it disagrees with the code, the code is right.
> Word lists are reproduced verbatim, since they are the game's Turkish content.

> This file is the build brief to hand to Claude Code. The decisions are made; if
> there is nothing to ask, just build it.

## 1. What we are building

A single-player, browser-based, serverless drawing and memory game.

The player is shown 20 words that resemble one another, very fast (about 2.5 seconds
each), and makes a quick drawing for each. Then the 20 drawings are shown back and
they are asked to remember which was which. The drawings are crude and the words
resemble each other — that is where the comedy and the difficulty come from.

**Output:** a single `index.html` file. No framework, no build step, no dependencies.

## 2. Game flow

1. The player picks a word set and a difficulty (a duration)
2. A 3-2-1 countdown
3. **Drawing phase:** the 20 words appear in order; when time runs out it advances to
   the next one automatically
4. Interstitial screen
5. **Recognition phase:** the 20 drawings are shown in a grid and the player assigns a
   word to each one
6. **Result:** score, a correct/incorrect grid, shareable text

## 3. Hard technical constraints

- A single HTML file: HTML + CSS + vanilla JS all in one place
- No server, no account, no database, no persistent storage
- No external dependencies (including CDNs)
- **Store drawings as arrays of strokes, not as PNGs:** `[[{x,y},{x,y},…], …]`
- **Normalise coordinates to the 0–1 range.** They will be redrawn in a small grid and
  must scale properly at any screen size
- Use `pointerdown / pointermove / pointerup` for touch — `mouse*` events do not work
  on a phone
- Give the canvas `touch-action: none`, or the page scrolls while drawing
- Design mobile-first; it must be testable in iPhone Safari
- Do not use `localStorage`

## 4. Word sets

### Design logic (do not change)

Words are grouped by **silhouette**, not by category. Each set holds 20 words: 10 from
one silhouette family, 10 from another.

Rules for choosing words:

1. Everyone must have a clear picture of it — no obscure species names (no marten, no
   bluefin tuna). Elephant, sofa, apple.
2. Drawable in 2 seconds with 3–5 strokes
3. Mix the categories — a set of nothing but animals is boring. An elephant and a sofa
   share a silhouette, and that is the funny part
4. The two families are easy to tell apart (round vs angular). The difficulty lives
   **within** a family. That way the player feels they have "at least ruled out half"
   rather than being hopeless
5. It has to work for bad drawers too — there is no detail anyway, only a rough
   silhouette

### Data (put it in the code exactly like this)

```js
const SETS = [
  {
    id: "yatik-dikey",
    name: "Yatık & Dikey",              // Horizontal & Vertical
    familyA: ["fil", "kanepe", "inek", "masa", "otobüs", "tren", "timsah", "köprü", "araba", "ayı"],
    familyB: ["ağaç", "insan", "lamba", "şişe", "kule", "şemsiye", "mum", "zürafa", "kaktüs", "süpürge"]
  },
  {
    id: "yuvarlak-koseli",
    name: "Yuvarlak & Köşeli",          // Round & Angular
    familyA: ["top", "elma", "güneş", "saat", "tekerlek", "balon", "portakal", "tabak", "ay", "yüzük"],
    familyB: ["kutu", "ev", "televizyon", "kitap", "pencere", "buzdolabı", "valiz", "telefon", "kapı", "çanta"]
  },
  {
    id: "ucgen-uzun",
    name: "Üçgen & Uzun",               // Triangular & Long
    familyA: ["dağ", "çadır", "çam", "pizza", "dondurma", "şapka", "roket", "yelkenli", "çatı", "huni"],
    familyB: ["kalem", "kaşık", "anahtar", "çekiç", "diş fırçası", "balık", "kılıç", "tarak", "cetvel", "sosis"]
  },
  {
    id: "kivrimli-duz",
    name: "Kıvrımlı & Düz",             // Curved & Straight
    familyA: ["bulut", "kalp", "yılan", "ahtapot", "çiçek", "el", "damla", "dalga", "kedi", "kurdele"],
    familyB: ["merdiven", "çit", "bayrak", "tuğla", "tabela", "raf", "çerçeve", "klavye", "ütü", "gözlük"]
  }
];
```

When a round starts, `familyA` and `familyB` are combined and **shuffled**. The player
does not know there are two families; they only feel it.

### Difficulty levels

| Level | Per word | Total |
|---|---|---|
| Easy | 4 s | 80 s |
| Normal | 2.5 s | 50 s |
| Hard | 1.5 s | 30 s |

Default: Normal.

## 5. Screens

### 5.1 Home screen

- The game's name and a one-sentence description
- 4 set cards (name + a short label), one selected
- 3 difficulty buttons, Normal selected
- A start button

### 5.2 Countdown

- Full screen 3 → 2 → 1, one second each
- Then straight to the drawing screen

### 5.3 Drawing screen

- **Top:** the word, large and legible
- **Below the word:** a progress bar showing the remaining time (draining, not filling)
- **Top right:** `7 / 20`
- **Middle:** a square canvas taking up most of the screen
- When time runs out it moves to the next word **automatically**. No button, no
  waiting, no "are you ready"
- **No eraser, no undo, no colour.** One pen. The speed is the game
- The canvas clears when moving to a new word; the previous strokes are saved to the
  array
- An empty drawing is valid (they may not have drawn anything) — it must not crash

### 5.4 Interstitial screen

- "20 drawings done. Now, which was which?"
- A continue button

### 5.5 Recognition screen

- A small grid of the 20 drawings (4x5 on mobile, 5x4 on a wide screen)
- Each cell redraws the drawing from its strokes, with a cell number
- Tap a drawing → a pool of 20 words opens at the bottom
- Tap a word → it is assigned to that drawing and **removed from the pool** (each word
  is used once)
- Tapping an assigned drawing undoes the assignment and returns the word to the pool
- When all 20 are filled, the finish button becomes active

### 5.6 Result screen

- A large score: `12 out of 20`
- The grid again: correct ones framed green, incorrect ones red
- Under the incorrect ones: the player's guess (struck through) and the right answer
- A **share** button → copies this text to the clipboard:

```
Çizgi 🎨 Yuvarlak & Köşeli · Normal
12/20

🟩🟩🟥🟩🟥
🟩🟩🟩🟥🟩
🟥🟩🟩🟩🟩
🟩🟥🟩🟩🟥
```

- A "play again" button (same settings) and a "different set" button

## 6. Visual direction

- Plain, high contrast. White ground, black line
- A single accent colour (beyond green for correct and red for incorrect)
- Large touch targets — it will be played fast on a phone
- Minimal animation; only the time bar and the screen transitions
- Use the system font, do not load one from outside

## 7. Acceptance criteria

All of these must hold before it counts as finished:

- [ ] Drawable with a finger in iPhone Safari, and the page does not scroll
- [ ] Advances automatically when time runs out, never gets stuck anywhere
- [ ] The small drawings on the recognition screen scale without distortion
- [ ] Each word can be assigned only once, and can be undone
- [ ] The score is calculated correctly
- [ ] The share button copies the text to the clipboard
- [ ] A full game can be played start to finish without errors
- [ ] One file, no external dependencies, works on double-clicking `index.html`

## 8. Not in v1

- Accounts, sign-in, registration
- Real-time multiplayer
- A score table (needs a server)
- Saving drawings, or a gallery
- Sound
- Ads or payments

## 9. Next step (after v1)

Test the timing with friends: see which of 4 / 2.5 / 1.5 seconds gets the most
laughter, and change the default to match.

For an English edition, do not **translate** the sets — rebuild them in that language
on the same silhouette logic. The silhouette logic is universal; the words are not.
