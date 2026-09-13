// GET  /api/daily/6  -> { scores: [{name, score, ms, ts}, ...] } best first
// POST /api/daily/6  body {name, score, ms, was?, token?}
//
// The daily board. Everyone plays the same twenty words on the same day at the same
// settings, so unlike a duel board this one is global: every player who finished that
// day, ranked together.
//
// Same shape as the per-round board in ../scores/[code].js, and for the same reasons:
// each player writes their own key so two people finishing at once cannot overwrite
// each other, a summary is kept for readers so a poll costs one get rather than a
// list, and a row carries a token so renaming yourself moves your row instead of
// leaving the old name behind.

const TTL = 30 * 24 * 60 * 60;
const N = 20;
const MAX_ROWS = 200;          // the board is global, so it is a leaderboard, not a list
const NAME_MAX = 10;
const BOARD_CACHE = 30;        // the shortest read cache KV allows
const REPAIR_AFTER = 5 * 60 * 1000;

// Day 1 is Tuesday 8 September 2026, midnight in Turkey, written in UTC.
const EPOCH = Date.UTC(2026, 8, 7, 21, 0, 0);
const DAY_MS = 86400000;

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

function today() {
  return Math.floor((Date.now() - EPOCH) / DAY_MS) + 1;
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

async function scanBoard(env, day) {
  const r = await env.GAMES.list({ prefix: "day:" + day + ":s:", limit: 1000 });
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

function writeBoard(env, day, scores) {
  return env.GAMES.put(
    "day:" + day + ":board",
    JSON.stringify({ scores, scannedAt: Date.now() }),
    { expirationTtl: TTL }
  );
}

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const day = readDay(params);
  if (!day) return json({ error: "no such day" }, 404);

  const summary = await env.GAMES.get("day:" + day + ":board", { type: "json", cacheTtl: BOARD_CACHE });
  const fresh = summary
    && Array.isArray(summary.scores)
    && typeof summary.scannedAt === "number"
    && Date.now() - summary.scannedAt < REPAIR_AFTER;
  if (fresh) return json({ day, scores: rank(summary.scores) });

  const merged = mergeBoards(summary, await scanBoard(env, day));
  const had = summary && Array.isArray(summary.scores) ? summary.scores.length : 0;
  if (merged.length > 0 && merged.length >= had) {
    await writeBoard(env, day, merged);
    return json({ day, scores: merged });
  }
  return json({ day, scores: had ? rank(summary.scores) : merged });
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

  const key = nameKey(name);
  const summary = await env.GAMES.get("day:" + day + ":board", { type: "json" });
  const merged = mergeBoards(summary, await scanBoard(env, day));
  const known = new Map(merged.map(function (s) { return [nameKey(s.name), s]; }));

  const previous = known.get(key);
  let ts = previous && previous.ts ? previous.ts : Date.now();
  const keepMs = previous && previous.ms > 0 ? previous.ms : ms;

  const existing = await env.GAMES.getWithMetadata("day:" + day + ":s:" + key);
  let token = existing && existing.metadata && typeof existing.metadata.token === "string"
    ? existing.metadata.token : "";

  const wasKey = typeof d.was === "string" && d.was.trim() ? nameKey(d.was.trim()) : "";
  if (wasKey && wasKey !== key) {
    const old = await env.GAMES.getWithMetadata("day:" + day + ":s:" + wasKey);
    const om = old && old.metadata;
    const given = typeof d.token === "string" ? d.token : "";
    if (om && typeof om.token === "string" && om.token && given && om.token === given) {
      if (!token) token = om.token;
      if (om.ts) ts = om.ts;
      await env.GAMES.delete("day:" + day + ":s:" + wasKey);
      known.delete(wasKey);
    }
  }
  if (!token) token = crypto.randomUUID().replace(/-/g, "");

  await env.GAMES.put("day:" + day + ":s:" + key, "", {
    metadata: { name, score: d.score, ms: keepMs, ts, token },
    expirationTtl: TTL
  });

  known.set(key, { name, score: d.score, ms: keepMs, ts });
  const scores = rank(Array.from(known.values())).slice(0, MAX_ROWS);
  await writeBoard(env, day, scores);

  return json({ day, scores, token });
}

// Without this Pages falls through to the static asset handler and answers an API
// call with the whole index.html page.
export function onRequest() {
  return json({ error: "GET or POST only" }, 405);
}
