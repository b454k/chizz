# Word pool

Every word the game knows, tagged by the silhouette it draws as. This is the source
for **generating daily sets**. It is not the hand-made sets in `public/index.html` —
free play keeps using those, and the daily gets its own.

The data is in [`words.json`](words.json). This file explains what is in it and what
the numbers say about running a daily from it.

---

## Where the tagging came from

It was not invented. The thirty hand-made sets already encode it: every set pairs two
silhouette families and names them in its source comment, so which half of a set a
word sits in tells you its shape. The tags were read back out of the sets.

That matters, because the silhouette principle **is** the difficulty design. Two
families that are easy to tell apart, so the player feels they have ruled out half the
grid immediately; then the real work happens inside a family, where a `fil` and a
`kanepe` are the same rough shape and the drawings collide. A generator that ignored
families would produce twenty unrelated words and a much easier, much duller game.

Family names are English because they never reach a player — they are a design tool,
not game text. (The set comments in `index.html` still carry the old Turkish labels,
in inconsistent spellings: `köşeli` and `koseli`, `üçgen tepeli` and `ucgen`. Worth
tidying at some point.)

## The fourteen families

| family | the shape | words |
|---|---|---:|
| `boxy` | a rectangle with corners: boxes, screens, books, bags | 43 |
| `horizontal` | long and low, wider than tall: vehicles, big animals, furniture | 39 |
| `curved` | a flowing curve with no corners: clouds, hearts, snakes, body parts | 38 |
| `stick` | a long thin rod: pens, tools, cutlery, fish | 38 |
| `round` | a closed circle: balls, fruit, faces, clock faces | 37 |
| `vertical` | tall and narrow, standing up: poles, bottles, trees, towers | 35 |
| `handled` | a body with a stalk or handle: cups, jugs, tools you hold | 32 |
| `winged` | wings out to the sides: birds and insects | 31 |
| `peaked` | a triangle or cone, pointed at the top: hats, mountains, sails | 30 |
| `striped` | repeating parallel lines or a grid: fences, barcodes, nets, keyboards | 30 |
| `radial` | spokes or rays leaving a centre: fans, flowers, fireworks, wheels | 24 |
| `oval` | small and egg-shaped: seeds, nuts, pebbles | 22 |
| `domed` | an arc over a base: rainbows, tunnels, shells, bowls | 19 |
| `ring` | a closed loop with a hole: bracelets, tyres, chains | 19 |

**437 words.** Checked: no word is in two families, and every word the game currently
uses is in here.

## The fourteen words that had to be decided

These sat in two different families across the hand-made sets, because each really
does read as two shapes. The tie was broken by what a three-stroke drawing actually
looks like, since that is all a player ever sees.

| word | chosen | why |
|---|---|---|
| `abajur` | `peaked` | a lampshade is a truncated cone, not an upright |
| `çerçeve` | `boxy` | a frame is a rectangle outline; striped is for repeating lines |
| `çiçek` | `radial` | petals come off a centre, like `papatya` and `ayçiçeği` |
| `kaplumbağa` | `domed` | the shell is the silhouette; the legs barely register |
| `klavye` | `striped` | a grid of keys |
| `köprü` | `domed` | drawn as an arch far more often than as a flat deck |
| `kürek` | `handled` | a shaft with a blade is the definition of the family |
| `limon` | `oval` | a lemon is an oval; `round` is for circles |
| `papatya` | `radial` | petals off a centre |
| `piyano` | `striped` | the keys are the recognisable part |
| `termos` | `handled` | that family is really vessels: `bardak`, `kavanoz`, `matara` |
| `tuğla` | `boxy` | one brick is a rectangle; brickwork would be striped |
| `uçurtma` | `peaked` | a diamond on a string; it flies but has no wings |
| `vazo` | `handled` | a vessel, like `termos` |

---

## What the pool can and cannot sustain

A daily set is 10 words from one family and 10 from another. With 14 families and two
used a day, **each family comes round every 7 days** however evenly you schedule it.
That number drives everything.

A word used today must not return inside the window. Since its family comes back every
7 days, the family has to supply enough *fresh* batches of 10 to cover the gap:

| rule | batches a family must cover | words it needs |
|---|---|---|
| no repeat within 13 days | 2 | 20 |
| **no repeat within 14 days** | **2** | **20** |
| **no repeat within 15 days** | **3** | **30** |

15 is the expensive side of a boundary. It is one day past two family cycles, so it
forces a third full batch out of every family.

Simulated over a year, 7,300 word placements:

```
window 13 days ->  102 violations
window 14 days ->  102 violations   (domed and ring only, one word short each)
window 15 days -> 1702 violations   (domed, ring, oval and radial all short)
```

So:

- **At 14 days** the pool works as it stands apart from two families that are one word
  short. Add a single `domed` word and a single `ring` word and it runs clean.
- **At 15 days** four families need topping up to 30: `domed` +11, `ring` +11,
  `oval` +8, `radial` +6. **36 new words**, and they have to be genuinely drawable and
  genuinely that shape, or they weaken the family they join.

A third option avoids new words entirely: **more families**. Splitting the larger
families — `boxy` at 43 could give up a "flat and wide" group, `horizontal` at 39 an
"animal" group — lengthens the cycle beyond 7 days, and a longer cycle needs fewer
words per family for the same rule.

None of this is urgent for launch: thirty hand-made sets already cover the first month
of free play, and the daily only starts eating the pool when it ships.
