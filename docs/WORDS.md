# Word pool

Every word the game knows, tagged by the silhouette it draws as. This is the source
the **daily puzzle** generates its sets from. It is not the hand-made sets in
`public/index.html` — free play keeps using those.

The data is in [`words.json`](words.json). The generator that turns a date into twenty
words lives in `public/index.html`, next to the pool it reads.

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
| `round` | a closed circle: balls, fruit, faces, clock faces | 35 |
| `vertical` | tall and narrow, standing up: poles, bottles, trees, towers | 35 |
| `handled` | a body with a stalk or handle: cups, jugs, tools you hold | 32 |
| `winged` | wings out to the sides: birds and insects | 31 |
| `peaked` | a triangle or cone, pointed at the top: hats, mountains, sails | 30 |
| `striped` | repeating parallel lines or a grid: fences, barcodes, nets, keyboards | 30 |
| `domed` | an arc over a base: rainbows, tunnels, shells, bowls | 26 |
| `ring` | a closed loop with a hole: bracelets, tyres, chains | 26 |
| `radial` | spokes or rays leaving a centre: fans, flowers, fireworks, wheels | 24 |
| `oval` | small and egg-shaped: seeds, nuts, pebbles | 22 |

**449 words.** Checked: no word is in two families, none of the 39 removed words is
back, and every word the free game uses is in here.

Ten were added to give `domed` and `ring` room to breathe — `bere`, `midye`,
`deniz kabuğu`, `mağara`, `semer`, `beşik` and `kapak` to `domed`; `çelenk`, `kement`,
`makara`, `bant` and `çengelli iğne` to `ring`. `alyans` was the obvious ring and was
rejected: it draws identically to `yüzük`.

Two more were corrections rather than additions. `yüzük` and `simit` moved from `round`
to `ring` — both are circles with a hole through them, which is what `ring` means; they
were only in `round` because that is the half of a hand-made set they happened to sit
in.

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
from 8 to 14 costs exactly the same, so anything below 14 gives away freshness for
nothing.

It also makes 15 the worst number on the board: it pays the full price of 21 — a third
batch from every family — and buys six fewer days. If the window is ever raised, the
number to raise it to is **21**, which would need roughly 30 more words spread across
`oval`, `radial`, `domed` and `ring`.

## Why the words inside a family are shuffled

Holding the rule is not enough on its own. Taking the ten *least recently used* words
each time satisfies it perfectly and still produces a bad game: a family of 30 dealt 10
at a time has only three possible groupings, so the same ten words keep arriving
together and players notice.

So the families rotate strictly oldest-first — that is what pins the cycle at seven
days and makes the rule provable — but the words inside are **shuffled among everything
currently eligible**, with a seed derived from the day number so every device produces
the same set forever.

The difference, measured over three years:

| | distinct 10-word groupings per family |
|---|---|
| strictly oldest-first | 3 – 8 |
| shuffled among the eligible | **152 – 157** |

Three years simulated, 21,900 word placements: **zero violations, closest repeat
exactly 14 days**. The rule binds tightly rather than comfortably, which is the point —
every word is back in play the moment it is allowed to be.
