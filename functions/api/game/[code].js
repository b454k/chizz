// GET /api/game/A7K2  ->  { setId, difficulty, name, words, drawings }
// 404 when the code is unknown or has expired.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

// Rounds saved before the fields were renamed to English are still in KV under
// their old names. Map them on read so links already shared keep working until
// they expire.
function withLegacyFields(record) {
  if (!record || typeof record !== "object") return record;
  if (record.words === undefined && Array.isArray(record.kelimeler)) record.words = record.kelimeler;
  if (record.drawings === undefined && Array.isArray(record.cizimler)) record.drawings = record.cizimler;
  if (record.difficulty === undefined && typeof record.zorluk === "string") record.difficulty = record.zorluk;
  if (record.name === undefined && typeof record.takmaAd === "string") record.name = record.takmaAd;
  return record;
}

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const code = String(params.code || "").trim().toUpperCase();   // lower case accepted on input
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  const data = await env.GAMES.get(code, { type: "json" });
  if (!data) return json({ error: "code not found" }, 404);

  return json(withLegacyFields(data));
}

// Any method other than GET. Without this Pages falls through to the static
// asset handler and answers an API call with the whole index.html page.
export function onRequest() {
  return json({ error: "GET only" }, 405);
}
