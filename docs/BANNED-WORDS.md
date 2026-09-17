# Banned words

Words the owner has rejected. **They never go back into the game** — not into
`docs/words.json`, not into the pool in `public/index.html`, and not into a proposal. Read this file before suggesting any new word.

`tools/check-words.js` enforces it. Run it after touching either word list:

```bash
node tools/check-words.js
```

It fails if a banned word is anywhere in the pool, and it fails if a word
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

## Rejected 2026-09-17 — replaced

semer, kement, selvi

Replaced in the same family: `semer` → `askılık`, `kement` → `balon balığı`,
`selvi` → `pırasa`.

## Rejected 2026-09-17 — the same thing as a word that stays

kanepe, demiryolu

`kanepe` draws and means the same as `koltuk`, and `demiryolu` the same as `ray`.
Only one of each is kept.
`kanepe` and `koltuk` used to be kept out of the same round by the generator.
That rule went with `kanepe`.

## Renamed, not banned

These were kept under a clearer name, so the old spelling should not come back either:
`feribot` → `gemi`, `kemer tokası` → `kemer`, `zebra geçidi` → `yaya geçidi`,
`kek` → `pasta`, `çörek` → `donut`, `değnek` → `sihirli değnek`.
