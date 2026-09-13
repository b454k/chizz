# Changelog

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
