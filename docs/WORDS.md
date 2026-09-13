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
| `domed` | an arc over a base: rainbows, tunnels, shells, bowls | 20 |
| `ring` | a closed loop with a hole: bracelets, tyres, chains | 20 |

**439 words.** Checked: no word is in two families, and every word the game currently
uses is in here.

Two of those were added to reach the rule below — `bere` to `domed`, a beanie being a
clean two-stroke dome, and `çelenk` to `ring`, a wreath being a ring of leaves.
`alyans` was the obvious ring and was rejected: it draws identically to `yüzük`, which
is already in `round`.

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

## The repeat rule: no word inside 14 days

A daily set is 10 words from one family and 10 from another. With 14 families and two
used a day, **each family comes round every 7 days** however evenly you schedule it.
That single number decides everything else.

A word used today must not return inside the window. Its family comes back every 7
days, so the family has to supply that many *fresh* batches of 10:

| window | fresh batches needed | words per family |
|---|---|---|
| 8–14 days | 2 | **20** |
| 15–21 days | 3 | **30** |
| 22–28 days | 4 | **40** |

The cost is a staircase, not a slope, and **14 is the top of its step**. Every window
from 8 to 14 costs exactly the same, so anything below 14 is giving away freshness for
nothing.

It also makes 15 the worst number on the board: it pays the full price of 21 — a third
batch from every family, 36 new words — and buys six fewer days. If the window is ever
raised, the number to raise it to is **21**.

Simulated over three years, 21,900 word placements, with the two families that were a
batch short topped up:

```
violations:     0
closest repeat: 14 days apart
```

Exactly 14 at the closest, which is the rule binding tightly rather than comfortably —
`domed` and `ring` sit at 20 words with no slack. Any word removed from either family
breaks the rule, and any word added to either is pure headroom.

## If the window is ever raised to 21

Four families would need topping up to 30: `radial` +6, `oval` +8, `domed` +10,
`ring` +10. **34 new words**, and they have to be genuinely drawable and genuinely
that shape, or they weaken the family they join.

There is a cheaper route that needs no new words: **more families**. `boxy` at 43
could shed a "flat and wide" group, `horizontal` at 39 an "animal" group. More
families means each one comes round less often than every 7 days, and a longer cycle
needs fewer words per family for the same window.
