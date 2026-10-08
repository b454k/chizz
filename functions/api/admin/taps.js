// GET /api/admin/taps?days=7&screen=home&size=narrow|wide
//   ->  { screens, points, targets, aspect }
//
// Where people tap, for the heat map. A tap's place is a fraction of the window it was
// made in, so phones and wide screens are kept apart: the same button sits in a different
// spot on each. aspect is the typical window shape of the taps returned, height / width.

const NARROW = 700;               // CSS px; under this is a phone layout
const MAX_BATCHES = 5000;
const MAX_POINTS = 20000;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "analytics not bound" }, 500);
  const q = new URL(request.url).searchParams;
  const days = Math.min(400, Math.max(1, parseInt(q.get("days"), 10) || 7));
  const screen = q.get("screen") || "";
  const wide = q.get("size") === "wide";

  const rows = (await env.DB.prepare(
    "SELECT b.events, v.width, v.height FROM event_batches b JOIN visits v ON v.id = b.visit_id"
    + " WHERE b.received_at >= ? ORDER BY b.received_at DESC LIMIT ?"
  ).bind(Date.now() - days * 86400000, MAX_BATCHES).all()).results;

  const screens = {}, targets = {}, points = [], shapes = [];
  for (const row of rows) {
    if (!row.width || (row.width >= NARROW) !== wide) continue;
    let events;
    try { events = JSON.parse(row.events); } catch (e) { continue; }
    for (const e of events) {
      if (e.type !== "tap") continue;
      const s = e.screen || "";
      screens[s] = (screens[s] || 0) + 1;
      if (s !== screen) continue;
      targets[e.target || ""] = (targets[e.target || ""] || 0) + 1;
      if (typeof e.x === "number" && points.length < MAX_POINTS) {
        points.push([e.x, e.y]);
        if (row.height) shapes.push(row.height / row.width);
      }
    }
  }
  shapes.sort((a, b) => a - b);
  const sorted = obj => Object.keys(obj).map(k => ({ name: k, n: obj[k] })).sort((a, b) => b.n - a.n);
  return json({
    screens: sorted(screens),
    targets: sorted(targets).slice(0, 40),
    points,
    aspect: shapes.length ? shapes[shapes.length >> 1] : (wide ? 0.6 : 2)
  });
}
