// POST /api/save  ->  { code: "A7K2" }
// Cloudflare Pages Function. KV binding name: GAMES

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";  // no 0/O or 1/I/L, so a code can be read aloud
const DIFFICULTIES = ["easy", "medium", "hard", "impossible"];
const MAX_BYTES = 200 * 1024;
const TTL = 30 * 24 * 60 * 60;   // 30 days
const N = 20;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function error(mesaj, status) {
  return json({ error: mesaj }, status);
}

function makeCode() {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  let k = "";
  for (let i = 0; i < 4; i++) k += ALPHABET[buf[i] % ALPHABET.length];
  return k;
}

function drawingsValid(drawings) {
  if (!Array.isArray(drawings) || drawings.length !== N) return false;
  for (const cizim of drawings) {
    if (!Array.isArray(cizim) || cizim.length > 200) return false;   // a drawing is an array of strokes
    for (const stroke of cizim) {
      if (!Array.isArray(stroke) || stroke.length > 2000) return false;
      for (const p of stroke) {
        if (!Array.isArray(p) || p.length !== 2) return false;
        const x = p[0], y = p[1];
        if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
        if (x < 0 || x > 255 || y < 0 || y > 255) return false;
      }
    }
  }
  return true;
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMES) return error("storage not bound", 500);

  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BYTES) return error("payload too large", 413);

  let d;
  try { d = JSON.parse(body); } catch (e) { return error("invalid JSON", 400); }
  if (!d || typeof d !== "object") return error("invalid body", 400);

  if (typeof d.setId !== "string" || !/^set-(0[1-9]|[12][0-9]|30)$/.test(d.setId)) return error("invalid setId", 400);
  if (DIFFICULTIES.indexOf(d.difficulty) < 0) return error("invalid difficulty", 400);

  if (!Array.isArray(d.words) || d.words.length !== N) return error("invalid words", 400);
  for (const k of d.words) {
    if (typeof k !== "string" || !k || k.length > 40) return error("invalid words", 400);
  }
  if (!drawingsValid(d.drawings)) return error("invalid drawings", 400);

  const name = typeof d.name === "string" ? d.name.trim().slice(0, 20) : "";

  const record = JSON.stringify({
    setId: d.setId,
    difficulty: d.difficulty,
    name,                    // optional, may be empty; no personal data is stored
    words: d.words,
    drawings: d.drawings
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const taken = await env.GAMES.get(code);
    if (taken) continue;                                  // collision, generate another
    await env.GAMES.put(code, record, { expirationTtl: TTL });
    return json({ code });
  }
  return error("could not allocate a code, try again", 503);
}

// Any method other than POST. Without this Pages falls through to the static
// asset handler and answers an API call with the whole index.html page.
export function onRequest() {
  return error("POST only", 405);
}
