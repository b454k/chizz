# Chizz — Current Behaviour Spec

This document describes what the code in `public/index.html` and `functions/`
**actually does today**. It is written from the code, not from the earlier design
documents. Where the implementation diverges from `chizz-v15-spec.md`, the
difference is noted in [Divergences](#divergences-from-chizz-v15-specmd).

The interface is in Turkish. Every player-facing string lives in a single `TEXT`
table near the top of `public/index.html`; the rest of the codebase — identifiers,
comments, file names, documentation — is English.

---

## 1. What the game is

A single-player-per-round drawing and memory game that runs entirely in the browser.

A player is shown 20 words in quick succession — a few seconds each — and makes a
rough drawing for every one. The drawings are then shown back in a shuffled grid and
the player has to say which drawing was which word. The words within a round are
chosen to share silhouettes, so the drawings look confusingly alike.

A round can also be sent to a friend, who guesses the same drawings and appears on a
score board for that round.

## 2. Files

```
public/index.html               the entire game: HTML + CSS + vanilla JS, no dependencies
functions/api/save.js           POST /api/save             save a round, return a code
functions/api/game/[code].js    GET  /api/game/:code       fetch a saved round
functions/api/scores/[code].js  GET+POST /api/scores/:code score board for a round
wrangler.jsonc                  Cloudflare Pages config and the KV binding
```

`public/index.html` has no external scripts, stylesheets, fonts or network
dependencies, and uses no `localStorage` or `sessionStorage`. Opened directly from
disk it plays solo; the API is only needed for the duel and score features.

## 3. Screens

Screens are `<section class="screen">` elements; exactly one carries `.on` at a time.

| id | Purpose |
|---|---|
| `home` | Title, four difficulty buttons, a start button, and a 4-character code field with a join button |
| `askName` | Asks the player's name (max 5 characters). Shown before every round |
| `countdown` | Full-screen 3 → 2 → 1, one second each |
| `draw` | The drawing phase |
| `between` | After 20 drawings: send to a friend, or guess them yourself |
| `send` | Duel submission: sending / code + link / errors |
| `loading` | Fetching a round opened from a code or link |
| `scores` | Live score board for a round you drew and shared |
| `recall` | The shuffled grid of 20 drawings, where answers are given |
| `result` | Score, correct/incorrect grid, score board, share button |

Two overlays sit outside the screen system: `#sheet` (the word pool) and `#modal`
(the typed-answer card). A third, `#confirm`, asks before abandoning a round.

## 4. Flow

### Solo

1. `home` — pick a difficulty, press start
2. `askName` — enter a name; it is remembered for later rounds in the same session
3. `countdown` — 3, 2, 1
4. `draw` — 20 words, one at a time, auto-advancing
5. `between` — choose to guess yourself or send to a friend
6. `recall` — assign a word to each drawing
7. `result` — score, per-cell correction, share text

### Duel, drawer's side

At `between`, the send option posts the round to `/api/save`, which returns a
4-character code. The screen shows the code, a shareable link, a copy button, and a
watch-scores button that opens the live score board for that code.

### Duel, guesser's side

Opening `?o=<code>`, or entering a code on `home`, fetches the round, then asks for a
name, then goes straight to `recall`. There is no drawing phase. The result screen
reads "in <drawer>'s drawings, 12/20" and the guesser's score is posted to that
round's board. A draw-your-own button starts a fresh round.

### Leaving a round

Both `draw` and `recall` have a `←` button. It opens a confirmation whose default
action is to stay. **While the confirmation is
open the word timer is paused** and resumes from where it stopped, so the dialog never
costs the player time.

## 5. Difficulty

Four levels. The two variables — time pressure and answer method — are deliberately
separated, so `medium` and `hard` share a duration and differ only in how you answer.

| id | Label | Per word | Answer method |
|---|---|---|---|
| `easy` | Easy | 4000 ms | Word pool |
| `medium` | Medium | 2500 ms | Word pool |
| `hard` | Hard | 2500 ms | Typed |
| `impossible` | Impossible | 1500 ms | Typed |

Default is `medium`. The chosen level is shown on the drawing, recall and result
screens, and in the share text.

## 6. Drawing phase

- The word is large at the top, a draining progress bar beneath it, `7 / 20` at the right.
- The canvas is square and sized to the largest square fitting the available area.
- One pen. No undo, no eraser, no colours.
- Time runs out → the next word appears automatically. No button, no confirmation.
- The canvas clears between words; the finished strokes are stored.
- An empty drawing is valid and does not break anything downstream.

Input uses pointer events with `touch-action: none`, so drawing works with a finger
without scrolling the page. `getCoalescedEvents()` is used for smoothness, with a
fallback to the event itself when it returns nothing.

Strokes are stored as arrays of points with coordinates **normalised to 0–1**, never
as images, so they rescale cleanly into the small grid cells.

If the page is hidden mid-round, the elapsed time is credited back on return rather
than burning the current word.

## 7. Word sets

30 sets, ids `set-01` … `set-30`. Each set holds exactly 20 words as two families of
10. Families are grouped by **silhouette**, not by category — an elephant and a sofa
share a shape, which is the joke. Family labels exist only as source comments and are
never shown.

Verified against the current data:

| Property | Value |
|---|---|
| Sets | 30 |
| Words per set | 20 (10 + 10) |
| Total slots | 600 |
| Unique words | 459 |
| Words used twice | 141 |
| Words used once | 318 |
| Words used more than twice | none |
| Repeats within a single set | none |

At the start of a round a set is chosen **at random** and the 20 words are shuffled
together. The set is never named anywhere in the interface, and the same set is never
drawn twice in a row (`lastSetId`).

## 8. Recall phase

The 20 drawings appear in a grid — 4 columns on narrow screens, 5 on wide — in an
order shuffled independently of the drawing order, with **no cell numbers**, so
position gives nothing away. The result screen reuses the same order.

**Pool mode** (`easy`, `medium`): tapping a drawing opens a bottom sheet listing the
remaining words, sorted with Turkish collation. Choosing a word assigns it and removes
it from the pool; each word is used at most once. Tapping an assigned drawing releases
the word back. Finishing unlocks only when all 20 are assigned.

**Typed mode** (`hard`, `impossible`): tapping a drawing opens a card near the top of the
screen — deliberately not a bottom sheet, so the phone keyboard cannot cover it —
showing a preview of the drawing, a text field, a save button and a skip button.
Answers can be edited by tapping again. Passing is allowed, so finishing is always
enabled.

Cells are repainted through a `ResizeObserver`, so drawings still render correctly if
the grid is built before the page has been laid out.

## 9. Answer matching

Both the answer and the correct word are normalised before comparison:

1. Lowercased with Turkish rules — `toLocaleLowerCase("tr")`, so dotted and dotless
   `i` behave correctly
2. The combining dot left over by that lowercasing is stripped
3. Turkish letters are folded to their ASCII equivalents, including circumflex vowels
4. Punctuation replaced with spaces, runs of whitespace collapsed, ends trimmed

A **single-character typo is forgiven** — Levenshtein distance ≤ 1 counts as correct,
so `kanepa` matches `kanepe`. Without that tolerance the typed modes are unpleasant.
Synonyms are not accepted. An empty answer is always wrong.

The same matcher runs in pool mode, where it is simply an exact match.

## 10. Scoring and result

Score is the number of positions where the answer matches the word behind that
drawing. The heading reads `20'de 12` for your own round, or
"in <drawer>'s drawings, 12/20" when guessing someone else's.

Every cell is framed green or red. Wrong cells show the guess struck through with the
correct word in green beneath it; a skipped answer shows `—`.

## 11. Share text

The share button copies to the clipboard, falling back to a selectable text box when the
clipboard API is unavailable — which is the case over plain HTTP, so the fallback is
not theoretical.

```
Chizz 🎨
Zorluk: Zor
12/20

🟩🟩🟥🟩🟥
🟩🟩🟩🟥🟩
🟥🟩🟩🟩🟩
🟩🟥🟩🟩🟥
```

Guessing someone else's round, the first line also names the drawer.
The grid is 4 rows of 5 in the recall order. **The set is deliberately not named**, so
sharing a result cannot leak which words were in play.

## 12. Duel and storage

### Codes

4 characters from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` — no `0/O`, no `1/I/L`, so a code
can be read aloud over the phone. That is ~1M combinations. The server retries up to 5
times if a generated code is already taken. Codes are stored uppercase and accepted in
either case.

### Payload shrinking

Before sending, coordinates are rounded to integers in 0–255 and consecutive points
closer than 2 units are dropped. On a densely drawn stroke this is roughly an 11×
reduction. Stroke endpoints are always kept, and single-point taps survive the round
trip. A typical 20-drawing round is 30–40 KB against a 200 KB limit.

### Endpoints

`POST /api/save` — body `{setId, difficulty, name, words, drawings}`, returns
`{code}`. Validates set id, difficulty, exactly 20 words, exactly 20 drawings and every
coordinate as an integer in range; rejects bodies over 200 KB with `413`. Non-`POST`
methods return `405` — without an explicit handler Pages would fall through and serve
the whole HTML page in reply to an API call.

`GET /api/game/:code` — returns the stored round, `404` for an unknown or expired code.

`GET/POST /api/scores/:code` — the score board, ordered by finishing time. Each player
writes to their own key (`<CODE>:s:<name>`) so two people finishing at once cannot
overwrite each other, and a summary is written to `<CODE>:board` for readers. This
keeps reads to a single `get`: the board is polled live, and calling `list` on every
read would exhaust the free tier's 1,000 daily list operations. Names are normalised
the same way answers are, so case and accent variants are one player. A score can only be
written against a code that exists. Re-playing keeps your original finishing position.

Everything is written with a **30-day TTL** and expires by itself. Stored data is the
set id, difficulty, an optional name, the 20 words and the 20 drawings. No email, no
IP, no account.

### Score board

On the result screen of a shared round, and on the drawer's `scores` screen, the board
polls every 6 seconds while the screen is visible, pausing when the tab is hidden and
refreshing immediately on return. Your own row is inserted locally so it appears
before KV's listing catches up.

## 13. Failure behaviour

| Situation | Behaviour |
|---|---|
| Unknown or expired code | An expired-code message plus a way back to the menu |
| Save fails | A retry message — **the drawings stay in memory** and can be resent |
| No internet | Solo play continues; only the duel is unavailable |
| Code typed in wrong format | Rejected before any request, including the ambiguous `0OIL` characters |
| Clipboard unavailable | Share text shown in a selectable box instead |

## 14. Hosting

Cloudflare Pages, static assets from `public/`, Functions from `functions/`, one KV
namespace bound as `OYUNLAR`.

The canonical address is **https://chizz.party**. The project also answers on
`chizz.pages.dev`, but that domain is filtered on some networks and operators, which
in practice means the site silently fails to load for a subset of players. Because of
this, duel links generated while playing on `*.pages.dev`, on `localhost`, or from a
`file://` copy are all rewritten to the canonical address via `PUBLIC_BASE_URL`, so
a shared link can never point somewhere the recipient cannot reach.

---

## Divergences from `chizz-v15-spec.md`

The v1.5 document is a design brief. These are the places the shipped code differs.

| Area | v1.5 spec | Current code |
|---|---|---|
| Name | The original Turkish title | **Chizz** |
| Word sets | 10 sets, 200 slots, 161 unique | **30 sets, 600 slots, 459 unique** (same rules: 10+10 families, no word more than twice, no repeat inside a set) |
| Difficulty names | Four Turkish labels, with the third one a variant of the second | Relabelled; ids are now `easy` / `medium` / `hard` / `impossible`. Same durations and answer methods |
| Set label | Neutral `Set 7` shown on the result screen and in the share text so friends could compare | **Removed entirely.** The set is named nowhere. The share text carries only the difficulty |
| Typed answers | Text box opens at the bottom | **Card near the top of the screen** with a preview of the drawing, so the phone keyboard cannot cover it |
| Player name | Optional nickname, one field, may be left blank | **Required, asked before every round**, max 5 characters, reused for the score board |
| Language | Turkish strings inline throughout | Interface strings live in one `TEXT` table; identifiers, comments and docs are English |
| Score board | Listed under "not in this version" | **Implemented** — per-code board, ordered by finishing time, polled live |
| Leaving a round | Not mentioned | `←` with a confirmation, and the timer pauses while it is open |
| Canonical URL | A `pages.dev` address | `https://chizz.party/?o=A7K2`, with non-canonical origins rewritten |

Everything else in the v1.5 spec — the shuffled grid with no cell numbers, random set
selection with no repeat, the four-level structure, the normalisation and one-character
typo tolerance, the code alphabet, the 30-day TTL, the 0–255 coordinate shrinking, the
error behaviours — is implemented as written.

The original brief (`chizz-original-spec.md`) additionally required the whole game to be a
single `index.html` with no dependencies and no server. The first two still hold. The
third was given up deliberately in v1.5 to make the duel possible; solo play still
needs nothing but the file.
