# Deployment (Cloudflare Pages)

```
public/index.html                 the whole game, no dependencies
functions/api/save.js             POST /api/save          -> { code }
functions/api/game/[code].js      GET  /api/game/A7K2
functions/api/scores/[code].js    GET+POST /api/scores/A7K2
wrangler.jsonc                    project config and the KV binding
start.cmd                         starts the local server (Windows)
```

Only `public/` is uploaded to the site, so `README.md`, `start.cmd` and
`wrangler.jsonc` are never reachable from the web.

## Running locally

Double-click `start.cmd`, then open `http://localhost:8788`. Closing the window
stops the server and the address stops answering — that is expected, it is not a
background service.

By hand:

```bash
npx wrangler pages dev
```

On Windows, a long project path makes workerd fail with `SQLITE_CANTOPEN`: the local
state directory under `.wrangler/state/...` pushes past the 260-character path limit.
Work around it with a short path:

```bash
npx wrangler pages dev --persist-to C:/wr
```

Solo play needs none of this — open `public/index.html` directly. The server is only
required for the duel and the score board, because those go through the API.

## First-time setup

1. Sign in. A browser window opens for you to authorise the account:

   ```bash
   npx wrangler login
   ```

2. Create the KV namespace:

   ```bash
   npx wrangler kv namespace create GAMES
   ```

   Copy the `id` it prints into `wrangler.jsonc`, replacing
   `PUT_YOUR_KV_NAMESPACE_ID_HERE`.

3. Create the Pages project (once):

   ```bash
   npx wrangler pages project create chizz
   ```

4. Deploy:

   ```bash
   npx wrangler pages deploy
   ```

Subsequent updates are step 4 on its own.

After deploying, check **Workers & Pages → chizz → Settings → Bindings** in the
dashboard and confirm `GAMES` is listed. If it is missing the duel will not work and
the API answers `500 storage not bound`; add the binding there and deploy again.

## Custom domain

`pages.dev` is filtered on some networks and mobile operators, which makes the site
silently fail to load for a subset of players. A custom domain ends that. The live
address is **https://chizz.party**.

1. Dashboard → **Register domains** → search a name → buy it. New domains can be
   registered directly; nothing needs transferring in. Contact details must be ASCII
   only.
2. Dashboard → **Workers & Pages → chizz → Custom domains → Set up a domain** → enter
   the address. Cloudflare adds the DNS record and issues the certificate, usually
   within a few minutes.
3. Update the single line in `public/index.html`:

   ```js
   const PUBLIC_BASE_URL = "https://chizz.party";
   ```

   This decides which address a duel link points at when the round is played on
   localhost, from a `file://` copy, or on the old `pages.dev` address. Playing on the
   canonical domain already produces the right link.

4. Deploy again with `npx wrangler pages deploy`.

## Free tier

100,000 KV reads, 1,000 writes and 1,000 list operations per day. Exceeding a limit
makes requests fail; it does not generate a bill. This is why the score board never
calls `list` on read: each player writes to their own key and readers fetch a single
pre-computed summary.

Everything is written with a 30-day TTL and expires on its own.

## Stored data

A saved round holds the set id, the difficulty, a name of at most 5 characters, the 20
words and the 20 drawings. No email, no IP, no account.

Coordinates are reduced to 0–255 integers and consecutive points closer than 2 units
are dropped — roughly an 11× reduction on a dense stroke. Bodies over 200 KB are
rejected; a typical 20-drawing round is 30–40 KB.
