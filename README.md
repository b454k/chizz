# Chizz

A drawing and memory game that runs in the browser.
**Play at [chizz.party](https://chizz.party)**

You get 20 words, a couple of seconds each, and scribble something for every one.
Then the drawings come back in a shuffled grid and you have to remember which was
which. The words in a round are picked to share silhouettes — `fil` and `kanepe` are
the same rough shape — so your own drawings turn against you.

You can also send a round to a friend. They guess your drawings and land on a live
score board for that round.

The interface is in Turkish.

> **Work in progress.** It works and people are playing it, but the timing
> defaults have not been tested on real players yet and there is no English edition.

## How to play

1. Pick a mode, set the seconds per word if you want, and press start
2. Draw all 20 words — the timer advances on its own, there is no way back
3. Either guess your own drawings, or send them to a friend
4. Assign a word to each drawing, then finish

Nothing is asked before you start. A name is only needed to send a round to someone
or to take a place on a score board, so it is asked at those points and nowhere else.

Two modes, and the clock set separately. Answering is either picking from a pool of the
remaining words or typing the word yourself; the time per word is a slider from 1 to 10
seconds, defaulting to 2.5. There is also a dark or light theme. All of it is remembered
on the device.

Typed answers forgive a one-character typo, so `kanepa` still counts for `kanepe`.

## Running it locally

Solo play needs nothing at all — open `public/index.html` in a browser.

The duel and score board need the API, which means the Cloudflare toolchain:

```bash
npx wrangler pages dev
```

Then open `http://localhost:8788`. On Windows, `start.cmd` does the same thing on a
double-click. If your project path is long, workerd may fail with `SQLITE_CANTOPEN`
because the local state directory exceeds the 260-character path limit — pass
`--persist-to C:/wr` to work around it.

Deploying needs your own Cloudflare account, a KV namespace bound as `GAMES`, and its
id in `wrangler.jsonc`. Full steps: [docs/DEPLOY.md](docs/DEPLOY.md).

## Tech

- One `public/index.html` — HTML, CSS and vanilla JavaScript in a single file. No
  framework, no build step, no dependencies, nothing loaded from a CDN.
- Drawings are stored as stroke coordinate arrays normalised to 0–1, never as images,
  so they rescale cleanly into small grid cells. For transport they are quantised to
  0–255 integers with near-duplicate points dropped.
- Pointer events with `touch-action: none`, so it is drawable with a finger on a phone
  without scrolling the page.
- [Cloudflare Pages](https://pages.cloudflare.com/) for hosting, Pages Functions for
  the API, Workers KV for storage. Saved rounds expire after 30 days.
- Pasting a round into a chat shows its drawings: the preview image is a PNG encoded
  by hand from the stored strokes, no image library and nothing stored for it.
- No account, no login, no tracking. Stored on the server: the words, the drawings, the
  mode, the seconds per word and a name of up to 10 characters. Stored in the browser:
  your name, your settings, and rounds in progress so a reload does not lose your game.

## Docs

- [docs/SPEC.md](docs/SPEC.md) — what the game actually does right now, written from
  the code
- [docs/DEPLOY.md](docs/DEPLOY.md) — hosting and deployment setup
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- `docs/chizz-original-spec.md` and `docs/chizz-v15-spec.md` — the original design
  briefs, translated from Turkish and kept as historical documents. The code has moved
  well past them; SPEC.md lists where they disagree.
