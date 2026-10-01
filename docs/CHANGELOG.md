# Changelog

## 2026-10-02 — the start screen opens on the wordmark

The start screen opened on everything at once: the day, sınırsız, the code field and
more, which was a lot to take in on arrival. Its first screen is now the wordmark, in the
middle, and the day's card whole beneath it; sınırsız and the rest start below the fold.
The space above the wordmark and the space below it share what is left of the screen, so
on a short phone the wordmark moves up rather than the card being cut off.

Checked at 390×844, 412×780, 360×740, 390×664, 375×667, 375×600, 375×548 and 1280×800:
the card is whole on every one and sınırsız starts exactly at the bottom edge.

## 2026-09-30 — a new look: the sketchbook

Every screen is redrawn; nothing about how the game plays has changed — not a word, a
timer, a screen, a question or the order they come in. The idea, the tokens and the reasons
are in [DESIGN.md](DESIGN.md).

The page is a sketchbook on a desk: dot-grid paper, graphite for the ink, pencil yellow for
the one thing on a screen that is meant to be pressed, and a teacher's red pen and green
tick for the marking. The drawing paper stays white paper in both themes.

- **The wordmark is drawn, not set**: five pencil strokes and a dot, in the page, so it needs
  no font. It draws itself when the page opens. **The icon** is a graphite `c` on pencil
  yellow with the pencil that is just finishing it, solid at tab sizes. **`og.png`** is a
  new 1200 × 630 card for the bare address, with four drawings from round 6G75.
  `tools/make-icons.js` draws all of them, and now writes `icon.svg` too.
- **One yellow per screen.** `başla` is outlined until the day's puzzle is played, then the
  yellow moves to it from `çiz`. `bitir` turns yellow once every drawing has an answer.
- **The day is a leaf off a wall calendar**, weekday, date and month, stamped once played.
- **The score is circled in red pen.** A right drawing is framed green with a tick; a wrong
  one keeps a plain frame and gets a red cross, so a bad round no longer reads as a
  telling-off, and the marking no longer depends on colour alone. Under the drawings,
  `paylaş` and `cevaplarımı kaydet` sit side by side, and `oyun kodu` over the board is
  set large.
- **The board** has medals for the first three, a chevron on every row that opens a
  friend's answers, and a pulsing dot that says it is live.
- **nasıl oynanır is drawn in the page** instead of being a 430 KB GIF: the same three steps,
  drawn with the strokes of a real round, 6G75 (`saat` stands for rakam yok, since it has
  a 1 and a 2 in it), sharp at any size, in either theme, about 3 KB compressed.
  `public/how-to-play.gif` is gone.
- **The drawing screen shows no seconds**: the gauge running down is the only clock.
  `ekranı temizle` sits between the gauge and the paper, and the countdown is the number
  alone.
- **The time sentence keeps to one line**, sized for its widest value, so `2,5` no longer
  breaks it in two under the slider.
- **An answered drawing is marked three ways** on the guessing grid: a pencil badge, its
  answer on a yellow label and a darker frame (yellow in the dark theme, where a frame
  alone did not show).
- **The theme follows the device** until one is chosen, with a third choice, `otomatik`.
  A device that had `koyu` or `açık` stored keeps it.
- **A long word in the drawing header is set smaller instead of cut** with an ellipsis, in a
  header that keeps one height, so the paper never moves between words. The same fit keeps
  a friend's name and score on one line over a result.
- Illustrations where a moment needed a face: twenty pages done, a paper plane, a closed
  eye for `önce sen çiz`, a scribble for loading, a snapped pencil for a code that is gone.
- The saved picture is drawn on the same dot-grid page, with the wordmark, the score circled
  and the right drawings framed green.
- Fixed while at it: on the question screens a paragraph rule outranked the name field's
  own label, hint and error, so `önce adını yaz.` was grey instead of red; in the light theme
  the zoom caption was dark text on the dark backdrop.
- **A reload shows the page whole.** Everything on it is written in by the script at the end
  of the file, and a phone painted before that had run: a reload showed the start screen
  without its words, even in the middle of a round, then jumped into place with the wordmark
  already drawing, and with koyu chosen on a light phone that moment was light. The page now
  stays off screen until it is filled in, the wordmark starts drawing as it comes on, and the
  theme is set before the first paint.

Checked in both themes at phone and desktop widths: a sınırsız round from the start screen
through the time question, countdown, drawing, kolay and zor guessing, the result, the board
with friends on it and one friend's answers; sending a round and its ticket; a friend's link
with and without a name on the device; a friend's daily link before drawing (`önce sen çiz`);
the day's two boards; an expired code; the start screen before and after the day is played;
feedback, leave, finish and time dialogs, the time sentence at every value; the saved picture;
the result buttons from 320px to 600px wide; reloads on the start screen and inside a round
with the processor slowed four times, frame by frame, on a dark and a light phone. `check-words`, `check-categories` and
`check-day-epoch` pass.

## 2026-09-29 — other names count, and two words leave

`bavul` went and `valiz` stayed; `alev` went and `ateş` stayed. Both pairs drew as the
same thing, which only made a round harder to read. Days 21 and 22 were frozen first, so
nothing already played moved. The pool is **711 words**.

**A drawing is now judged by what it is, not by which of its names came to mind.**
`docs/words.json` carries an `also` table, mirrored into the page: `boomerang` for
`bumerang`, `çimen` for `çim`, `laptop` for `bilgisayar`, `bilye` for `misket`, `can
simidi` for `deniz simidi`, and 58 more — 63 answers for 54 words. Each is compared with
the same one-edit allowance as the word itself, so a slip in one of those is forgiven too.

The typo allowance itself stays at one edit, and the measurement is why. Over the pool,
one edit already lets **118 pairs of real words answer for each other** (`kale`, `kare`,
`kase`, `kule`, `kalp`, `lale`). Two edits takes that to **1,482**. Allowing a two-letter
tail makes `at` answer for `ateş` and `kaz` for `kazak`; ignoring doubled letters makes
`saat` answer for `at`. Any two words can share a round, so each of those pairs is a way
to score without knowing which drawing is which.

- `tools/check-words.js` refuses a listed answer that is, or is within one edit of, any
  other word in the pool. It refused `nal` for `at nalı` (`dal`, `nar`), `saz` for
  `bağlama` (`saç`, `kaz`), `şiş` for `şiş kebap` (`diş`, `şişe`), `sörf` for `sörf
  tahtası` (`şort`) and `petek` for `kalorifer` (`etek`). Planting a bad one fails the
  check, which is how the rule was tested.
- `solucan` and `tırtıl` stay separate answers, on the owner's word: both are in the pool
  and in the same family, so listing either for the other would let one typed word score
  on both drawings in a round holding them.
- `kulübe` was dropped by hand for the same kind of reason -- it reads as either
  `köpek kulübesi` or `telefon kulübesi`, and only the checker's spelling rule would have
  let it through.

Checked: days 1-22 unchanged, no word returns inside 14 days over 1,100 days, every word
still dealt, and the judge itself asked eighteen questions -- `boomerang` and `boomerangg`
in, `solucan` for `tırtıl` out, `at` for `ateş` out, `kale` for `kare` still in.

## 2026-09-28 — the speed is asked again before a replay

`tekrar oyna` and `sen de çiz` started the next round at whatever the last one used,
with the slider two screens away on the start screen. They now ask `her kelime için 3
saniyen olacak` with başla and değiştir, the same question the first round of the day
gets.

- **`değiştir` opens the slider inside the card** instead of sending anyone back to the
  start screen, and the sentence above it follows the slider, so the choice is read in
  the words it will be played under. `başla` begins the round at that setting, keeps it
  on the device, and moves the start screen's slider to match.
- From the start screen it is still asked once a day; from a finished round, every time.

## 2026-09-28 — the way back out of kolay

Reported: guessing a friend's round in kolay, the browser's back button returned to the
kolay/zor question — so the round could be begun again in zor with the words already
seen, and the answers picked from the list still written under the drawings.

- **Back out of guessing asks**, the way the arrow on that screen already did: `çık` or
  `oyuna dön`.
- **The mode is settled once guessing begins.** A `choose` entry in the history now opens
  the grid instead of the question when the round has been started; every other way in
  already worked that way.
- The dialog tells the truth about each case: leaving a drawing loses it, leaving the
  guessing does not, since the answers are written down as they are given.

Checked: two answers picked in kolay, back asks and stays put; `oyuna dön` keeps the
round; `çık` goes to the start screen; walking back from there never reaches the question
again; reopening the link resumes kolay with both answers. Backing out of a drawing still
asks, with its own wording.

## 2026-09-28 — how it is played, shown to the people who arrive by a link

`nasıl oynanır?` showed itself on the start screen to a device that had never played, and
a friend's link was the one way in that never reached it — which is the way most people
meet the game. Opening a link writes the round down before any of that runs, and that
alone made the device look like a player.

- Whether the device had played is decided once, as the page opens, before the link is
  read.
- The loop is shown over the two screens a link lands on as well: the kolay/zor question
  and `önce sen çiz`. Both are read before anything is played, so nothing is given away.

Checked on a phone that had never played: a sınırsız link and a daily link both show it,
`anladım` leaves the link's own screen waiting underneath with its name field, opening a
link again does not show it twice, and a device that had already played is not shown it.

## 2026-09-28 — arşiv lists a round once

Reported: some dates wrong in arşiv, and the same game listed twice.

- **A round saved from a drawing kept on the device is dated by when it was drawn.** It
  was dated by the save, which is days later for a drawing picked up again from arşiv.
- **The unsaved twin is dropped.** A drawing kept here and the round it was saved as are
  the same twenty pictures; the copy outlived the save whenever the device could not
  write at the moment the round got its code. The record alone cannot match them — a
  saved round keeps no words on the device — but the archive fetches them to paint its
  thumbnails, so the pair is recognised there and the copy goes. Saving a round now
  drops any older copy of the same drawings as well, so no new pair is made.

The ones already on a device go as arşiv reads them, which is to say as they are
scrolled past. Checked both ways round: fetched fresh and already cached.

## 2026-09-28 — a name on the way in, and three smaller things

- **A friend's link asks for a name before the guessing**, on the kolay/zor screen, when
  the device has none. That round ends on a score board, and asked afterwards it was a
  field under a score nobody was looking for any more, so the round went up under nobody.
  The name travels with the choice: one tap, not a second screen. Both games, since a
  daily round opened from a friend comes through the same screen.
- **`görseli kaydet` is `cevaplarımı kaydet`**, and it sits under the drawings it is
  about rather than at the foot of the screen among the ways out. Hidden on a round that
  has not been guessed yet, where there are no answers to keep.
- **`ekranı temizle`** on the drawing screen, between the clock and the paper: a scribble
  that went wrong can be started again without losing the word. The clock runs on.
- **The 3-2-1 is centred again.** Making the scrolling element full width gave every
  child of a screen the full width too, and the countdown had been centred by being only
  as wide as the number. It centres the number inside its box now.

## 2026-09-28 — arşiv keeps its order

Reported: the rounds in arşiv shuffled instead of staying newest first.

They were in order — the order was just of the wrong thing. A round's `at` was restamped
on every write to its record, and nearly everything writes there: an answer typed, a link
opened a second time, a mode chosen, a score posted. So `at` meant last touched, and
opening an old round moved it to the top of the list and relabelled it with today's date.

- `at` is now set once, when the record is made, and left alone. The 30-day drop and the
  newest-40 limit are measured by it too, and the server expires a round 30 days after it
  was saved, so the day it was made is the right mark for those as well.

Rounds already on a device carry a last-touched stamp and keep it; from here they stop
moving. Checked: touching the oldest round leaves both its place and its date alone, a
new round still gets today, and unsaved drawings sit among them by their own date.

## 2026-09-28 — the renamed row came back, and stayed

The screen fix earlier today was only half of it: the duplicate was also being written
down. The owner's board showed `bsk` and `basak`, same score, same time — while the
per-player keys held one row, `bsk`, with the token and the finishing time carried over
from `basak`. The server had moved the row correctly. The summary every reader gets had
two.

The repair path put it there. A read of a summary older than five minutes rebuilds the
board from the keys and merges it with the summary, keeping whoever either source has —
and the summary it reads can be a cached copy from before the rename, while the listing
can still be carrying the key the rename deleted. Merging those two put `basak` back and
wrote it down, and from then on every reader saw it.

- **A repair now takes the keys as they stand.** Writing a row writes the summary in the
  same request, so when a repair runs every row that belongs has been listable for
  minutes: a name the keys do not have has gone.
- The merge still stands when the listing hits its 200-row limit, and an empty listing
  never overwrites the summary — the two cases the old guard was there for.

Checked against the exact state: a day-old summary saying `basak` beside keys saying
`bsk` wrote `basak, bsk` before and writes `bsk` now. The live board was rewritten by
hand to match its keys.

## 2026-09-28 — one score, not two, when the name changes

Reported: changing a name made the score appear twice in günün skorları.

Nothing was wrong with the stored board — every row on the live boards has its token and
the server moves a row correctly. The duplicate was on screen. `renderScores` always adds
this device's own row, since a freshly written score may not be listed yet; after a
rename the board in hand still carried the old name, so the old row and the added one sat
there together, the same score and the same time twice. It lasted as long as the re-post
took — and a poll in the meantime brings back the summary, which readers get from a
half-minute cache, so it could keep coming back.

- The name the row was written under is now held back until a board arrives without it,
  on that board only and for at most a minute, so a different player who happens to hold
  that name is not hidden.

Reproduced with the network slowed to 2.5 seconds a request: two rows before, one
throughout after, and another player's row under the old name stays visible.

## 2026-09-28 — the picture can reach the photo library

Reported: on an iPhone the saved picture went to Dosyalar and never appeared in the
gallery. No page may write to the photo library, but the share sheet may, through
`Fotoğraflara Kaydet` — and the same sheet sends the picture straight to a chat, which
is what it is usually wanted for.

- A device with a touch screen whose `navigator.canShare({files})` says yes is offered
  the sheet; everything else keeps the download, which is what a mouse and a downloads
  folder expect.
- Closing the sheet is an answer: nothing is downloaded behind it. Any other refusal
  means the sheet never opened, so the file is handed over as before.
- The buttons are `görseli kaydet` and `bu çizimi kaydet` now, since on a phone they no
  longer only download.

## 2026-09-28 — the name is asked where it is used

The card that asked for a name right after the first round drawn is gone. It asked
before the answer was needed, and a player who never shares a round and never joins a
board has no use for a name at all.

- **Nothing is asked after drawing.** The name is wanted on the share screen, which now
  asks whenever the device has none, and on the result screen to join a board.
- A round played alone is saved with an empty name and its share text carries none.

## 2026-09-28 — a round that went out under somebody else's name

Reported: a friend opened a shared link, played it, drew a round of his own and sent it
back — and it arrived as the *link owner's* round, under her name. He was never asked
for his.

Reproduced end to end. He pressed `sen de çiz` from her result screen, drew his twenty,
and the card asking for a name opened over the between screen. A back step from there —
the phone's own button — did two things at once: the card stayed up, because history
navigation closed four of the cards on top of the game and not that one, and the screen
underneath went back into **her** round. `paylaş` on that screen sends the round on
screen, so it sent hers, under her name, with her link.

- **Everything on top of the game comes down with a step through history**
  (`closeOverlays()`): the six cards, the word pool, the answer card and the zoom.
- **Back from the between screen goes to the start screen**, not into the round the
  player came from. Twenty drawings have happened since; stepping into the earlier round
  swapped what they were holding for somebody else's. The drawings stay in arşiv,
  labelled `çizdim — henüz kaydedilmedi`.
- **Sharing asks who you are whenever the device has no name**, even for a round already
  saved. Guessing saves a round on its way in under whatever name the device has — none,
  for somebody who has never given one — and the share screen then handed over the link
  without asking. The name goes onto the round already saved, not onto a second copy.

Checked after the fix, on the same path: back lands on the start screen with the card
closed and nothing of her round left in hand, his drawings are in arşiv, and sharing his
round asks for his name and sends his own link under it. Her round is untouched. The
board's rename protection was checked at the same time and is sound: the round endpoint
takes an owner token, and a guesser never renames what they are guessing.

## 2026-09-28 — scrolling from anywhere, and a card that stays put

Two things reported from a desktop and a phone.

**The page would only scroll from the middle.** The game is a 600px column down the
centre of the window, and that column was the scrolling element: on a desktop or an iPad
everything either side of it was the body, which does not scroll, so the wheel did
nothing there. The screen is now the full width of the window, and what sits inside it is
what is held to 600px and centred. The side gutters moved from `#app` to `.screen` so the
scrolling element reaches the edge of the glass. Nothing moved on a phone: the content is
343px wide between 16px gutters, as before.

**The drawing jumped when a word was typed.** In kelimeler gizli the answer card sized
its preview against the window, which the keyboard does not change, so the card came out
taller than the room it had and scrolled — and the browser bringing the focused field
into view took the drawing up with it. The preview is sized from the space the keyboard
leaves instead, and that height is remembered while the phone is held the same way round,
so the second card onwards opens at the size it will keep. Measured with the keyboard
faked at 340px: the card no longer overflows, and the drawing holds at 179px across the
keyboard opening where it used to be resized and scrolled.

## 2026-09-28 — the round as a picture

A round is twenty drawings and what everyone made of them, and until now the only way
to keep it was a screenshot — which gets the grid in pieces, because it scrolls, and
brings the browser along with it.

- **`görsel olarak indir`** on the result screen: the whole round as one PNG. Four
  across, five down, each drawing on its paper square with its number, the answer given
  struck through in red where it was wrong, and the word in green under it.
- **`bu çizimi indir`** in the zoom: one drawing on its own, with the answer and the
  word. Before the round is guessed it goes out without the word, as the zoom does.
- Both are drawn on a canvas in whichever theme is on, headed the way the result screen
  is and footed `chizz.party`. Twice the size for sharpness: 2172 × 3760, about 470 KB.
- Encoding takes about a second, so the button holds and says `hazırlanıyor…` rather
  than appearing dead.

## 2026-09-28 — a full phone no longer loses your round

Reported: a player drew the day, sent her link, and then her own link opened as if it
were a stranger's and stopped at `önce sen çiz`; a friend's link did the same. Her
drawings were on the server the whole time -- her phone had simply stopped recording
anything, and nothing said so.

`saveStore` wrote once and swallowed the failure. When `localStorage` is full or
refused, everything that says a round is yours goes with it: `days[N].drawn`, which is
what `önce sen çiz` reads; `rounds[CODE].mine`, which is how your own link is known to
be yours; and `scoreToken`, which is what moves your row on a board when you change
your name instead of adding a second one.

- **A write that does not fit now sheds and retries**: unsaved rounds oldest first, then
  the pictures kept against a day, then all but the newest 5 rounds. The round being
  played is never shed.
- **A device that cannot write at all says so** on the share screen, where the link is.
- Measured: a round of drawings is 15 KB sparse, 44 KB typical, 132 KB busy, and the 40
  unsaved rounds the app was willing to keep came to 5.2 MB -- past what a phone allows.

Reproduced before the fix and confirmed after, on a device with writes capped: the day
stays drawn, the round stays yours, the token survives, and two name changes in a row
leave exactly one row on the board. The boards themselves were never at fault: given
the token they move a row correctly, and without it -- only ever because the device had
forgotten -- they cannot tell two players apart.

## 2026-09-27 — nasıl oynanır on demand

The loop showed itself once, to a device that had never played, and after that there
was no way back to it. `nasıl oynanır?` now sits at the top of the start screen beside
`sorun bildir` and opens the same dialog whenever anyone wants it.

- The picture's `src` is set again on every open, so the loop always starts at its first
  step. A gif left to itself carries on where it stopped.
- Opening unasked is unchanged: still once, still only for a device that has never
  played, still never over a round.
- `docs/DEPLOY.md` now says `--branch production`. Without it, a deploy from `main`
  succeeds as a preview at `main.chizz.pages.dev` and chizz.party does not move -- which
  is what happened on the first deploy of this day's work.

## 2026-09-27 — the day's words are deferred, not held back

sınırsız used to keep the daily game's next 280 words out of its own rounds entirely,
for any device that had played the day on 2 days in 14. That kept the daily round
pristine and made sınırsız pay for it: 8.2 of its 20 words were repeats. The rule is
now softer and applies to everyone.

- The day's 20 for today and each of the next 13 are **dealt last among the words this
  device has not seen**, and still ahead of any word it has. A family reaches them only
  when it has nothing fresher, so nothing is starved.
- **A sınırsız round is never the same 20 as a daily day**, in the 14 days either side.
  It happened about once in a thousand rounds, when a family is down to exactly ten
  words it can deal; the last word now gives way to the next one along, never a bird.
- The **2-days-in-14 threshold is gone**. With no starvation to avoid there is nothing
  to gate, and a sınırsız-only player measures the same either way.

For someone who plays the day and one round a day, repeated words out of 20: sınırsız
**8.2 → 0**, the daily round 0.1 → **2.7**, so 8.3 a day becomes 2.7. The first repeat
moves from day 6 to day 15. Dropping the rule altogether instead would have put 8.6 of
the daily round's 20 in repeats, which is the round everyone shares, so deferring beats
both. Heavy play is limited by the pool, not the rule: 713 words cannot feed 60 fresh
ones a day.

## 2026-09-27 — the 48 new words come back out

The owner has not ruled on them, so they are simply gone from the pool -- out of
`words.json`, out of `DAILY_POOL` and out of the subject categories. **Nothing went on
the banned list**: these words are undecided, not rejected, and can come back.

- The **16 family moves** from the entry below stay. They are not new words, and they
  keep every family coming up every 6.7 to 9.5 days.
- The pool is **713 words**, families 32 to 85.
- What the words were buying, measured again: days on which two families can field ten
  words unseen for 14 days 81% → **19%**, and repeated words per sınırsız round for a
  player of the daily game plus one round a day 2.1 → **8.2**. The daily game itself is
  unaffected (0.1), and sınırsız alone up to two rounds a day still repeats nothing.

## 2026-09-27 — feeding the small families

Taking 36 words out had cost far more than its size: for a player of the daily game plus
a sınırsız round a day, repeated words went from 1.6 to 9.2. The reason is that the rule
is per family -- a round needs two families each able to field ten words unseen for 14
days -- and the words removed fell on the families that had the least to spare. Measured
over 60 days of that play: days on which two families could field ten fell from 88% to
**14%**.

- **48 words added**, all aimed at ring, radial, oval, domed, handled, striped and
  figure. Sibling words are allowed now, on the owner`s word: kral gets kraliçe, and the
  jobs that draw as a person with a prop (hemşire, pilot, denizci, garson, hakem,
  postacı, çiftçi, prens, prenses) come in with it.
- **16 words moved** to a family that fits their shape as well as the old one: tekerlek,
  plak and tef to ring; güneş, ahtapot and gül to radial; şemsiye, kar küresi and turta
  to domed; çekiç, fırça, diş fırçası, spatula, maşa and süpürge to handled; tarak to
  striped. Moving costs no vocabulary and buys the same thing, since the limit is per
  family.
- The pool is **761 words** and the families run 39 to 85, where they ran 29 to 85.

Days when two families can field ten: 14% → **78%**. Repeated words for the daily game
plus a sınırsız round a day: 9.2 → **2.1**. sınırsız alone still repeats nothing up to
two rounds a day. Every family now comes up every 7 to 9 days, where round had drifted
to 6.5 and ring to 10.4.

## 2026-09-27 — nasıl oynanır, once, for a new player

A device that has never played now sees how the game goes the first time it reaches the
start screen: `nasıl oynanır?`, a nine-second loop, and `anladım`.

- The loop is three steps of three seconds, drawn from a real round (DJTL): a word arrives
  and is drawn against the clock; a word written instead of drawn gets a red sign, then
  the drawing done properly; the drawings come back as a grid and a word is matched to one.
- "Never played" is read from what the device already keeps: no name, no word dealt, no
  day, no round drawn or guessed, no unsaved drawing. Nobody who was already playing sees it.
- Closing it (`anladım`, or a tap outside) is stored as `howSeen`. It never opens over a
  round, so a friend's link still lands on its round.
- `public/how-to-play.gif` is about 430 KB and is only fetched when the dialog opens.

## 2026-09-27 — 36 words out, three under a new name

A pass by the owner over the list as it stands. The pool is **713 words**.

- Out and on the banned list: zambak, çark, mala, örs, rulo, sera, sütun, iletki, arp,
  baget, ksilofon, yumak, bileklik, beton mikseri, buldozer, kronometre, kürsü, matara,
  yelken, hurma, ayva, enginar, akbaba, ateş böceği, kanarya, kokarca, mercan, rakun,
  çan, kapak, kapsül, koltuk değneği, makara, semaver, soyacak, tas.
- `matara` went and `termos` stayed; `yelken` went and `yelkenli` stayed.
- Kept under a clearer name: `oyun kağıdı` → **iskambil**, `pota` → **basketbol potası**,
  `blender` → **mikser**. `mikser` had been turned down on 26 Sept for drawing like
  `blender`; it comes off the banned list as the name that stays.
- Two birds fewer: akbaba and kanarya. The bird list is 19, still capped at two a day.

The cost: for a player of the daily game plus a sınırsız round a day, repeated words went
from 1.6 a round at 749 words to **9.2** at 713. The pool sits just under the size that
clears that case, so every word removed there is felt. sınırsız alone, up to two rounds a
day, still repeats nothing.

Days 1 to 20 frozen first; checked over 1,100 days.

## 2026-09-27 — the pool sorted by subject

`docs/CATEGORIES.md` shows all 749 words under the owner`s twenty subject headings --
household, animals, food, sports, vehicles, places, clothing, weather, people, hobby,
body, holidays, myth, school, buildings, tools, plants, toys, shapes -- with the Turkish
name of each heading beside it, for the day a player picks a subject to draw from.

- The data is `docs/categories.json`; the readable file is written by
  `tools/make-categories.js`.
- `tools/check-categories.js` fails if a pool word is in no category, is in two, or is in
  a category but not in the pool -- the same mechanical guard the banned list has.
- **Common Actions & Verbs is empty and stays empty.** A round is twenty things to draw
  and match back, and every action drew as the same stick figure.
- Largest: ev eşyaları (153), hayvanlar (108), yiyecek ve içecek (83). Smallest:
  kutlamalar (8).

## 2026-09-27 — 76 words of my own, picked over by the owner

With the owner`s 1,100 English words spent, I proposed 108 of my own: 48 I was confident
about and 60 I had doubts about, each doubt written out. The owner kept 45 of the first
and 31 of the second. The pool is **749 words**.

- Everything turned down is on the banned list -- 34 words, including three of my own
  confident ones (faraş, çıngırak, karanfil) -- so it cannot be proposed again.
- Two words left the pool for a clearer twin: `tartı` for `terazi`, `can simidi` for
  `deniz simidi`. Both are on the banned list under the name that went.
- Two came in under a shorter name: `uçan daire` as **ufo**, `tek boynuzlu at` as
  **unicorn**.

1,100 was the target and it is not reachable at this quality: after 675 words the
everyday Turkish nouns are spent, which is why the owner`s own 1,100-word list yielded
216. What 1,100 was meant to buy is mostly bought already -- for a player of the daily
game plus a round of sınırsız a day, repeated words fell from 11.5 a round to 1.6.

Days 1 to 20 frozen first. Checked over 1,100 days: unchanged days, no word back inside
14 days, at most two birds, every word dealt, families every 6 to 9 days.

## 2026-09-27 — 48 more words, from the second 300

The second batch of the owner`s list, words 801 to 1100, run through the same pass. The
pool goes 627 -> **675 words**, still 15 families.

- **41** were already in, **96** were another name for a word already in (vapur for gemi,
  ekskavatör for buldozer, çakal for kurt), **28** were verbs.
- **67** are hard to draw in seconds or impossible to tell apart, **7** have no short
  Turkish name.
- **13** are on the banned list, two of them by carrying a banned word inside a longer
  name: çanak anten (çanak) and dama (dama tahtası).
- **48** were added, among them a first set of make-believe figures — deniz kızı, cadı,
  uzaylı, balerin, mağara adamı, kurabiye adam — and kanarya, the 21st bird.

Days 1 to 20 were frozen again before the change. Checked over 1,100 days: unchanged
days, no repeat inside 14 days, at most two birds, every word dealt. A player of sınırsız
alone now repeats nothing at two rounds a day.

## 2026-09-27 — 168 words, and a family for people

An 800-word English list from the owner, translated, checked against the pool and the
banned list, and sorted by silhouette. The pool goes from 459 to **627 words**.

- **306** were already in, under their Turkish names.
- **154** were another name for a word already in (`palto` for `ceket`, `metro` for
  `tren`, `kutup ayısı` for `ayı`).
- **67** were verbs, which this game cannot deal: a round is twenty nouns to draw.
- **93** are hard to draw in seconds or impossible to tell from a word that stays, and
  **5** have no short natural Turkish name. Both lists are in the reply, not in the pool.
- **7** are on the banned list: papağan, pelikan, karga, erik, kereviz, sal, and
  clipboard, whose Turkish name carries the banned `pano`.
- **168** were added.

### A fifteenth family: figure
A standing human outline -- astronot, korsan, kral, palyaço, gelin, iskelet, robot,
kardan adam, oyuncak ayı -- where one person is told from another by what they hold or
wear. `insan` and `heykel` moved in from `vertical`, where they read as poles.

Days 1 to 20 were frozen before the pool changed, so nobody`s finished day moved.
Checked over 1,100 days: those days unchanged, no word back within 14 days, never more
than two birds, every word dealt at least once, families coming up every 6 to 11 days.
Repeats for a player of sınırsız alone at 2 rounds a day: 14.8 words a round before,
0.1 now.

## 2026-09-26 — the day's two boards, and a sınırsız score that reached them

Two sınırsız players turned up on günün skorları while the owner's parents were testing.

- **The leak:** opening the day's board set `isDaily`, the flag that says the round in
  memory belongs to the day. Nothing set it back, so a step back onto a sınırsız result
  rebuilt that result with the flag still on and posted its score to the day. Reproduced
  against the previous build -- `[daily] 19 Baba 10` for a free round -- and not
  reproducible against this one.
- **The fix:** the board screen keeps its own day, mode and rows and touches nothing the
  game holds, and a score reaches the day's board only when the day is on record as drawn
  on this device.
- **kolay and zor are separate boards.** They are different games, so one table ranked
  them against each other. `günün skorları` now asks which table to open, and the daily
  round is asked kolay or zor after its drawing like any other round. Scores written
  before the split stay on the zor board, which keeps the original keys.

## 2026-09-26 — kolay or zor, asked after the drawing

The two modes sat on the start screen, above a game they say nothing about: they decide
how the round is **guessed**, and a round sent to a friend never used the choice at all,
since whoever opens it is asked anyway.

- The cards are gone from the start screen, which now holds the day, the time slider,
  başla and a code to join.
- The same question appears on the way into guessing -- after drawing your own round, and
  when opening a friend's -- and is asked every time rather than remembered.
- The cards are labelled for what the choice is: **kolay** (kelimeler açık, "kelimelerle
  çizimleri eşleştir") and **zor** (kelimeler gizli, "çizimlerin ne olduğunu kendin yaz").
- The day is not asked: it is `typed` for everybody, or its board would compare
  different games.
- The drawing screen's header shows the seconds alone, the mode not being chosen yet.

## 2026-09-17 — sorun bildir

The feedback button and dialog title read `sorun bildir` instead of `geri bildirim`, and
the note under the text box reads `ekran ve cihaz bilgileri otomatik olarak eklenir`.

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
