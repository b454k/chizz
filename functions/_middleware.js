// Link previews.
//
// A chat app pasting https://chizz.party/?o=A7K2 fetches that page and reads the
// og: tags out of it. The page is a static file, the same one for every round, so the
// tags have to be put in per request -- here, on the way out, with the round's own
// picture and the name of whoever drew it.
//
// Only the page is touched. Everything else, /api included, passes straight through.

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

const TITLE_SUFFIX = "chizz";
const DESCRIPTION = "20 çizim, 20 kelime. Hangisi neydi?";
const DRAWINGS_OF = "{name}'ın çizimleri";

function attr(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  const isPage = url.pathname === "/" || url.pathname === "/index.html";
  const code = String(url.searchParams.get("o") || "").trim().toUpperCase();
  if (!isPage || !CODE_PATTERN.test(code)) return next();

  const response = await next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

  // The name is the only thing worth a lookup; a missing round still gets a preview,
  // and the picture endpoint answers 404 on its own if the code is dead.
  let name = "";
  try {
    if (env.GAMES) {
      const record = await env.GAMES.get(code, { type: "json" });
      if (record) name = typeof record.name === "string" ? record.name
                       : typeof record.takmaAd === "string" ? record.takmaAd : "";
    }
  } catch (e) { /* a preview without a name is still a preview */ }

  const title = name ? DRAWINGS_OF.replace("{name}", name) + " · " + TITLE_SUFFIX : TITLE_SUFFIX;
  const page = url.origin + "/?o=" + code;
  const image = url.origin + "/api/card/" + code + ".png";

  const tags = [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="chizz">',
    '<meta property="og:title" content="' + attr(title) + '">',
    '<meta property="og:description" content="' + attr(DESCRIPTION) + '">',
    '<meta property="og:url" content="' + attr(page) + '">',
    '<meta property="og:image" content="' + attr(image) + '">',
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="800">',
    '<meta property="og:image:height" content="1000">',
    '<meta property="og:image:alt" content="' + attr(DESCRIPTION) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="description" content="' + attr(DESCRIPTION) + '">'
  ].join("");

  // The document has no explicit <head>, so the title tag is the anchor to hang them on.
  return new HTMLRewriter()
    .on("title", { element(el) { el.after(tags, { html: true }); } })
    .transform(response);
}
