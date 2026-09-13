// GET /api/game/A7K2  ->  { setId, day, mode, seconds, name, words, drawings }
// day is 0 for a free-play round, or the day number for one of the daily puzzles.
// 404 when the code is unknown or has expired.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
const TTL = 30 * 24 * 60 * 60;   // matches the TTL save.js writes with

// What the four fixed difficulties meant, for rounds saved before modes existed.
const LEGACY_DIFFS = {
  easy:       { mode: "pool",  seconds: 4 },
  medium:     { mode: "pool",  seconds: 2.5 },
  hard:       { mode: "typed", seconds: 2.5 },
  impossible: { mode: "typed", seconds: 1.5 }
};

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
  // Rounds saved before modes existed carry a difficulty name instead. The client
  // maps it too; doing it here as well means one shape reaches every reader.
  if (record.mode === undefined) {
    const legacy = LEGACY_DIFFS[record.difficulty];
    if (legacy) { record.mode = legacy.mode; record.seconds = legacy.seconds; }
  }
  return record;
}

// The owner token is the one field a reader must never see: anyone holding it could
// rename the round.
function publicRecord(record) {
  const out = withLegacyFields(record);
  if (out && typeof out === "object") delete out.owner;
  return out;
}

export async function onRequestGet({ params, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const code = String(params.code || "").trim().toUpperCase();   // lower case accepted on input
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  const data = await env.GAMES.get(code, { type: "json" });
  if (!data) return json({ error: "code not found" }, 404);

  return json(publicRecord(data));
}

// A round is now saved the moment its own guessing starts, so friends can join
// while the drawer plays. At that point there may be no name yet -- one is only
// asked for when it is first needed. This fills that blank in afterwards.
//
// It only ever fills a blank. A round that already carries a name cannot be
// renamed through this, so the worst anyone can do with a guessed code is name an
// anonymous round once.
export async function onRequestPost({ params, request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const code = String(params.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "code not found" }, 404);

  let d;
  try { d = await request.json(); } catch (e) { return json({ error: "invalid JSON" }, 400); }
  const name = d && typeof d.name === "string" ? d.name.trim().slice(0, 20) : "";
  if (!name) return json({ error: "name required" }, 400);

  const data = await env.GAMES.get(code, { type: "json" });
  if (!data) return json({ error: "code not found" }, 404);

  const current = withLegacyFields(data);
  const owner = d && typeof d.owner === "string" ? d.owner : "";
  const isOwner = !!current.owner && !!owner && current.owner === owner;

  // A blank can be filled by whoever is playing the round, which is how a name
  // given after the automatic save gets attached. Changing a name that is already
  // there is only for the device that saved it.
  if (current.name && !isOwner) return json({ error: "not yours to rename" }, 403);
  if (current.name === name) return json({ name });

  current.name = name;
  // Re-putting restarts the 30 days. The round is being actively played, so
  // outliving its original expiry by a few minutes is the harmless direction.
  await env.GAMES.put(code, JSON.stringify(current), { expirationTtl: TTL });
  return json({ name });
}

// Any method other than GET or POST. Without this Pages falls through to the
// static asset handler and answers an API call with the whole index.html page.
export function onRequest() {
  return json({ error: "GET or POST only" }, 405);
}
