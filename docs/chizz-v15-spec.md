# Drawing Memory Game — v1.5 Spec (Difficulty + 10 Sets + Duel Mode)

> **Historical document.** The second design brief for what became Chizz, translated
> from Turkish. It describes the v1.5 plan, not the current code — see [SPEC.md](SPEC.md)
> for what the game actually does now, including a table of where the two disagree
> (there are now 30 sets, not 10; the difficulty names changed; the score board that
> this document rules out was later built). Nothing here has been updated or corrected.
> Word lists are reproduced verbatim, since they are the game's Turkish content.

> v1 works. This file defines the changes to be layered on top of it. Where they
> conflict, **this file wins**.

## What we are fixing

1. **The game is too easy.** People score 20/20 on Normal. The reason: the game
   measures the order rather than the drawings, and because the word pool is visible it
   is a recognition test rather than a memory test.
2. **Choosing the set breaks the game.** Seeing the set's name lets the player predict
   which words are coming.
3. **There are only 4 sets**, so on replaying the words feel familiar.
4. **There is no social loop.** You cannot send your drawings to a friend and have them
   guess.

---

# A. Flow and difficulty changes

## A1. Shuffled grid (every mode, no exceptions)

**This is not a difficulty setting, it is a bug fix.**

On the recognition screen the 20 drawings are shown **shuffled**, not in drawing order.

- The shuffle happens once and stays fixed for the round
- Cell numbers are not shown — a number is a hint about the order
- The result screen uses the same shuffled layout

Right now the player remembers "the 3rd word was the sun" and does not even look at the
drawing. This fix ends that.

## A2. Set selection removed

The set list is **not shown** on the home screen; the player cannot choose a set.

- When a round starts, one of 10 sets is chosen **at random**
- The set's name and its silhouette logic are never shown to the player anywhere
- The same set does not come up twice in a row in one session (keep the last set in a
  variable)
- On the result and in the share text, use only a neutral label: `Set 7`. That way
  friends can compare the same set without the silhouette logic leaking

What is left on the home screen is **difficulty** and **start**.

## A3. Four difficulty levels

| Level | Per word | Answer method | Grid |
|---|---|---|---|
| Easy | 4 s | Pick from the word pool | Shuffled |
| Normal | 2.5 s | Pick from the word pool | Shuffled |
| Above normal | 2.5 s | **Typed** | Shuffled |
| Hard | 1.5 s | **Typed** | Shuffled |

Default: **Normal**.

The two variables are separated deliberately: going from Normal to Above normal keeps
the duration the same and changes only the answer method. That way you can learn from
real players which factor actually creates the difficulty.

## A4. Answering by typing

On Above normal and Hard the word pool is not shown; the player types the answer.

Flow:

- Tap a drawing → a text box opens at the bottom
- Type the answer → Enter or a save button
- The answer appears under the drawing and can be corrected by tapping
- It can be left blank (the right to pass) — counted wrong, but it must not crash
- When all are answered, or the finish button is pressed, the result screen appears

## A5. Answer matching rules

Typing brings string-comparison problems. Normalise both the answer and the correct
word before comparing:

1. Lowercase it — **Turkish-aware**: `toLocaleLowerCase('tr')`. Otherwise the letter
   `I` breaks
2. Fold the Turkish characters: `ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u`
3. Trim leading and trailing whitespace, collapse runs of inner whitespace to one
4. Strip punctuation

If the normalised forms are equal, it is correct.

On top of that, **forgive a one-character typo** (Levenshtein distance ≤ 1). "kanepa"
counts as "kanepe". Without that tolerance the game is infuriating.

Synonyms are not accepted — the set words are everyday words anyway.

---

# B. Word sets (10 sets)

## B1. The rule

Words are grouped by **silhouette**, not by category. Each set has 20 words: 10 from
one silhouette family, 10 from another.

- 200 word slots in total, 161 unique words
- No word is used **more than twice** (39 words appear twice, 122 appear once)
- No word repeats within a single set
- The family labels are **for the developer only** and are not shown to the player

## B2. Data (replaces the `SETS` array from v1)

```js
const SETS = [
  {
    id: "set-01",              // round / angular
    familyA: ["top", "elma", "güneş", "saat", "tekerlek", "balon", "portakal", "tabak", "ay", "yüzük"],
    familyB: ["kutu", "ev", "televizyon", "kitap", "pencere", "buzdolabı", "valiz", "telefon", "kapı", "çanta"]
  },
  {
    id: "set-02",              // horizontal mass / tall vertical
    familyA: ["fil", "kanepe", "inek", "masa", "otobüs", "tren", "timsah", "köprü", "araba", "ayı"],
    familyB: ["ağaç", "insan", "lamba", "şişe", "kule", "şemsiye", "mum", "zürafa", "kaktüs", "süpürge"]
  },
  {
    id: "set-03",              // triangular top / long thin rod
    familyA: ["dağ", "çadır", "çam", "pizza", "dondurma", "şapka", "roket", "yelkenli", "çatı", "huni"],
    familyB: ["kalem", "kaşık", "anahtar", "çekiç", "diş fırçası", "balık", "kılıç", "tarak", "cetvel", "sosis"]
  },
  {
    id: "set-04",              // curved / straight-lined
    familyA: ["bulut", "kalp", "yılan", "ahtapot", "çiçek", "el", "damla", "dalga", "kedi", "kurdele"],
    familyB: ["merdiven", "çit", "bayrak", "tuğla", "tabela", "raf", "çerçeve", "klavye", "ütü", "gözlük"]
  },
  {
    id: "set-05",              // winged / with a handle or grip
    familyA: ["kuş", "uçak", "kelebek", "arı", "uçurtma", "yarasa", "helikopter", "sinek", "kuğu", "tavuk"],
    familyB: ["fincan", "kova", "tencere", "sepet", "çaydanlık", "tava", "kupa", "sürahi", "cezve", "kilit"]
  },
  {
    id: "set-06",              // round / horizontal mass
    familyA: ["karpuz", "düğme", "para", "simit", "göz", "kavun", "zil", "nar", "top", "saat"],
    familyB: ["at", "koyun", "kaplumbağa", "bank", "kamyon", "domuz", "köpek", "yatak", "piyano", "sehpa"]
  },
  {
    id: "set-07",              // tall vertical / angular
    familyA: ["direk", "fener", "baca", "minare", "sütun", "vazo", "termos", "ağaç", "lamba", "şişe"],
    familyB: ["tuğla", "çerçeve", "sandık", "zarf", "dolap", "tablet", "klavye", "çamaşır makinesi", "kitap", "kapı"]
  },
  {
    id: "set-08",              // long thin rod / radial or star-shaped
    familyA: ["çatal", "bıçak", "tornavida", "fırça", "muz", "havuç", "kürek", "flüt", "kalem", "kaşık"],
    familyB: ["yıldız", "kar tanesi", "çark", "pusula", "örümcek", "denizyıldızı", "ateş", "patlama", "palmiye", "çiçek"]
  },
  {
    id: "set-09",              // curved / straight-lined
    familyA: ["tırtıl", "salyangoz", "ayak", "duman", "ip", "sarmaşık", "yılan", "bulut", "el", "kedi"],
    familyB: ["demiryolu", "kafes", "ızgara", "fermuar", "merdiven", "çit", "bayrak", "raf", "ütü", "gözlük"]
  },
  {
    id: "set-10",              // triangular top / winged
    familyA: ["piramit", "elmas", "ok", "uçurtma", "dağ", "çadır", "çam", "şapka", "roket", "huni"],
    familyB: ["kuş", "uçak", "kelebek", "arı", "yarasa", "helikopter", "sinek", "kuğu", "tavuk", "melek"]
  },
];
```

When a round starts, the chosen set's `familyA` and `familyB` are combined and
**shuffled**. The player does not know there are two families; they only feel it.

---

# C. Duel mode (sending to a friend)

## C1. How it works

1. You finish the drawing phase
2. Instead of the result, a "send to a friend" option appears
3. The game saves the drawings and gets a **4-character code**
4. It gives a short link: `https://cizgi.pages.dev/?o=A7K2`
5. Your friend clicks the link → sees your drawings and guesses
6. They see their score: "11/20 on Başak's drawings"
7. A "now you draw" button starts their own round → the loop closes

Whoever clicks the link installs nothing and creates no account. The friend plays **the
same set at the same difficulty**.

## C2. Why a server is needed

A 4-character short code forces the data to be stored somewhere. 20 drawings will not
fit inside the link; if you forced them in, the link would be 3,000–4,000 characters,
the opposite of the "short link" requirement.

v1's "no server" rule is broken here **deliberately**. The cost is still zero.

## C3. Architecture

One Cloudflare account, one domain:

- **Cloudflare Pages** — the game itself (a static `index.html`)
- **Pages Functions** — two endpoints under `/functions/api/`
- **Cloudflare KV** — the mapping from code to drawing data

Why Cloudflare: the free tier does not ask for a credit card, the game and the API
share a domain so there is no CORS problem, and it is a single deploy.

Free limits: 100,000 reads and 1,000 writes per day. Past the limit requests fail;
**no bill arrives**.

## C4. API contract

**Save**

```
POST /api/kaydet
Body: {
  setId: "set-07",
  zorluk: "orta-ustu",
  kelimeler: ["elma", "kutu", ...],      // shuffled order, 20 of them
  cizimler: [[[x,y],[x,y],...], ...]     // each drawing is an array of strokes, 20 of them
}
Response: { kod: "A7K2" }
```

**Fetch**

```
GET /api/oyun/A7K2
Response: { setId, zorluk, kelimeler, cizimler }
404: no such code, or it has expired
```

## C5. Code generation

- Alphabet: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 characters)
  - Characters that get confused, like `0/O` and `1/I/L`, are **excluded** — a code has
    to be readable aloud over the phone
- Length 4 → 32⁴ ≈ 1 million combinations
- Before writing, check the code is free; if it is taken, generate another (at most 5
  attempts)
- Stored in upper case, accepted in lower case on input

## C6. Data rules

- **Put a 30-day TTL on the KV record** — it deletes itself when it expires
- No personal data is stored: no name, no email, no IP
- The player may enter a nickname if they want (optional, one field, may be left blank)
  — only so it can say "X's drawings"
- Payloads over 200 KB are rejected

## C7. Shrinking the data

Before saving:

- Round coordinates to integers in the 0–255 range (the drawings are crude anyway, no
  one will notice)
- Drop consecutive points closer than 2 units to each other

This step typically shrinks the payload by a factor of 3–5.

## C8. Error cases

| Situation | Behaviour |
|---|---|
| Code not found | "This code is invalid or has expired" + return to the home screen |
| Save failed | "Could not send, try again" — the drawings must stay in memory, not be lost |
| No internet | Solo mode must keep working; only the duel is disabled |

---

# D. Acceptance criteria

**Flow and difficulty**

- [ ] No set list on the home screen, only difficulty and start
- [ ] A random set every round, never the same one twice in a row
- [ ] The set name and the silhouette logic are not visible on any screen
- [ ] All four difficulties work with the right duration and the right answer method
- [ ] The order on the recognition screen differs from the drawing order
- [ ] The result screen uses the same shuffled order

**Answer matching**

- [ ] "KANEPE", "kanepe" and "kanepa" all count as correct
- [ ] "İnek" and "inek" match (the Turkish lowercase trap)
- [ ] A blank answer counts as wrong and does not crash

**Word sets**

- [ ] All 10 sets are in the code, each with 20 words
- [ ] No word repeats within a set

**Duel**

- [ ] Saving returns a 4-character code
- [ ] Opening the link on another device shows the drawings
- [ ] The code can also be typed in by hand (lower case included)
- [ ] An invalid code gives a proper error
- [ ] The drawings are not lost when saving fails

---

# E. Not in this version

- Real-time multiplayer
- Accounts, sign-in
- A score table / leaderboard
- Notifications
- A drawing gallery

---

# F. A note on testing

You **cannot test the difficulty on yourself** — you know the sets and the logic, so
your results are no longer representative.

Get 2–3 friends who have never played Normal to play it. The target range is 10–14 out
of 20. If everyone scores 18+ it is still too easy; if they score below 6, it has
become infuriating.

Measure the gap between Normal and Above normal separately: since the duration is the
same, the score difference tells you directly how much seeing the pool helps.
