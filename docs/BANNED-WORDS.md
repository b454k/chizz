# Banned words

Words the owner has rejected. **They never go back into the game** — not into
`docs/words.json`, not into the hand-made sets in `public/index.html`, and not into a
proposal. Read this file before suggesting any new word.

`tools/check-words.js` enforces it. Run it after touching either word list:

```bash
node tools/check-words.js
```

It fails if a banned word is anywhere in the pool or the sets, and it fails if a word
appears in two families. Being mechanical is the point: this list exists because
`planör` was removed in September and proposed again a few days later, from memory.

## Rejected 2026-09-11 — too obscure, too hard to draw, or too alike

Removed from the hand-made sets and replaced with simpler words in the same silhouette
family. See the commit `Simplify 39 words out of the sets`.

gönye, dilim, kama, mızrak, şiş, jaluzi, hasır, papağan, ibrik, güğüm, fırıldak, jant,
karahindiba, rugby topu, miğfer, çanak, çember, erik, greyfurt, kereviz, poster, pano,
kartpostal, rozet, nohut, komodin, pompa, porte, tel örgü, tırabzan, koli, planör,
şahin, pelikan, sal, dama tahtası, panjur, kırlangıç, karga

## Rejected 2026-09-16 — proposed for `winged`, turned down

zeplin, planör, jet, kanatlı at, uçan balık, eşek arısı, cırcır böceği,
peygamber devesi, mayıs böceği, savaş uçağı, model uçak

`planör` is on both lists: it was rejected in September and proposed again here, which
is what this file is for.

## Never in the same round

Some words are fine on their own but not together: they draw as the same shape, so a
grid holding both asks the player to tell apart two drawings that never differed.

- `kanepe` and `koltuk`

The generator enforces this (`DAILY_NEVER_TOGETHER` in `public/index.html`), and it is
recorded in `docs/words.json` under `rules.neverTogether`. A day is twenty words, so if
honouring a pair would leave the day short — which needs the family to be nearly
exhausted — the twenty wins and the pair gives way.

## Renamed, not banned

These were kept under a clearer name, so the old spelling should not come back either:
`feribot` → `gemi`, `kemer tokası` → `kemer`, `zebra geçidi` → `yaya geçidi`,
`kek` → `pasta`, `çörek` → `donut`, `değnek` → `sihirli değnek`.
