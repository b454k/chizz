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
functions/api/card/[code].js    GET  /api/card/:code.png   the round as one PNG, for link previews
functions/_middleware.js        adds the preview tags to a shared page
wrangler.jsonc                  Cloudflare Pages config and the KV binding
```

`public/index.html` has no external scripts, stylesheets, fonts or network
dependencies. Opened directly from disk it plays solo; the API is only needed for
the duel and score features. It does use `localStorage` — see
[Section 14](#14-what-is-kept-on-the-device).

## 3. Screens

Screens are `<section class="screen">` elements; exactly one carries `.on` at a time.

| id | Purpose |
|---|---|
| `home` | Title, two mode buttons, a settings panel, a start button, and a 4-character code field with a join button |
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

1. `home` — pick a mode, adjust the settings if you want, press start
2. `countdown` — 3, 2, 1
3. `draw` — 20 words, one at a time, auto-advancing
4. `between` — choose to guess yourself or send to a friend
5. `recall` — assign a word to each drawing
6. `result` — score, per-cell correction, share text

Nothing is asked before the round starts. A name is only needed to hand the round
to someone else or to take a place on a score board, so it is asked at exactly
those two points and nowhere else.

### Duel, drawer's side

At `between`, the send option posts the round to `/api/save`, which returns a
4-character code. The screen shows the code, a shareable link, a copy button, and a
watch-scores button that opens the live score board for that code.

### Duel, guesser's side

Opening `?o=<code>`, or entering a code on `home`, fetches the round and goes
straight to `recall`. There is no drawing phase and no name prompt. The round's own
mode and seconds are used, not the ones set on this device. The result screen reads
"in <drawer>'s drawings, 12/20". If the device has no name yet the board shows a
name field instead of a row; filling it in posts the score. A draw-your-own button
starts a fresh round.

The drawer's side also gains an invite button on `result`, so guessing your own
drawings first is no longer a dead end.

### Leaving a round

Both `draw` and `recall` have a `←` button. It opens a confirmation whose default
action is to stay. **While the confirmation is
open the word timer is paused** and resumes from where it stopped, so the dialog never
costs the player time.

## 5. Modes and settings

Two variables, set independently rather than bundled into fixed levels.

**Mode** — how an answer is given:

| id | Label | Answer method |
|---|---|---|
| `pool` | Kelimeler açık | Choose from the remaining words, which stay on screen |
| `typed` | Kelimeler gizli | No list; recall and type the word |

**Seconds per word** — a slider from **1 to 10 seconds in half-second steps**,
defaulting to 3, which is also the recommended speed named under the slider.

There is deliberately no difficulty grade. One existed briefly, read back from these
two settings, but it was a label placed on top of choices the player had already made
and it contradicted the recommended speed by calling it the hardest.

**Theme** — dark (default) or light. Applied as `data-theme` on the root element;
the dark palette is the base and the light one restates only the colours that differ.

Mode, seconds and theme are all kept on the device. The mode and duration are shown
together on the drawing, recall and result screens, and in the share text
(`Kelimeler açık · 3 sn`).

This replaced four fixed difficulties (`easy`, `medium`, `hard`, `impossible`), which
conflated the two variables: `medium` and `hard` differed only in answer method while
sharing a duration nobody could change. Rounds saved under the old scheme are mapped
on read — `easy`→pool/4s, `medium`→pool/2.5s, `hard`→typed/2.5s,
`impossible`→typed/1.5s — in both the client and `GET /api/game/:code`, and
`POST /api/save` still accepts the old field from a stale tab.

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

**Pool mode**: tapping a drawing opens a bottom sheet showing that drawing enlarged —
a grid cell is around 76 px wide, far too small to recognise a scribble by — above
the remaining words, sorted with Turkish collation. Choosing a word assigns it and
removes it from the pool; each word is used at most once. Tapping an assigned drawing
releases the word back.

The sheet is `position: fixed`, so the grid is given bottom padding to keep its last
rows reachable above it. That padding is scrollable space existing only while the
sheet is open, so closing it shrinks the scroll range and the browser clamps
`scrollTop` — which slid the whole grid under the player and read as the drawings
having swapped places, by an amount that varied with screen size. The scroll offset
from before the sheet opened is therefore restored on close; it was reached with the
padding collapsed, so it is always reachable again.

**Typed mode**: tapping a drawing opens a card near the top of the
screen — deliberately not a bottom sheet, so the phone keyboard cannot cover it —
showing a large preview of the drawing, a text field, a save button and a skip button.
Answers can be edited by tapping again. Passing is allowed.

Finishing is always enabled in both modes; anything left blank counts as wrong.

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
correct word in green beneath it; a skipped answer shows `—`. Tapping any cell opens
it full size in the middle of the screen with the same caption.

The round is also timed: the clock runs from the recall grid first appearing to the
finish button, survives a reload, and is shown beside the score and used to break
ties on the board.

## 11. Share text

The share button copies to the clipboard, falling back to a selectable text box when the
clipboard API is unavailable — which is the case over plain HTTP, so the fallback is
not theoretical.

```
Chizz 🎨
Kelimeler gizli · 3 sn
12/20 · 47 sn

🟩🟩🟥🟩
🟩🟩🟩🟥
🟥🟩🟩🟩
🟩🟥🟩🟩
🟩🟩🟥🟩

Sen de tahmin et:
https://chizz.party/?o=A7K2
```

Guessing someone else's round, the first line also names the drawer.
The grid is **5 rows of 4** in the recall order, matching the 4-column phone layout —
it used to be 4 rows of 5, which was not the shape the player had been looking at.
The invite line is only added once the round has a code. **The set is deliberately not
named**, so sharing a result cannot leak which words were in play.

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

`POST /api/save` — body `{setId, mode, seconds, name, words, drawings}`, returns
`{code}`. Validates set id, mode, seconds in 1–10, exactly 20 words, exactly 20
drawings and every coordinate as an integer in range; rejects bodies over 200 KB with
`413`. A legacy `difficulty` is accepted in place of `mode`/`seconds`. Non-`POST`
methods return `405` — without an explicit handler Pages would fall through and serve
the whole HTML page in reply to an API call.

`GET /api/game/:code` — returns the stored round, `404` for an unknown or expired code.

`GET/POST /api/scores/:code` — body `{name, score, ms}`. **The board is ranked best
score first, ties broken by the faster time**, then by who finished first; rows
written before times were recorded have no `ms` and fall in behind timed ones on a
tie. Each player writes to their own key (`<CODE>:s:<name>`) so two people finishing
at once cannot overwrite each other, and a summary is written to `<CODE>:board` for
readers. This keeps reads to a single `get`: the board is polled live, and calling
`list` on every read would exhaust the free tier's 1,000 daily list operations. Names
are normalised the same way answers are, so case and accent variants are one player,
and are capped at 10 characters. A score can only be written against a code that
exists. Re-playing keeps your original finishing position and your original time.

Everything is written with a **30-day TTL** and expires by itself. Stored data is the
set id, mode, seconds, an optional name, the 20 words and the 20 drawings. No email,
no IP, no account.

### Score board

On the result screen of a shared round, and on the drawer's `scores` screen, the board
polls every 2 seconds while the screen is visible, pausing when the tab is hidden and
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

## 14. What is kept on the device

The original brief banned `localStorage`, when a round was a single throwaway sitting.
Shared rounds made that untenable: a link gets opened twice, a phone reloads the tab,
and the player expects to find their game where they left it. One key, `chizz.v1`,
holds:

| Field | Purpose |
|---|---|
| `name` | The name typed on this device. Editable on the result screen at any time; changing it renames the rounds this device saved |
| `mode`, `secs`, `theme` | The settings chosen on the home screen |
| `rounds[CODE]` | Per round: the grid order, the answers so far, whether it was finished, the score, the time, whether the score reached the board, whether this device drew it, the name the score went up under, and two tokens -- one that lets the round be renamed, one that lets its board row be moved |
| `days[N]` | Per daily puzzle, today and yesterday only: whether it was drawn, its words and drawings, the code it was saved under, whether it was finished and with what score and time, and the code and name of a friend's daily round opened that day, so the duel between the two can be resumed |

Nothing here is not already on screen during the round. Entries older than the
server's 30-day TTL are dropped, and only the newest 40 rounds are kept.

What this buys:

- **A reload stays in the round.** Re-entering a code restores the grid order and the
  answers. The order has to be restored *with* the answers — it is reshuffled on every
  visit, so old picks against a fresh order would pin every answer to the wrong drawing.
- **A finished round reopens on its score table**, with the original time, instead of
  offering to play it again.
- **The drawer comes back to their share screen** with the same code and link; a reload
  used to lose the link entirely. The round's code is written into the address bar with
  `replaceState`, so a reload has something to return to while the back button still
  leaves.
- **A daily duel survives a reload at every step.** Whose round you are dueling is read
  from `days[N]`, never from memory, and switching between your round and theirs always
  rewrites the address bar. A reload on the choice screen returns to it; a reload in
  either grid returns to that grid with its answers; a reload on either result still
  offers the other round until both are finished.

Every access is wrapped in `try`/`catch`: Safari in private mode throws on
`localStorage` rather than quietly doing nothing. A round that cannot be stored is
still playable; it just will not survive a reload.

## 15. Sharing a round while it is played

A round is saved the moment its own guessing begins, not only when the share screen is
opened. People want to play the same round side by side, so the code has to exist
before anyone asks for it.

- The round code sits in the corner of the header on the recall and score screens,
  for whoever is in the round — the person who drew it and anyone guessing it. Tapping
  it copies the invite; if the clipboard refuses, it opens the screen that shows the
  link in full rather than telling the reader to select a link that is not on screen.
- The invite wording and link come from one place, so the share text and the chip
  always agree.
- The share text names whose drawings these are: the other player's when guessing,
  **your own otherwise**. Guessing your own round used to fall through to the bare
  title, so sharing it said nothing about who drew it and carried no link.
- A round saved before a name existed gets one attached later, through
  `POST /api/game/:code`. A blank can be filled by whoever is playing the round;
  changing a name that is already there needs the owner token `POST /api/save` handed
  back when the round was created, which the read endpoint never discloses. That is
  what lets you rename yourself and have rounds you already saved follow.
- Nothing is saved for a round with no strokes in it at all.

This trades KV writes for the feature: every round taken into guessing now writes,
where previously only an explicit share did. The free tier allows 1,000 writes a day.

## 16. Where the name is asked

On the result screen, under the grid: the score about to go on the board and the link
about to be shared both carry it, so that is where it belongs. Nothing is asked on the
way into a round. The field is always there, prefilled, and clearing it is allowed; the
button reads Katıl when there is no name yet and Kaydet when there is.

It sits outside the score board, so a round with no board of its own can still be
named -- the name still decides what a shared link says.

Changing it does three things: stores the new name, renames the round this device
saved, and re-posts the score. **The board row moves rather than multiplying**: the
score endpoint accepts the previous name along with a token it handed the writer when
the row was created, and only that token can move a row. Without it a caller can add
their own row but never remove anyone else's, so a stranger reading the board cannot
delete a score by claiming to have been that player. The row keeps the finishing
position it earned.

A field on the start screen was tried first and moved here; it asked for a name in the
one place it was not needed.

## 17. Link previews

Pasting a round into a chat shows its drawings. Two pieces:

`GET /api/card/:code.png` draws the 20 drawings as one **1600x2000** PNG, 4 across and
5 down, boxes flush with a hairline between them. It is rendered from the strokes
already in KV, so it costs no extra storage and works for rounds shared before it
existed.

It is drawn at twice the obvious size on purpose. A chat app shows the preview around
350 css px wide, which on a 3x phone is over a thousand device pixels, so the first
version at 800px was being enlarged to fit and looked soft.

**The words are deliberately not written on it.** A preview that labelled each drawing
would hand the recipient every answer before they opened the game.

There is no image library. A PNG is a few chunks around a deflate stream, and the
deflate is about sixty lines: fixed Huffman codes, and the only matches it looks for
are runs of one repeated byte. That is nearly all of the win on a sheet that is mostly
blank paper, and it turns 402 KB of pixels into 57 KB -- smaller than the 800px sheet
was when stored uncompressed. It was checked against node's own inflate, random input
included, before going near the endpoint.

Two things keep it inside the CPU budget, and both mattered. Bits go into the packed
PNG rows a horizontal run at a time rather than a pixel at a time, and the pen is
stamped every PEN pixels along a stroke rather than every pixel, which still overlaps
by half a nib so the line stays solid. Written the obvious way the render took 34ms,
well past the 10ms a request gets; this way it is about 6, against roughly 4 for the
old sheet at a quarter of the pixels.

Cached hard, since a round's drawings never change.

`functions/_middleware.js` puts the og: tags on the page itself. The page is one static
file shared by every round, so the tags have to be added per request: the picture, the
name of whoever drew it, and the canonical link. It hangs them off the `<title>` tag,
there being no explicit `<head>` in the document. Anything that is not the page with a
valid code -- `/api` included -- passes straight through untouched.

One cost: middleware runs for every request to the site, so every page load is now a
function invocation rather than a plain static hit. The free tier allows 100,000 a day.

## 18. Dismissing the word pool and the answer card

Both close by dragging them down past 60px or tapping away from them, as well as by
the cross in the corner — which is a stretch to reach one-handed on a phone. The pool
gets a scrim so the dismissing tap cannot also land on whatever grid cell is
underneath, and a grab handle so the drag is discoverable. A drag that starts inside
the word list, or on a field or button in the card, is left alone: those scroll and
type.

## 19. Sound and zoom

**Sound.** Three tones, synthesised with the Web Audio API rather than loaded, so the
page still pulls nothing from outside: a beep on each of 3-2-1, a higher one as drawing
starts, and a three-note rise when the score board appears.

The four countdown tones are scheduled **in one go, on the audio clock**, against the
same absolute grid the numbers use, and the numbers time each wait back to the start
rather than to the previous callback. Firing each tone from its own `setTimeout` at
`currentTime + 0` drifted twice over: the timeout chain restarted from whenever the
callback actually ran so lateness piled up, and a tone asked for at +0 lands on the
next render quantum rather than now. Measured after the change, the gaps between tones
are exact to the millisecond and each beep sits within 8ms of its number. Browsers refuse to start
audio without a user gesture, so the context is created and resumed when start is
pressed, and on the first tap anywhere as a fallback for rounds reached through a link.
Every call is wrapped and guarded on the context actually running; no audio never stops
the game.

**Zoom.** The page must not zoom at all: a stray double-tap while drawing zoomed in, and
`user-scalable=no` then prevented pinching back out, leaving the player stuck. Four
things together:

- `touch-action: manipulation` on `html` and `body`
- Safari's `gesturestart` / `gesturechange` / `gestureend` are all cancelled
- a second finger anywhere but the drawing pad is treated as a pinch and cancelled
- the second tap of a genuine double-tap is swallowed on `touchend`

That last one matches on **time and position together**. Guarding on time alone also
swallowed the second of two quick taps in different places, which is exactly how the
word pool is played — cell, then chip, then cell.

Separately, Safari zooms into any focused field whose text is under 16px, which is the
other half of the same trap. Inputs inherit the 16px body font; the share fallback
textarea did not, and it is focused and selected programmatically, so it zoomed without
the player touching it.

## 20. Hosting

Cloudflare Pages, static assets from `public/`, Functions from `functions/`, one KV
namespace bound as `GAMES`. (The namespace's own title in the dashboard is still
`OYUNLAR` from before the rename; the binding name in `wrangler.jsonc` is what the
code sees, so the two need not match and the stored data is untouched.)

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
| Difficulty | Four fixed levels | **Replaced by two independent settings**: a mode (`pool` / `typed`) and a 1–10 s slider. Old rounds are mapped on read |
| Set label | Neutral `Set 7` shown on the result screen and in the share text so friends could compare | **Removed entirely.** The set is named nowhere. The share text carries only the mode and the duration |
| Typed answers | Text box opens at the bottom | **Card near the top of the screen** with a preview of the drawing, so the phone keyboard cannot cover it |
| Player name | Optional nickname, one field, may be left blank | Up to 10 characters, never asked before a round. Asked only when sharing a round or joining a board, and remembered afterwards |
| Language | Turkish strings inline throughout | Interface strings live in one `TEXT` table; identifiers, comments and docs are English |
| Score board | Listed under "not in this version" | **Implemented** — per-code board ranked by score, ties broken by time, polled live |
| Storage | "Do not use localStorage" | **Used deliberately** for the name, the settings and in-progress rounds, so a reload does not lose the game. See Section 14 |
| Multi-touch | Not mentioned | Each pointer draws its own stroke, so two fingers make two lines rather than one joining them |
| Leaving a round | Not mentioned | `←` with a confirmation, and the timer pauses while it is open |
| Canonical URL | A `pages.dev` address | `https://chizz.party/?o=A7K2`, with non-canonical origins rewritten |

Everything else in the v1.5 spec — the shuffled grid with no cell numbers, random set
selection with no repeat, the normalisation and one-character
typo tolerance, the code alphabet, the 30-day TTL, the 0–255 coordinate shrinking, the
error behaviours — is implemented as written.

The original brief (`chizz-original-spec.md`) additionally required the whole game to be a
single `index.html` with no dependencies and no server. The first two still hold. The
third was given up deliberately in v1.5 to make the duel possible; solo play still
needs nothing but the file.
