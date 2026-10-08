# Deployment (Cloudflare Pages)

```
public/index.html                 the whole game, no dependencies
functions/api/save.js             POST /api/save          -> { code }
functions/api/game/[code].js      GET  /api/game/A7K2
functions/api/scores/[code].js    GET+POST /api/scores/A7K2
functions/api/events.js           POST /api/events        analytics, into D1
functions/api/admin/*             GET  /api/admin/...     the owner's data, behind Access
public/admin.html                 /admin                  reports, visits, taps
migrations/                       the D1 schema
wrangler.jsonc                    project config, the KV and D1 bindings
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
   npx wrangler pages deploy --branch production
   ```

   **`--branch production` is what reaches chizz.party.** Pages names a deployment after
   the current git branch, and this project's production branch is called `production`,
   not `main`. Deploy without it from `main` and Cloudflare reports success -- but it is a
   preview at `main.chizz.pages.dev`, and the live site does not move. `wrangler pages
   deployment list --project-name chizz` shows which deployments are Production.

Subsequent updates are step 4 on its own.

After deploying, check **Workers & Pages → chizz → Settings → Bindings** in the
dashboard and confirm `GAMES` is listed. If it is missing the duel will not work and
the API answers `500 storage not bound`; add the binding there and deploy again.

## Analytics and /admin

The game reports what each visit does to `/api/events`, which writes it to a D1 database;
`/admin` reads it back, together with the bug reports in KV. What is recorded, and what
is not, is set out in `public/privacy.html` -- keep that page true when this changes.

### Once

1. Create the database and copy the `database_id` it prints:

   ```bash
   npx wrangler d1 create chizz-analytics
   ```

   Like the KV id, the real id is **never committed**: `wrangler.jsonc` carries
   `PUT_YOUR_D1_DATABASE_ID_HERE`, and the id goes in only for a deploy.

2. Create the tables, with the real id in place:

   ```bash
   npx wrangler d1 migrations apply chizz-analytics --remote
   ```

   A later file in `migrations/` is applied the same way.

3. Lock `/admin` with Cloudflare Access (free for up to 50 people). Dashboard →
   **Zero Trust** → **Access → Applications → Add an application → Self-hosted**:
   - application domain `chizz.party`, path `admin`, and a second destination,
     `chizz.party`, path `api/admin`
   - one policy, action **Allow**, include **Emails** → your own address only. Not
     "everyone", and not an email *domain*.
   - login method: one-time PIN is enough.

   Then copy the application's **Application Audience (AUD) tag**, and your team domain
   from **Settings → Custom pages** (it looks like `yourteam.cloudflareaccess.com`).

4. Dashboard → **Workers & Pages → chizz → Settings → Variables and Secrets**, for
   Production, add:

   | name | value |
   |---|---|
   | `ACCESS_TEAM_DOMAIN` | `yourteam.cloudflareaccess.com` |
   | `ACCESS_AUD` | the AUD tag |
   | `ADMIN_EMAILS` | your address; several are comma separated |

   `functions/api/admin/_middleware.js` checks Access's signed token against these on
   every request, so the data stays shut even on `chizz.pages.dev`, which Access does
   not cover. With any of them missing, nobody gets in.

5. Deploy as usual, then open https://chizz.party/admin.

### Deploying

```powershell
powershell -ExecutionPolicy Bypass -File tools\deploy.ps1
```

It runs the day-epoch check, looks both ids up on the account by name (the `GAMES`
namespace and the `chizz-analytics` database), puts them in for the deploy and takes them
out straight after, also when the deploy fails. `-DryRun` stops after the lookup. To see
the ids yourself: `npx wrangler kv namespace list` and `npx wrangler d1 list`.

### Locally

```bash
npx wrangler d1 migrations apply chizz-analytics --local --persist-to C:/wr
npx wrangler pages dev --persist-to C:/wr
```

`/admin` on localhost needs `ADMIN_LOCAL=1` in `.dev.vars` (ignored by git); it is
honoured on localhost only.

### Data for analysis

`analysis/` reads an export of the database; see `analysis/README.md`.

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

Nothing expires: a round and its boards are written with no TTL and kept. A `sorun bildir`
report is the exception, at 180 days.

D1 allows 100,000 rows written and 5 million read per day, and 5 GB. A visit writes one row
per batch of events (one every ten seconds at most, and on leaving), and a finished round
about forty -- a few thousand rounds a day fit. Analytics rows are never deleted, so the 5 GB
is what eventually runs out: a played visit is roughly 40 KB, most of it drawings, which is
over a hundred thousand rounds. Hitting it makes `/api/events` fail (the game swallows that);
it does not bill. D1 keeps only 7 days of point-in-time history on the free plan, so the
real backup is `tools/backup-analytics.ps1`: a full SQL export into `Documents\chizz-backups`,
the last twelve kept. A Windows scheduled task, "chizz analytics backup", runs it on the 1st
of every month (or at the next start-up, if the computer was off). To restore one, apply the
file to an empty database: `npx wrangler d1 execute <db> --remote --file <backup>.sql`.

## Stored data

A saved round holds the set id, the difficulty, a name of at most 5 characters, the 20
words and the 20 drawings. No email, no IP, no account.

Coordinates are reduced to 0–255 integers and consecutive points closer than 2 units
are dropped — roughly an 11× reduction on a dense stroke. Bodies over 200 KB are
rejected; a typical 20-drawing round is 30–40 KB.
