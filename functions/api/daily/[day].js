import { dayNumber as today } from "../../../lib/day.js";

// GET  /api/daily/6?mode=pool  -> { day, mode, scores: [{name, score, ms, ts}, ...] } best first
// POST /api/daily/6  body {name, score, ms, mode, was?, token?}
//
// The daily board. Everyone plays the same twenty words on the same day, so unlike a duel
// board this one is global: every player who finished that day, ranked together.
//
// One board per mode, since kelimeler açık and kelimeler gizli are not the same game and a
// single table would rank them against each other. typed keeps the original keys, every
// score written before the split having been played that way.
//
// Same shape as the per-round board in ../scores/[code].js, and for the same reasons:
// each player writes their own key so two people finishing at once cannot overwrite
// each other, a summary is kept for readers so a poll costs one get rather than a
// list, and a row carries a token so renaming yourself moves your row instead of
// leaving the old name behind.

// The day's board is kept, like the rounds and their boards.
const N = 20;
const MAX_ROWS = 200;          // the board is global, so it is a leaderboard, not a list
const NAME_MAX = 10;
const BOARD_CACHE = 30;        // the shortest read cache KV allows
const REPAIR_AFTER = 5 * 60 * 1000;


const TURKISH_FOLD = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function nameKey(name) {
  return name.toLowerCase()
    .replace(/̇/g, "")
    .replace(/[çğıöşü]/g, function (ch) { return TURKISH_FOLD[ch] || ch; })
    .replace(/[\s/\\]+/g, "_")
    .slice(0, NAME_MAX);
}


const MODES = ["pool", "typed"];

function readMode(request, body) {
  const asked = (body && typeof body.mode === "string" && body.mode) ||
                new URL(request.url).searchParams.get("mode") || "";
  return MODES.indexOf(asked) >= 0 ? asked : "typed";
}

// typed is where every score lived before the boards split, so it keeps the old keys.
function base(day, mode) {
  return mode === "typed" ? "day:" + day : "day:" + day + ":" + mode;
}

function readDay(params) {
  const raw = String(params.day || "").trim();
  if (!/^[1-9][0-9]{0,5}$/.test(raw)) return 0;
  const day = Number(raw);
  // Nothing can be posted to a day that has not happened. A day in the past is fine:
  // a score written just before midnight may arrive just after it.
  if (day > today()) return 0;
  return day;
}

function rank(scores) {
  scores.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    const am = a.ms > 0 ? a.ms : Infinity, bm = b.ms > 0 ? b.ms : Infinity;
    if (am !== bm) return am - bm;
    return (a.ts || 0) - (b.ts || 0);
  });
  return scores;
}

function mergeBoards(summary, scanned) {
  const known = new Map();
  if (summary && Array.isArray(summary.scores)) {
    for (const s of summary.scores) {
      if (s && typeof s.name === "string" && typeof s.score === "number") known.set(nameKey(s.name), s);
    }
  }
  for (const s of scanned) known.set(nameKey(s.name), s);
  return rank(Array.from(known.values())).slice(0, MAX_ROWS);
}

async function scanBoard(env, day, mode) {
  const r = await env.GAMES.list({ prefix: base(day, mode) + ":s:", limit: 1000 });
  const scores = [];
  for (const k of r.keys) {
    const m = k.metadata;
    if (!m || typeof m.name !== "string" || typeof m.score !== "number") continue;
    scores.push({
      name: m.name,
      score: m.score,
      ms: typeof m.ms === "number" ? m.ms : 0,
      ts: typeof m.ts === "number" ? m.ts : 0
    });
  }
  return rank(scores);
}

/* Repairing is not the same as reading, and it only happens when the summary is at least
   REPAIR_AFTER old. Writing a row writes the summary in the same request, so by the time a
   repair runs every row that belongs on the board has been listable for minutes -- far
   longer than the minute or so a listing lags. A name the keys no longer have has
   therefore gone: renamed away, or expired. Keeping it is how a row a player renamed came
   back and stayed: the summary read here can itself be a cached copy from before the
   rename, and merging it with a listing that had not caught up yet put the old name back
   and wrote it down. So a repair takes the keys as they are.

   Unless the listing hit its limit, where it may be short of rows it never reached: then
   the old merge stands, which never drops anybody. */
function repairBoard(summary, scanned) {
  return scanned.length >= MAX_ROWS ? mergeBoards(summary, scanned) : rank(scanned.slice());
}

function writeBoard(env, day, mode, scores) {
  return env.GAMES.put(base(day, mode) + ":board", JSON.stringify({ scores, scannedAt: Date.now() }));
}

export async function onRequestGet({ params, request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const day = readDay(params);
  if (!day) return json({ error: "no such day" }, 404);
  const mode = readMode(request, null);

  const summary = await env.GAMES.get(base(day, mode) + ":board", { type: "json", cacheTtl: BOARD_CACHE });
  const fresh = summary
    && Array.isArray(summary.scores)
    && typeof summary.scannedAt === "number"
    && Date.now() - summary.scannedAt < REPAIR_AFTER;
  if (fresh) return json({ day, mode, scores: rank(summary.scores) });

  // No summary means nobody has played the day yet: every score post writes one. Listing
  // here found nothing and repeated on every poll, since an empty day never writes one.
  if (!summary || !Array.isArray(summary.scores)) return json({ day, mode, scores: [] });

  const repaired = repairBoard(summary, await scanBoard(env, day, mode));
  // An empty result means the listing failed or lagged completely; the summary stands.
  if (repaired.length > 0) {
    await writeBoard(env, day, mode, repaired);
    return json({ day, mode, scores: repaired });
  }
  return json({ day, mode, scores: rank(summary.scores) });
}

export async function onRequestPost({ params, request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const day = readDay(params);
  if (!day) return json({ error: "no such day" }, 404);

  let d;
  try { d = await request.json(); } catch (e) { return json({ error: "invalid JSON" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "invalid body" }, 400);

  const name = typeof d.name === "string" ? d.name.trim().slice(0, NAME_MAX) : "";
  if (!name) return json({ error: "name required" }, 400);
  if (!Number.isInteger(d.score) || d.score < 0 || d.score > N) return json({ error: "invalid score" }, 400);
  const MAX_MS = 6 * 60 * 60 * 1000;
  const ms = Number.isFinite(d.ms) && d.ms > 0 && d.ms < MAX_MS ? Math.round(d.ms) : 0;

  const mode = readMode(request, d);
  const key = nameKey(name);
  const summary = await env.GAMES.get(base(day, mode) + ":board", { type: "json" });
  const merged = mergeBoards(summary, await scanBoard(env, day, mode));
  const known = new Map(merged.map(function (s) { return [nameKey(s.name), s]; }));

  const previous = known.get(key);
  let ts = previous && previous.ts ? previous.ts : Date.now();
  const keepMs = previous && previous.ms > 0 ? previous.ms : ms;

  const existing = await env.GAMES.getWithMetadata(base(day, mode) + ":s:" + key);
  let token = existing && existing.metadata && typeof existing.metadata.token === "string"
    ? existing.metadata.token : "";

  const wasKey = typeof d.was === "string" && d.was.trim() ? nameKey(d.was.trim()) : "";
  if (wasKey && wasKey !== key) {
    const old = await env.GAMES.getWithMetadata(base(day, mode) + ":s:" + wasKey);
    const om = old && old.metadata;
    const given = typeof d.token === "string" ? d.token : "";
    if (om && typeof om.token === "string" && om.token && given && om.token === given) {
      if (!token) token = om.token;
      if (om.ts) ts = om.ts;
      await env.GAMES.delete(base(day, mode) + ":s:" + wasKey);
      known.delete(wasKey);
    }
  }
  if (!token) token = crypto.randomUUID().replace(/-/g, "");

  await env.GAMES.put(base(day, mode) + ":s:" + key, "", {
    metadata: { name, score: d.score, ms: keepMs, ts, token }
  });

  known.set(key, { name, score: d.score, ms: keepMs, ts });
  const scores = rank(Array.from(known.values())).slice(0, MAX_ROWS);
  await writeBoard(env, day, mode, scores);

  return json({ day, mode, scores, token });
}

// Without this Pages falls through to the static asset handler and answers an API
// call with the whole index.html page.
export function onRequest() {
  return json({ error: "GET or POST only" }, 405);
}
