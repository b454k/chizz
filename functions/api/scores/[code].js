// GET  /api/scores/A7K2  -> { scores: [{name, score, ms, ts}, ...] }, best first
// POST /api/scores/A7K2  body {name, score, ms} -> same response
//
// Two layers: every player writes to their own key (<CODE>:s:<name>), so two
// people finishing at the same moment cannot overwrite each other. After a write
// the table is summarised into a single value at <CODE>:board, which is what
// readers get.
//
// Why: the free tier allows 1,000 KV list operations a day against 100,000 reads.
// The board is polled live, so calling list on every read would exhaust the quota
// almost immediately. list runs only on write; reads are a single get.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
const TTL = 30 * 24 * 60 * 60;
const N = 20;
const MAX_PLAYERS = 200;
// Names used to be capped at 5, so every key already written is 5 or shorter and
// still derives to itself under the longer cap.
const NAME_MAX = 10;
const MAX_MS = 6 * 60 * 60 * 1000;   // 6 hours; beyond that the timing is meaningless

const TURKISH_FOLD = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u" };

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function nameKey(name) {
  // Lowercasing "ALİ" leaves a combining dot behind. Without stripping it the
  // same person would not match "Ali" and would get a second row in the table.
  return name.toLowerCase()
    .replace(/̇/g, "")
    .replace(/[çğıöşü]/g, function (ch) { return TURKISH_FOLD[ch] || ch; })
    .replace(/[\s/\\]+/g, "_")
    .slice(0, NAME_MAX);
}

// Winner at the top: best score first, and a tie goes to whoever finished it
// quickest. Rows written before times were recorded carry no ms and sit behind
// the timed ones on a tie, ordered by when they finished.
function rank(scores) {
  scores.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    const am = a.ms > 0 ? a.ms : Infinity, bm = b.ms > 0 ? b.ms : Infinity;
    if (am !== bm) return am - bm;
    return (a.ts || 0) - (b.ts || 0);
  });
  return scores;
}

// How stale a summary may get before a read reconciles it against the per-player
// keys. Every reader polls this endpoint every 6s, so this is what keeps the
// listing cost bounded: one list (and one write) per round per window, however
// many people are watching.
const REPAIR_AFTER = 5 * 60 * 1000;

// KV caches a read at the network location that served it. A write only clears the
// cache in its own region, so a score set by a friend somewhere else stays invisible
// until this copy expires. 30 seconds is the lowest KV accepts; the default of 60
// meant a distant player could take a full minute to appear.
const BOARD_CACHE = 30;

// Combine what the summary remembers with what the per-player keys say. Neither is
// reliable alone: KV listing lags a write by up to a minute, and the summary is a
// read-modify-write that a concurrent finisher can have based on a stale read. A
// player present in either source survives.
function mergeBoards(summary, scanned) {
  const known = new Map();
  if (summary && Array.isArray(summary.scores)) {
    for (const s of summary.scores) {
      if (s && typeof s.name === "string" && typeof s.score === "number") known.set(nameKey(s.name), s);
    }
  }
  for (const s of scanned) known.set(nameKey(s.name), s);   // the keys win where both have a row
  return rank(Array.from(known.values())).slice(0, MAX_PLAYERS);
}

function writeBoard(env, code, scores) {
  return env.GAMES.put(
    code + ":board",
    JSON.stringify({ scores, scannedAt: Date.now() }),
    { expirationTtl: TTL }
  );
}

// Source of truth: the per-player keys.
async function scanBoard(env, code) {
  const r = await env.GAMES.list({ prefix: code + ":s:", limit: MAX_PLAYERS });
  const scores = [];
  for (const k of r.keys) {
    const m = k.metadata;
    if (!m) continue;
    // Rows written before the fields were renamed to English still carry the old
    // names. Accept both until they expire.
    const name = typeof m.name === "string" ? m.name : m.ad;
    const score = typeof m.score === "number" ? m.score : m.skor;
    if (typeof name !== "string" || typeof score !== "number") continue;
    scores.push({
      name,
      score,
      ms: typeof m.ms === "number" ? m.ms : 0,
      ts: typeof m.ts === "number" ? m.ts : 0
    });
  }
  return rank(scores);
}

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const code = String(params.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  const summary = await env.GAMES.get(code + ":board", { type: "json", cacheTtl: BOARD_CACHE });
  const fresh = summary
    && Array.isArray(summary.scores)
    && typeof summary.scannedAt === "number"
    && Date.now() - summary.scannedAt < REPAIR_AFTER;
  if (fresh) return json({ scores: rank(summary.scores) });

  // Either there is no summary yet, or it is old enough to be worth reconciling.
  // A summary written while listing was lagging can be missing players outright;
  // this is what puts them back, and without it an incomplete board would stay
  // incomplete until somebody happened to finish the round again.
  const merged = mergeBoards(summary, await scanBoard(env, code));
  const had = summary && Array.isArray(summary.scores) ? summary.scores.length : 0;

  // Never persist a board smaller than the one just read. If listing is lagging and
  // the summary read was stale, the merge can come back short or empty, and writing
  // that back would delete players rather than restore them.
  if (merged.length > 0 && merged.length >= had) {
    await writeBoard(env, code, merged);
    return json({ scores: merged });
  }
  return json({ scores: had ? rank(summary.scores) : merged });
}

export async function onRequestPost({ params, request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const code = String(params.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  let d;
  try { d = await request.json(); } catch (e) { return json({ error: "invalid JSON" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "invalid body" }, 400);

  const name = typeof d.name === "string" ? d.name.trim().slice(0, NAME_MAX) : "";
  if (!name) return json({ error: "name required" }, 400);
  if (!Number.isInteger(d.score) || d.score < 0 || d.score > N) return json({ error: "invalid score" }, 400);
  // How long the guessing took, used to break ties. Anything absurd is dropped
  // rather than rejected: a bad clock should not cost someone their score.
  const ms = Number.isFinite(d.ms) && d.ms > 0 && d.ms < MAX_MS ? Math.round(d.ms) : 0;

  // Do not let a score be written against a code that does not exist
  const game = await env.GAMES.get(code);
  if (!game) return json({ error: "code not found" }, 404);

  const key = nameKey(name);

  // Rebuilding the summary from the scan alone meant each finisher published a
  // board containing only themselves, wiping everyone who had already played.
  const summary = await env.GAMES.get(code + ":board", { type: "json" });
  const merged = mergeBoards(summary, await scanBoard(env, code));
  const known = new Map(merged.map(function (s) { return [nameKey(s.name), s]; }));

  // Replaying must not push you down the list, or rewrite the time you set.
  const previous = known.get(key);
  const ts = previous && previous.ts ? previous.ts : Date.now();
  const keepMs = previous && previous.ms > 0 ? previous.ms : ms;

  await env.GAMES.put(code + ":s:" + key, "", {
    metadata: { name, score: d.score, ms: keepMs, ts },
    expirationTtl: TTL
  });

  // The key just written may not be listable yet, so seat this row by hand.
  known.set(key, { name, score: d.score, ms: keepMs, ts });

  const scores = rank(Array.from(known.values())).slice(0, MAX_PLAYERS);
  await writeBoard(env, code, scores);

  return json({ scores });
}
