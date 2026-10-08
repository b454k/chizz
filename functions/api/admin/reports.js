// GET /api/admin/reports?kind=hata|oneri&offset=0  ->  { total, items: [...] }
//
// The bug reports and suggestions functions/api/feedback.js writes to KV, newest first.
// KV lists keys oldest first, so every key is listed and the order turned round here;
// there are hundreds at most, and only the page asked for is read.

const PAGE = 30;
const MAX_KEYS = 5000;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind");
  const offset = Math.max(0, parseInt(q.get("offset"), 10) || 0);

  let names = [], cursor;
  do {
    const page = await env.GAMES.list({ prefix: "feedback:", cursor });
    names = names.concat(page.keys.map(k => k.name));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor && names.length < MAX_KEYS);

  // feedback:<iso time>:<kind>:<rand>
  if (kind === "hata" || kind === "oneri") names = names.filter(n => n.split(":").slice(-2)[0] === kind);
  names.reverse();

  const slice = names.slice(offset, offset + PAGE);
  const items = await Promise.all(slice.map(async key => {
    const v = await env.GAMES.get(key, { type: "json" });
    return Object.assign({ key }, v || {});
  }));
  return json({ total: names.length, offset, items });
}
