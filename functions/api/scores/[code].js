// GET  /api/scores/A7K2  -> { scores: [{name, score, ts}, ...] } in finishing order
// POST /api/scores/A7K2  body {name, score} -> same response
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
    .slice(0, 5);
}

function sortByFinish(scores) {
  scores.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });   // earliest finisher first
  return scores;
}

// Source of truth: the per-player keys. Only scanned on write.
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
    scores.push({ name, score, ts: typeof m.ts === "number" ? m.ts : 0 });
  }
  return sortByFinish(scores);
}

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const code = String(params.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  const summary = await env.GAMES.get(code + ":board", { type: "json" });
  if (summary && Array.isArray(summary.scores)) return json({ scores: sortByFinish(summary.scores) });

  return json({ scores: await scanBoard(env, code) });   // no summary yet (first read)
}

export async function onRequestPost({ params, request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const code = String(params.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  let d;
  try { d = await request.json(); } catch (e) { return json({ error: "invalid JSON" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "invalid body" }, 400);

  const name = typeof d.name === "string" ? d.name.trim().slice(0, 5) : "";
  if (!name) return json({ error: "name required" }, 400);
  if (!Number.isInteger(d.score) || d.score < 0 || d.score > N) return json({ error: "invalid score" }, 400);

  // Do not let a score be written against a code that does not exist
  const game = await env.GAMES.get(code);
  if (!game) return json({ error: "code not found" }, 404);

  const key = nameKey(name);
  let scores = await scanBoard(env, code);

  // Replaying must not push you down the list: keep the original finish time.
  const previous = scores.filter(function (s) { return nameKey(s.name) === key; })[0];
  const ts = previous && previous.ts ? previous.ts : Date.now();

  await env.GAMES.put(code + ":s:" + key, "", {
    metadata: { name, score: d.score, ts },
    expirationTtl: TTL
  });

  // KV listing is eventually consistent, so a key just written may not appear
  // in the scan yet. Put our own row back in by hand.
  scores = scores.filter(function (s) { return nameKey(s.name) !== key; });
  scores.push({ name, score: d.score, ts });
  sortByFinish(scores);

  await env.GAMES.put(code + ":board", JSON.stringify({ scores }), { expirationTtl: TTL });

  return json({ scores });
}
