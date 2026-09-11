# Changelog

## 2026-09-11 — current state

First entry. Records where the project stands at the point it was put on GitHub,
rather than reconstructing the history that came before it.

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
  namespace bound as `OYUNLAR`.
- Static assets are served from `public/`, so `README.md`, `basla.cmd` and
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
