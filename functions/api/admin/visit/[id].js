// GET /api/admin/visit/<id>  ->  { visit, events, rounds }
//
// One visit from start to finish: what it was, every event in order, and the rounds it
// played with their twenty words, drawings and answers.

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function parse(s, fallback) {
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

export async function onRequestGet({ params, env }) {
  if (!env.DB) return json({ error: "analytics not bound" }, 500);
  const id = String(params.id || "");
  if (!/^[0-9a-f]{16}$/.test(id)) return json({ error: "invalid id" }, 400);

  const [visit, batches, rounds, items] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM visits WHERE id = ?").bind(id),
    env.DB.prepare("SELECT events FROM event_batches WHERE visit_id = ? ORDER BY seq").bind(id),
    env.DB.prepare("SELECT * FROM rounds WHERE visit_id = ? ORDER BY started_at").bind(id),
    env.DB.prepare(
      "SELECT i.* FROM round_items i JOIN rounds r ON r.id = i.round_id WHERE r.visit_id = ? ORDER BY i.idx"
    ).bind(id)
  ]);
  if (!visit.results.length) return json({ error: "not found" }, 404);

  const events = [];
  for (const b of batches.results) for (const e of parse(b.events, [])) events.push(e);
  events.sort((a, b) => a.t - b.t);

  const byRound = {};
  for (const it of items.results) {
    it.drawing = it.drawing ? parse(it.drawing, null) : null;
    (byRound[it.round_id] || (byRound[it.round_id] = [])).push(it);
  }
  const list = rounds.results.map(r => Object.assign(r, { words: parse(r.words, []), items: byRound[r.id] || [] }));

  return json({ visit: visit.results[0], events, rounds: list });
}
