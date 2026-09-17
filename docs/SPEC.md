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
| `home` | Title, then two sections with a heading each: the day's puzzle with a way into its board, and `sınırsız` -- two mode buttons side by side, a settings panel, a start button, and a 4-character code field with a join button |
| `countdown` | Full-screen 3 → 2 → 1, one second each |
| `draw` | The drawing phase |
| `between` | After 20 drawings: send to a friend, or guess them yourself |
| `send` | Duel submission: sending / code + link / errors |
| `loading` | Fetching a round opened from a code or link |
| `scores` | The day's global board, the only score table with a screen of its own |
| `recall` | The shuffled grid of 20 drawings, where answers are given |
| `result` | Score, correct/incorrect grid, score board, share button. Also used unmarked -- the drawings with the board under them -- for a round that has been sent but not yet guessed |
| `choose` | A friend's round, opened: kelimeler açık or kelimeler gizli, asked every time before its guessing starts |
| `answers` | One player's answers on a round's board, marked against the words, reached by tapping their name |

Overlays sit outside the screen system: `#sheet` (the word pool), `#modal` (the
typed-answer card) and `#reveal` (the word alone before each drawing), plus three
questions -- `#confirm` before abandoning a round, `#finishAsk` before ending the
guessing, `#timeAsk` before the first unlimited round of the day, and `#nameAsk` for a
name after the first round drawn on a device.

## 4. Flow

### Solo

1. `home` — pick a mode, adjust the settings if you want, press start. The first
   unlimited round of the day answers the question "her kelime için 3 saniyen olacak"
   before the countdown, with başla and değiştir
2. `countdown` — 3, 2, 1
3. `draw` — 20 words, one at a time, auto-advancing, each opening with the word shown
   on the paper for a second
4. `between` — choose to guess yourself or send to a friend
5. `recall` — assign a word to each drawing
6. `result` — score, per-cell correction, share text

Nothing is asked before the round starts. A device with no name yet is asked for one
as soon as its first round is drawn, over the screen that follows, and cannot go on
without giving one. After that it is never asked again, only offered for changing on
the result screen.

### Duel, drawer's side

At `between`, the send option posts the round to `/api/save`, which returns a
4-character code. The screen shows the code, a shareable link, a copy button, and one
way back to the drawings: `çizimlere dön` while the round is unguessed, which shows the
drawings with the board under them and a way into guessing, or `çizimlerine geri dön`
once it has been guessed, which returns to the result. There is no separate score
screen to watch: the board is under the drawings it is about.

### Duel, guesser's side

Opening `?o=<code>`, or entering a code on `home`, fetches the round and asks how to
guess it: kelimeler açık or kelimeler gizli, **every time**, whatever the drawer played
with. The choice is kept with the round, so a guess left half done resumes the way it
was begun instead of asking again. There is no drawing phase and no name prompt. The result screen reads
"in <drawer>'s drawings, 12/20". If the device has no name yet the board shows a
name field instead of a row; filling it in posts the score. A draw-your-own button
starts a fresh round.

Guessing your own drawings first is not a dead end either: `paylaş` copies the score
and the invite link together, and it is the only share action on the screen.

### Leaving a round

Both `draw` and `recall` have a `←` button. It opens a confirmation whose default
action is to stay. **While the confirmation is
open the word timer is paused** and resumes from where it stopped, so the dialog never
costs the player time. The phone's or browser's own back button asks the same question
during the countdown and the drawing.

### Back and reload

Every screen the player arrives at is an entry in the browser's history, carrying the
screen and its round's code (and, on `answers`, whose answers). The browser's back
button and every `←` on the page walk those entries, so both go to the screen the
player actually came from. A reload reads the entry it is on and puts that screen back:
the start screen, günün skorları, arşiv, the between screen and the unsaved link form
(from the unsaved drawing on the device), and every screen of a round (by loading the
round again). A drawing round owns one entry from its countdown on, replaced by whatever
follows it, so back never leads into a round that has ended or been abandoned. A fresh
visit has no entry and starts at the start; a round link opened fresh starts in that
round, and back from there leaves the site.

## 5. Modes and settings

Two variables, set independently rather than bundled into fixed levels.

**Mode** — how an answer is given:

| id | Label | Answer method |
|---|---|---|
| `pool` | Kelimeler açık | Choose from the remaining words, which stay on screen |
| `typed` | Kelimeler gizli | No list; recall and type the word |

**Seconds per word** — a slider from **1 to 10 seconds in half-second steps**,
defaulting to 3, which is also the recommended speed named under the slider.

The daily ignores both settings: it is always `typed` at 3 seconds. Everyone plays the
same twenty words, and a shared board only means something if the terms are the same
for everybody on it. That is why the mode buttons and the slider sit inside the
`sınırsız` section rather than above both games.

Because the setting outlives the visit, the first unlimited round of each day says what
it is — `her kelime için 3 saniyen olacak` — offering başla and değiştir. The device
remembers the day it last asked, so it is asked once a day and not before every round.

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

- Each word opens with the word itself **on the paper, in black**: 0.7 s to read, then a
  0.3 s fade. It is centred on the square, with the same gap either side, and the word in
  the header is there the whole time — the big one is a second look, not a title card.
- **The size is measured, not fixed.** One number cannot suit both `ev` and
  `çamaşır makinesi`, so the largest size that fits the square by width and height is
  found by halving. Words break between words only, never inside one.
- **The pen is never blocked**: you can start drawing the moment the word appears, and
  the layer takes no taps. The word's own time starts as the fade begins, so the second
  spent reading is not taken out of the drawing.
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

## 7. Words

Both games deal from one pool: 459 words in 14 **silhouette** families (`docs/words.json`,
copied into `public/index.html` as `DAILY_POOL`). Families are grouped by shape, not by
category — an elephant and a sofa share a shape, which is the joke. A round is two
families and ten words from each, never more than two birds. Family names are never shown. See `docs/WORDS.md`.

**The day** is the same for everyone and follows its own schedule: no word returns
within 14 days. The schedule is replayed from day 1 against the pool, so the days already
played are kept as they were dealt (`DAILY_PLAYED`) and a change to the pool only
reaches days nobody has seen. Extend it through today before any pool change.

**sınırsız** is dealt per device (`freshWords`). The device remembers the day each word
was put in front of it, in the daily game or here (`seen` in section 14), for 14 days.

- Words not seen for 14 days are dealt first, at random, so which words meet varies
  from round to round.
- When a family has fewer than ten of those, the words seen longest ago fill it, spread
  at random across a week around the day they were seen -- by exact day, the ten words
  dealt together on one day came back together.
- The two families are the ones needing the fewest such repeats, at random among equals.
- **On a device that has played the daily game on at least 2 different days in the last
  14** (`dailyPlayed`), the daily game's words for today and the next 13 days are held
  back and dealt only when nothing else is left. The day is the same for everyone and
  cannot avoid this device's words, so without this a word dealt in sınırsız came round
  again in the daily game within the 14 days. A device that does not play the day keeps
  those 280 words. One day does not count: a single try held the words back for 14 days
  and took a sınırsız-only player (1 a day) from 0 repeated words a round to about 6.6.
  The price is that the second daily game, like the first, can repeat words sınırsız dealt.

Measured by simulation over 90 days with 461 words, repeated words out of 20 (seen by the
device in the previous 14 days):

| Play | in the daily game | per sınırsız round | first repeat |
|---|---|---|---|
| daily only | 0 | — | never |
| sınırsız only, 1 a day | — | 0 | never |
| sınırsız only, 2 a day | — | 14.8 | day 11 |
| daily + 1 sınırsız a day | 0 (13.5 before the hold-back) | 17.7 | day 4 |
| daily + 2 sınırsız a day | 0 | 18.7 | day 3 |

The daily game takes up about 540 words at a time for a device that plays it (the last 14
days and the next 14), more than the pool holds, so its repeats land in sınırsız, mostly
as words seen 10–13 days earlier. With 811 words daily + 1 sınırsız a day has no repeats;
with 1,091, daily + 2 a day has none. Over many rounds a word's most frequent partner comes along about 56% of the time,
the same as pure random dealing; with the 30 fixed sets this replaced it was 98%.

The rounds used to come from 30 fixed sets of 20, so the same words always arrived
together and two sets could share half their words. A save from a page loaded before
the change still sends `set-01` … `set-30`, and is accepted; a dealt round sends `mix`.

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
chizz 🎨 günlük · 16/09/2026
kelimeler gizli · 3 sn
12/20 · 47 sn

🟩🟩🟥🟩
🟩🟩🟩🟥
🟥🟩🟩🟩
🟩🟥🟩🟩
🟩🟩🟥🟩

Sen de tahmin et:
https://chizz.party/?o=A7K2
```

Guessing someone else's round, the first line also names the drawer. A daily round
carries `günlük` and its date on that line wherever it is shared from — the drawings,
the score, the invite, the link preview — because whether a round is the day's puzzle
is the first thing a reader needs to know. Sharing is one button: `paylaş` copies the
score and the invite link together.
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
`{code}`. Validates the set id (`mix`, or a legacy `set-01` … `set-30`; a daily round sends a day instead), mode, seconds in 1–10, exactly 20 words, exactly 20
drawings and every coordinate as an integer in range; rejects bodies over 200 KB with
`413`. A legacy `difficulty` is accepted in place of `mode`/`seconds`. Non-`POST`
methods return `405` — without an explicit handler Pages would fall through and serve
the whole HTML page in reply to an API call.

`GET /api/game/:code` — returns the stored round, `404` for an unknown or expired code.

`POST /api/feedback` — body `{kind, text, name, context}`, returns `{ok: true}`. `kind` is
`hata` or `oneri`; `text` is 10–500 characters; `context` is dropped if over 4,000
characters of JSON. Each report is one KV entry keyed
`feedback:<ISO time>:<kind>:<4 random characters>`, kept 180 days. Nothing reads them
through the API. A hidden `website` field that a person cannot fill makes the request
succeed without saving. Non-`POST` returns `405`.

`GET/POST /api/scores/:code` — body `{name, score, ms, answers}`. **The board is ranked best
score first, ties broken by the faster time**, then by who finished first; rows
written before times were recorded have no `ms` and fall in behind timed ones on a
tie. Each player writes to their own key (`<CODE>:s:<name>`) so two people finishing
at once cannot overwrite each other, and a summary is written to `<CODE>:board` for
readers. This keeps reads to a single `get`: the board is polled live, and calling
`list` on every read would exhaust the free tier's 1,000 daily list operations. Names
are normalised the same way answers are, so case and accent variants are one player,
and are capped at 10 characters. A score can only be written against a code that
exists. Re-playing keeps your original finishing position and your original time.

`answers` is the player's 20 answers indexed by drawing, each cut to 40 characters, and
is stored as the value of the player's own key -- empty before answers were kept. The
board never carries it. `GET /api/scores/:code?name=<name>` returns `{answers}` for one
player, `null` when there are none: one `get`, made only when someone taps a name.

Everything is written with a **30-day TTL** and expires by itself. Stored data is the
set id, mode, seconds, an optional name, the 20 words and the 20 drawings. No email,
no IP, no account.

### Score board

On the result screen of a shared round, and on the drawer's `scores` screen, the board
polls every 2 seconds while the screen is visible, pausing when the tab is hidden and
refreshing immediately on return. Your own row is inserted locally so it appears
before KV's listing catches up.

On the result of a round this device has guessed, every row opens that player's answers,
and a line under the board's title says so: "üzerine tıklayarak arkadaşlarının
cevaplarını görebilirsin". Not on the day's board, and not on the drawings-with-board
screen before the round has been guessed, where the answers would be the words.

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
| `hintDay` | The day the time-per-word reminder was last shown, so it is shown once a day |
| `rounds[CODE]` | Per round: the grid order, the answers so far, whether it was finished, the score, the time, whether the score reached the board, whether this device drew it, the name the score went up under, the mode chosen for guessing a friend's round, and two tokens -- one that lets the round be renamed, one that lets its board row be moved |
| `pending` | The drawn round on the between screen, not saved anywhere yet, with when it was drawn: it is what a reload there returns to |
| `drafts` | Older unsaved rounds. Starting a new round, or leaving one, moves `pending` here instead of deleting it, if anything was drawn in it. Listed in arşiv; opening one makes it `pending` again. Same 30-day and 40-round limits as `rounds` |
| `seen` | Word → the day it was last dealt to this device, in either game, kept for 14 days. What sınırsız deals from (section 7) |
| `dailyPlayed` | The different days in the last 14 on which this device started the daily game. With 2 or more, sınırsız holds back the upcoming daily words (section 7). Replaces `dailyAt`, which is still read |
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
  used to lose the link entirely. See *Back and reload* in section 4.
- **arşiv lists every round drawn here**, not only finished ones: a finished round opens
  its result, a round nobody has guessed opens its drawings with the board, and every drawing
  never saved (with at least one line in it) opens the between screen. A round drawn and then left on the start screen
  by mistake is one tap away.
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

Once, required, right after the first round drawn on a device: the rounds it shares and
the scores it posts all carry it. After that, on the result screen, under the grid,
headed "adını değiştirmek ister misin?" when a name exists and "adın" when it does not
(a guesser who has never drawn). The field is prefilled; the button reads katıl when
there is no name yet and kaydet when there is.

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

The address on its own is a different card, and a static one: `index.html` carries its
own title, description, og: tags and image, which the middleware rewrites in place for a
round rather than adding second copies.

- **Icons are files**: `/favicon.ico` (16, 32, 48), `/apple-touch-icon.png`,
  `/icon-512.png` (the address's og:image) and `/icon.svg`, all drawn by
  `tools/make-icons.js` as geometry, so no font is involved. Search engines ask for
  `/favicon.ico`, which used to answer with the page itself -- hence the globe.
- **The description names chizz** and the title is "chizz · çizim hafıza oyunu". A search
  for the name showed page text containing the word instead of a description that lacked
  it, and a one-word title was rewritten (as "Chizz"). The game's own markup carries
  `data-nosnippet`, and a WebSite JSON-LD block gives the site name.

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

## 19b. Feedback

A `geri bildirim` button sits at the top right of the start screen, above the title, so
every visit sees it without scrolling. `bir sorun mu var? bildir` appears under a result
and on a failed round load, where problems are found; from there `hata bildir` is
already chosen.

The dialog asks for the kind (`hata bildir` / `öneri`) and up to 500 characters, with a
live count and at least 10 characters. It says `ekran ve cihaz bilgisi de eklenir`, and
attaches: the screen it was opened from, the address, the round code, the day, whether it
is a daily round, role, mode, seconds, theme, browser, language, viewport and pixel
ratio, whether the device is online, and the last five script errors (message and
position only). The name on the device goes too. No screenshot: few people attach one
from a phone, it can hold personal things, and it would need file storage.

One report a minute per device (`fbAt` in storage). No IP address is stored.

**Reading them:** Cloudflare dashboard → Storage & Databases → KV → the `GAMES`
namespace, keys starting with `feedback:`, or
`npx wrangler kv key list --prefix feedback: --namespace-id <id> --remote`.

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
