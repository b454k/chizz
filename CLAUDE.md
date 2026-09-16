# chizz

A Turkish drawing-memory game: 20 words, a few seconds each to draw, then match the
drawings back to the words. One HTML file plus Cloudflare Pages Functions.

## Before proposing or adding any word

Read **`docs/BANNED-WORDS.md`** first. Those words have been rejected by the owner and
never go back — not into the daily pool, not into the hand-made sets, not into a
proposal. Then run:

```bash
node tools/check-words.js
```

It fails if a banned word is in play or a word sits in two silhouette families.

## Before deploying

```bash
node tools/check-day-epoch.js
```

The daily clock exists twice — `lib/day.js` for the server, a copy inside
`public/index.html` for the client — and if they drift, the two disagree about what day
it is with nothing reporting the problem.

## House rules

- **Never commit the real KV namespace id.** `wrangler.jsonc` carries
  `PUT_YOUR_KV_NAMESPACE_ID_HERE`; the real id goes in only for a deploy and comes out
  immediately after.
- **Never add a licence file.**
- **Scan for secrets before every commit** — tokens, keys, account ids, the owner's
  email or personal details. Stop and report if anything turns up.
- All interface text is **lowercase**. Round codes and names people type are data and
  keep their capitals.
- The page loads nothing from outside: no frameworks, no fonts, no CDN.
