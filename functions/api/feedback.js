// POST /api/feedback  body {kind, text, name, context}  ->  { ok: true }
//
// A bug report or a suggestion from the page, written to KV as one entry each. Nothing
// reads them back through the API: they are read in the Cloudflare dashboard (Storage &
// Databases -> KV -> the GAMES namespace), where the key sorts them by time and names the
// kind, e.g. feedback:2026-09-17T14:03:22.114Z:hata:k3f9.
//
// No IP address is stored. The context is what the page attaches itself -- the screen, the
// round code, the device and recent script errors -- and the form says so.

const KINDS = ["hata", "oneri"];
const TEXT_MIN = 10, TEXT_MAX = 500;
const NAME_MAX = 10;
const CONTEXT_MAX = 4000;                 // characters of JSON; anything bigger is dropped
const MAX_BYTES = 16 * 1024;
const TTL = 180 * 24 * 60 * 60;           // 180 days: long enough to be read, not kept for ever

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMES) return json({ error: "storage not bound" }, 500);

  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BYTES) return json({ error: "payload too large" }, 413);

  let d;
  try { d = JSON.parse(body); } catch (e) { return json({ error: "invalid JSON" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "invalid body" }, 400);

  // A field no person can see or fill. A form-filling bot usually does; say yes and drop it.
  if (typeof d.website === "string" && d.website) return json({ ok: true });

  if (KINDS.indexOf(d.kind) < 0) return json({ error: "invalid kind" }, 400);
  const text = typeof d.text === "string" ? d.text.trim() : "";
  const length = Array.from(text).length;     // characters, not UTF-16 units
  if (length < TEXT_MIN || length > TEXT_MAX) return json({ error: "invalid text" }, 400);

  const name = typeof d.name === "string" ? d.name.trim().slice(0, NAME_MAX) : "";
  let context = d.context && typeof d.context === "object" ? d.context : {};
  if (JSON.stringify(context).length > CONTEXT_MAX) context = { dropped: "context too large" };

  const at = new Date().toISOString();
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(36).padStart(2, "0")).join("").slice(0, 4);
  const key = "feedback:" + at + ":" + d.kind + ":" + rand;

  await env.GAMES.put(key, JSON.stringify({ kind: d.kind, text, name, at, context }, null, 2), {
    expirationTtl: TTL
  });
  return json({ ok: true });
}

// Any method other than POST. Without this Pages falls through to the static
// asset handler and answers an API call with the whole index.html page.
export function onRequest() {
  return json({ error: "POST only" }, 405);
}
