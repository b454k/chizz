# Changelog

## 2026-09-17 — one daily game does not make a daily player

sınırsız held back the coming daily words for 14 days after any daily game. A player of
sınırsız alone who tried the daily game once went from 0 repeated words a round to about
6.6 for the next two weeks, for a game they might never play again. A device now counts as
a player of the day only after playing it on 2 different days within 14.

## 2026-09-17 — geri bildirim

- A `geri bildirim` button at the top right of the start screen, and a `bir sorun mu var?
  bildir` link under a result and on a failed round load.
- One dialog behind all three: hata bildir or öneri, 10–500 characters with a live count.
  The page attaches what it knows -- screen, round code, day, mode, device, viewport and
  the last five script errors -- in place of a screenshot, and says so.
- `POST /api/feedback` writes each report as its own KV entry,
  `feedback:<time>:<kind>:<random>`, kept 180 days, readable in the Cloudflare dashboard.
  One report a minute per device, a hidden field to catch form bots, no IP stored.

## 2026-09-17 — five words out, three in

- In the same family: `semer` → `askılık` (domed), `kement` → `balon balığı` (ring),
  `selvi` → `pırasa` (vertical).
- Removed as duplicates of a word that stays: `kanepe` (keeps `koltuk`) and `demiryolu`
  (keeps `ray`). With `kanepe` gone, the rule keeping it apart from `koltuk` went too.
- All five are recorded in `docs/BANNED-WORDS.md`. The pool is 459 words.

### The days already played stay as they were
Every day is replayed from day 1 against the pool, so any change to the words reshuffles
the whole schedule — today included, which would have given anyone who had not played yet
different words from friends who had, on the same board. Days 1 to 10 are now kept as they
were dealt (`DAILY_PLAYED`), and the new pool starts with day 11. Checked over 1,100 days:
days 1–10 unchanged, no word back within 14 days (across the switch too), never more than
two birds, no removed word dealt after day 10. `CLAUDE.md` now says to extend the list
through today before any pool change.

## 2026-09-17 — sınırsız stops repeating itself

Playing sınırsız round after round showed the same words back to back. It was not
dealing words: it picked one of 30 fixed lists of 20, avoiding only the list just
played, so the same twenty always came together and two lists could share half their
words.

- sınırsız now deals from the daily game's pool the way the day does -- two silhouette
  families, ten words each, birds capped, kanepe and koltuk kept apart -- favouring words
  this device has not been shown for 14 days, in either game. When those run out, the
  words it saw longest ago come back, spread over a week so a group does not return
  whole. The 30 fixed sets are gone.
- Simulated: one round a day never repeats within 14 days; the daily plus one round a day
  first repeats around the 14th round; back-to-back play around the 20th. A word's most
  frequent partner now comes along about 56% of the time over many rounds, against 98%
  with the fixed sets. The daily game's words are unchanged, checked for 500 days.
- The limit is the pool: 461 words is about 20 rounds before anything repeats, per
  device, and friends on their own phones are dealt independently. Growing the pool is
  what raises it.

### The daily game no longer repeats what sınırsız dealt
Simulating the above showed a worse problem: for someone playing the daily game and one
sınırsız round a day, 13 of each day's 20 daily words had already been dealt to them in
sınırsız within 14 days. The day is the same for everyone and cannot avoid one device's
words.

- On a device that has played the daily game in the last 14 days, sınırsız holds back
  the daily words for today and the next 13 days, and deals them only when nothing else
  is left. Daily repeats go to 0; the repeats move into sınırsız, mostly as words seen
  10–13 days earlier, because the daily game takes up about 540 of the 461 words for
  such a device.
- Devices that never play the day are not affected and keep those 280 words.
- With about 630 more words, daily + 2 sınırsız a day repeats nothing.

### arşiv keeps every unsaved drawing
Starting a new round deleted the unsaved one before it, so only the last drawn round
ever showed as "henüz kaydedilmedi". Now each drawn round with at least one line moves to
arşiv instead, until it is sent, guessed, or ages out after 30 days. Blank rounds are not
kept.

## 2026-09-16 — back, reload, arşiv, and friends' answers

A friend drew a round, landed on the start screen by mistake, and had no way back to
her drawings: the back button left the site, and arşiv only listed finished rounds.

### Back and reload
- Every screen is now an entry in the browser's history. The back button works, and
  goes where the `←` on the page goes -- both walk the same entries. Back during a
  drawing asks "oyundan çıkılsın mı?" instead of throwing the drawings away.
- A reload stays on the screen it was on, günün skorları and arşiv included (both used
  to fall to the start screen), and so does the link form before a link exists.
- The place memory and screen trail that stood in for this are gone.

### arşiv
- Lists every round drawn on the device: finished ones, ones nobody has guessed yet
  (score shown as —, opening the drawings with the board), and a drawing never saved
  (opening "arkadaşına gönder / kendim tahmin edeyim").

### Name
- Asked in a pop-up right after the first round drawn on a device, and required.
  Never asked again once there is one.
- The result screen's name field reads "adını değiştirmek ister misin?" when a name
  exists.

### Friends' answers
- On the result of a round, tapping a name on the board opens that player's answers,
  marked against the words. A line under the board's title says so. Not on the day's
  board, and not before this device has guessed the round.
- Each score post now carries the player's answers in the value of their own KV key.
  Reading them is one `get`, only on a tap; the polled board is unchanged. Scores
  posted before this have no answers to show.

### A friend's round asks how to guess it
- Opening a friend's link asks kelimeler açık or kelimeler gizli every time, instead of
  using the drawer's mode. A half-finished guess resumes with the mode it was begun with.

### Search result and link preview
- `/favicon.ico` answered with the page, so search results showed a globe. There are
  now real icon files (ICO and PNG), drawn by `tools/make-icons.js`.
- The description did not contain "chizz", so a search for the name showed the game's
  button labels run together instead. The description now starts with the name, the
  title is "chizz · çizim hafıza oyunu" (a bare "chizz" was rewritten as "Chizz"), the
  game's markup is marked `data-nosnippet`, and the address has an og:image. Search
  engines only pick this up when they next crawl the site.

## 2026-09-16 — a KV list a second

Cloudflare warned that half of the day's free KV allowance was gone with almost nobody
playing. Its analytics named the operation: **675 lists** against a limit of 1,000, and
**674 reads that found nothing** — one of each, paired.

That pair is an empty score board being polled. A board read looks for the summary the
score posts write, and when there was none it listed the per-player keys to reconcile.
An empty board never writes a summary, so it never stopped: one list a second for as long
as günün skorları, çizimlerine dön or an unnamed result stayed on screen. Eleven minutes
of that is the whole day's 675.

- A board read with no summary now answers empty and lists nothing. Every score post
  writes the summary in the same request as the player's row, so there were no rows for
  the list to find. Measured against the real handlers: an empty board polled for a
  minute went from 60 reads and 60 lists to 60 reads and none.
- The five-minute reconcile of a board that already has scores is unchanged.

Not fixed here, and worth knowing: the board still polls once a second, a round is saved
when its guessing starts rather than when it is shared, and opening a round link reads
the round twice (once for the link preview, once for the game).

## 2026-09-16 — two games, one screen each

A pass over every screen, after watching people play. Most of it removes a second way
of doing something that already had one.

### The start screen

- Split in two, with a heading each: **günlük oyun** and **sınırsız**. The settings sat
  under both and read as though they applied to the daily, which ignores them.
- The two modes sit **side by side**, kelimeler açık on the left, kelimeler gizli on
  the right, rather than stacked.
- **The day board is readable before playing.** It used to appear only once the day was
  done, so nobody could see what they were playing against.
- **The first unlimited round of the day says how long each word gets**, with başla and
  değiştir. The setting outlives the visit, so people were starting a round at a time
  they had chosen days earlier without noticing. Asked once a day: more is nagging.

### Playing

- **The word is shown on the paper before every drawing**, in every mode: black, centred
  on the square with the same gap either side, 0.7 s to read and 0.3 s to fade. The size
  is measured rather than fixed, so `ev` fills the square and `çamaşır makinesi` shrinks
  to fit, breaking between words and never inside one. The word in the header stays put
  throughout, and **the pen is never blocked** — you can draw the moment it appears. The
  word's own time starts as the fade begins, so reading costs nothing. Two earlier tries
  were worse: a full-screen card read as a loading screen, and flying the word up into
  the header made a ceremony of it.
- **The daily is now kelimeler gizli**: the words are not shown, they are typed, with
  the same one-typo forgiveness as the unlimited game. Everyone plays the same twenty
  words, so the harder reading of them is the one worth ranking.

### Words

- **At most two birds in a day.** Seventeen of the thirty-one winged words are birds, so
  ten drawn at random came out half birds and the day read as a round about birds rather
  than about a shape. Over three years of days the cap holds: never more than two, and
  94% of days have none, against days of five, seven and nine before.
- The four families that gave words to `winged` were topped back up: `tümsek` to
  `domed`, `dal` and `şiş kebap` to `stick`, `kızak`, `sörf tahtası` and `köpekbalığı`
  to `horizontal`. The pool stands at 461 words.
- A family is now eligible only if it can field a legal ten — eight free non-birds under
  the cap — so a day can never be asked for words it cannot supply. For every family but
  the winged one this is the same test as before, and the seeded shuffle is untouched, so
  no other family's days change.
- The cost is that `winged` appears **every 16.8 days instead of every 6.2**: a capped
  round eats eight of its fourteen non-birds, and the fourteen-day rule then locks them.
  Adding non-bird winged words is what buys the rhythm back — five would bring it to 8.8
  days, ten to 6.4 — and that is waiting on words the owner approves.

### Sharing and scores

- **One share button.** paylaş copies the score and the link together; arkadaşına
  gönder sat beside it looking like a different thing, and was not.
- **A score table never appears away from the drawings it belongs to.** The separate
  scores screen is gone. The only board with a screen of its own is the day's, which is
  global and has no drawings behind it. The send screen now offers **çizimlere dön**,
  the drawings with the board under them and a way into guessing, or **çizimlerine geri
  dön** once the round has been guessed. It used to offer "kendim de tahmin edeyim"
  even to someone who had just done exactly that.
- **A daily link outlives its day.** Daily rounds were thrown away at midnight, so a
  round shared in a group chat in the evening opened to nothing in the morning. They
  keep the usual thirty days now: guessing is never tied to the clock, only drawing the
  day's words is.
- **Anything shared from a daily round says günlük**, with the date: the drawings, the
  score, the invite and the link preview. Before, only a score posted from the day
  board said so.

### Reloading

Every screen was walked through with a reload, and the answer now is: you come back to
where you were.

- **Leaving a round leaves its address behind.** ana ekran from the link screen kept
  `?o=CODE` in the bar, so a reload walked straight back into the round that had just
  been left. Showing the start screen now clears it, which fixes every route home at
  once rather than the one that was noticed.
- **The screens the address cannot describe are remembered on the device**: the "what
  now" screen after drawing, whose round has no code yet; the drawings shown with their
  board; and the day's score board, which belongs to no round. Each is restored only if
  the thing it was showing is still there.
- **Twenty drawings are no longer lost to a reload.** A round gets its code when it is
  sent or when guessing starts; before that the drawings lived only in memory. They are
  kept on the device until the round has a code of its own, and dropped when it does,
  when a new round starts, or when the round is abandoned.
- The one screen that cannot survive a reload is the **drawing phase itself**: the
  strokes, the word order and the clock are not written down mid-round, and a reload
  there still returns to the start screen. Saving them stroke by stroke would cost more
  than it buys.
- The two mode boxes no longer sit flush against the settings panel under them.
- **The drawings shown before guessing name nothing.** çizimlere dön borrowed the
  result screen, captions and all, so a round that had not been guessed yet was
  displayed with every answer written under it. The review grid carries no captions,
  and the zoom holds its tongue until the round is over.

### The bare address

- chizz.party pasted on its own showed a globe and a sentence scraped out of the page.
  It now carries its own description and og:title, and **an icon file** at `/icon.svg`.
  The icon was a `data:` URI, which a browser renders in a tab but link previews and
  search results do not fetch.
- Dialog cards are border-box, so a long line no longer runs off the side of a narrow
  phone.

## 2026-09-13 — daily puzzle

Added alongside free play rather than replacing it. Free play keeps its thirty
hand-made sets and its settings; the daily has its own words, its own fixed settings
and its own board.

### The day

- One puzzle a day, the same twenty words for everyone. Day 1 is **Tuesday 8 September
  2026**, and the day turns over at **midnight in Turkey** for every player wherever
  they are — local midnight would hand friends in different countries different words
  and make their scores incomparable.
- Locked to **kelimeler açık, 3 sn**, ignoring the settings panel. Without that a
  14/20 at 10 s with the word list showing would sit on the same board as a 14/20 at
  1 s from memory, and the board would mean nothing.
- No archive and no replay. Once the day is finished the start line becomes the result
  and a way to the board.
- Global board for the day: name, time, score, ranked by score with ties going to the
  faster time.

### Words

- `docs/words.json` — all 449 words tagged into 14 silhouette families. The tags were
  read back out of the hand-made sets, which already encoded them in their comments,
  so the difficulty design survives: two families a player can separate at a glance,
  and the real work inside a family where a `fil` and a `kanepe` are the same shape.
- **No word returns inside 14 days.** 14 is not a round number chosen for feel. A
  family averages one appearance every 7 days, so the cost of the rule is a staircase:
  8–14 days all need 20 words per family, 15–21 all need 30, 22–28 all need 40. 14 is
  the top of its step, so anything lower gives away freshness for free — and 15 would
  be the worst choice on the board, paying the full price of 21 for six fewer days. If
  it is ever raised, it should go to 21.
- Ten words were added and two moved so `domed` and `ring` could meet it.
- The generator orders nothing. A family is in the running only if it can field ten
  words nobody has seen for fourteen days, and the day picks two of those at random.
  The rule holds by construction rather than by schedule. Ordering by age was tried
  first: it kept the rule but produced only 7 of the 91 possible family pairings, so
  the same two shapes arrived together every week. Loosening the order without the
  eligibility filter breaks the rule outright — 1,696 violations over three years.

### Sharing a daily round

- A daily link from a friend is **held behind a gate** until the reader has drawn that
  day. Today's words are the same for everyone, so their grid would show the words
  before the reader had drawn them. After the forced draw the reader chooses whose to
  guess first, and the result screen offers the other.
- A score on someone else's daily round goes to **that round's board**, not the day
  board. The day board is your recall of your own drawings, which is the comparable
  thing; how well you read a friend's scribbles depends on how they draw.
- Daily rounds expire at the end of their day rather than after thirty.

### Also

- The daily clock lives in `lib/day.js`, imported by both functions. The client keeps
  its own copy because `index.html` has no imports and no build step;
  `tools/check-day-epoch.js` asserts the two agree, because if they ever drift the
  failure is silent — wrong words, wrong board, wrong expiry, no error anywhere.
- Set comments in `index.html` now name families in English and consistently
  (`round / boxy`), matching `docs/WORDS.md`. They were Turkish and spelled three
  different ways.
- **A reload no longer strands a daily duel.** Which friend's round you are dueling
  used to be held only in memory, and switching rounds left the address bar on the
  round you had just left. Reloading after "now guess theirs" rebuilt your own result
  and the way back was gone. The friend's code is now written into the day record when
  their link opens, every switch goes through the address bar, a reload on the
  choice screen comes back to it, and a half-guessed daily round of your own comes
  back to its grid with the answers still in it rather than to the share screen.
- **Whose drawings now reads right in Turkish.** The possessive was a fixed `'ın`,
  which only suits names like Başak: it showed "Ayşe'ın çizimleri". The ending now
  follows the name's last vowel, with a buffer n after a vowel — Ayşe'nin, Mert'in,
  Çağla'nın, Oğuz'un, Ümmü'nün — on the result line, the board heading, the share
  text and the link preview title.
- **Bitir asks first.** A stray tap used to end the round at once, which on the daily
  means the day is gone. It now asks "Bitirdin mi?"; "Tahmine devam et" or a tap outside
  goes back to the grid.
- **The day board's back arrow goes home.** It guessed its destination from the last
  round's code, which is still set after playing the daily, so opening the board from
  the start screen sent the arrow to the name screen and Vazgeç on to an unrelated
  screen. It now returns to wherever the board was opened from.
- **All interface text is lowercase**, matching "ne chizzmiştin?": every label, button,
  message and title, the share text ("chizz 🎨") and the link preview description. Two
  CSS rules that forced captions into capitals are gone. Round codes stay uppercase
  and names stay as typed — those are data, not interface. The Bitir question now says
  "yanlışlıkla tıklamadığından emin oluyorum".

## 2026-09-11 — first publication

Where the project stood when it was put on GitHub, rather than a reconstruction of
the history before it. Later entries are above; this one has not been updated since,
so read it as a snapshot of that date.

### Game

- 30 word sets (`set-01`…`set-30`), 600 slots, 459 unique words. Two silhouette
  families of 10 per set; no word appears more than twice overall and never twice
  inside one set.
- Four difficulty levels: `easy` (4 s, pool), `medium` (2.5 s, pool), `hard`
  (2.5 s, typed), `impossible` (1.5 s, typed). Default `medium`.
- Random set per round, never the same set twice in a row, and the set is named
  nowhere in the interface.
- Recall grid shuffled independently of drawing order, with no cell numbers. The
  result screen reuses the same order.
- Typed answers are normalised with Turkish-aware lowercasing and letter folding, and
  a one-character typo is forgiven.
- `←` on the drawing and recall screens leaves a round after a confirmation. The word
  timer pauses while that confirmation is open.
- Player name is asked before every round, max 5 characters, remembered for the rest
  of the session.

### Duel

- Rounds save to Cloudflare KV under a 4-character code and expire after 30 days.
- Per-round score board ordered by finishing time, polled live while visible. Each
  player writes to their own key so simultaneous finishes cannot overwrite each other;
  readers get a single pre-computed summary to stay inside the free tier.
- Share text carries the difficulty and the result grid, and deliberately omits the
  set name so it cannot leak which words were in play.

### Hosting

- Live at **https://chizz.party** on Cloudflare Pages with Functions and one KV
  namespace bound as `GAMES`. (The namespace is *titled* OYUNLAR in the dashboard,
  from before the rename; the binding name in `wrangler.jsonc` is what the code sees,
  so the two need not match.)
- Static assets are served from `public/`, so `README.md`, `start.cmd` and
  `wrangler.jsonc` are not reachable from the site.
- Duel links generated on `localhost`, from a `file://` copy, or on `*.pages.dev` are
  rewritten to the canonical domain. `pages.dev` is filtered on some networks, and a
  link pointing there silently fails for those recipients.

### Known gaps

- Interface is Turkish only.
- An English edition would need its sets rebuilt on the same silhouette logic rather
  than translated — the logic is universal, the words are not.
- Timing has not been tuned on real players yet; the four levels exist partly to find
  out which variable, time or answer method, actually creates the difficulty.
