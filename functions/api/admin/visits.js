// GET /api/admin/visits?days=7&before=<ms>  ->  { visits, perDay, lastScreens }
//
// The newest visits, a page at a time, each with how many rounds it played and its best
// score; and over the same span, visits per day and the screen each visit was last on --
// where people stop.

const PAGE = 100;

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
  const since = Date.now() - days * 86400000;
  const before = parseInt(q.get("before"), 10) || Date.now() + 1;

  const [visits, perDay, lastScreens] = await env.DB.batch([
    env.DB.prepare(
      "SELECT v.*, COUNT(r.id) AS rounds, MAX(r.score) AS best,"
      + " SUM(r.finished_at IS NOT NULL) AS finished"
      + " FROM visits v LEFT JOIN rounds r ON r.visit_id = v.id"
      + " WHERE v.started_at >= ? AND v.started_at < ?"
      + " GROUP BY v.id ORDER BY v.started_at DESC LIMIT ?"
    ).bind(since, before, PAGE),
    env.DB.prepare(
      "SELECT day, COUNT(*) AS visits, SUM(played_before = 1) AS back, SUM(entry = 'link') AS by_link"
      + " FROM visits WHERE started_at >= ? GROUP BY day ORDER BY day"
    ).bind(since),
    env.DB.prepare(
      "SELECT COALESCE(last_screen, '') AS screen, COUNT(*) AS visits"
      + " FROM visits WHERE started_at >= ? GROUP BY screen ORDER BY visits DESC"
    ).bind(since)
  ]);
  return json({ visits: visits.results, perDay: perDay.results, lastScreens: lastScreens.results });
}
