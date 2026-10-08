// Everything under /api/admin is for the owner alone.
//
// The lock is Cloudflare Access: an Access application on chizz.party/admin and
// chizz.party/api/admin lets in only the owner's email, and stamps each request it lets
// through with a signed token. This checks that token here as well, so the data stays shut
// if Access is ever switched off, misconfigured, or reached by another address
// (chizz.pages.dev has no Access in front of it at all).
//
// Settings, under Workers & Pages -> chizz -> Settings -> Variables, never in the repo:
//   ACCESS_TEAM_DOMAIN  e.g. yourteam.cloudflareaccess.com
//   ACCESS_AUD          the application's "Application Audience (AUD) tag"
//   ADMIN_EMAILS        who may read, comma separated
// For `wrangler pages dev`, ADMIN_LOCAL=1 in .dev.vars opens it on localhost only.
//
// Nothing set means nobody gets in.

let certs = null, certsAt = 0;

function deny() {
  return new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function b64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
}

function cookie(request, name) {
  const m = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)").exec(request.headers.get("cookie") || "");
  return m ? m[1] : "";
}

async function keys(team) {
  if (!certs || Date.now() - certsAt > 3600000) {
    const r = await fetch("https://" + team + "/cdn-cgi/access/certs");
    if (!r.ok) throw new Error("certs " + r.status);
    certs = (await r.json()).keys || [];
    certsAt = Date.now();
  }
  return certs;
}

// The email in a valid Access token for this application, or "".
async function verified(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) return "";
  const head = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
  const body = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
  if (head.alg !== "RS256") return "";
  const jwk = (await keys(env.ACCESS_TEAM_DOMAIN)).find(k => k.kid === head.kid);
  if (!jwk) return "";
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]),
                                        new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) return "";
  const aud = Array.isArray(body.aud) ? body.aud : [body.aud];
  const now = Date.now() / 1000;
  if (aud.indexOf(env.ACCESS_AUD) < 0) return "";
  if (body.iss !== "https://" + env.ACCESS_TEAM_DOMAIN) return "";
  if (!(body.exp > now) || (body.nbf && body.nbf > now + 60)) return "";
  return typeof body.email === "string" ? body.email.toLowerCase() : "";
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const host = new URL(request.url).hostname;

  if (env.ADMIN_LOCAL === "1" && (host === "localhost" || host === "127.0.0.1")) return next();

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAILS) return deny();
  const token = request.headers.get("cf-access-jwt-assertion") || cookie(request, "CF_Authorization");
  if (!token) return deny();
  let email = "";
  try { email = await verified(token, env); } catch (e) { return deny(); }
  const allowed = env.ADMIN_EMAILS.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || allowed.indexOf(email) < 0) return deny();
  return next();
}
