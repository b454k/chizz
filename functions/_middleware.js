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
// In the language the round was drawn in: a round saved with lang "en" previews in
// English, and every other round, including all those saved before there was a choice,
// in Turkish. The page's own text is in public/index.html; keep the two in step.
const WORDING = {
  tr: { description: "20 çizim, 20 kelime. hangisi neydi?", drawingsOf: "{whose} çizimleri", daily: "günlük" },
  en: { description: "20 drawings, 20 words. which was which?", drawingsOf: "{whose} drawings", daily: "daily" }
};

// Same rule as whose() in public/index.html; keep the two identical.
function whose(name, lang){
  if (lang === "en") return name + (/s$/i.test(name) ? "'" : "'s");
  const letters = String(name).replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase()
    .replace(/[^a-zçğıöşüâîû]/g, "");
  const vowels = letters.match(/[aeıioöuüâîû]/g);
  const last = vowels ? vowels[vowels.length - 1] : "e";
  const ending = { a: "ın", â: "ın", ı: "ın", e: "in", i: "in", î: "in",
                   o: "un", u: "un", û: "un", ö: "ün", ü: "ün" }[last];
  const buffer = /[aeıioöuüâîû]$/.test(letters) ? "n" : "";
  return name + "'" + buffer + ending;
}

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
  let day = 0;
  let lang = "tr";
  try {
    if (env.GAMES) {
      const record = await env.GAMES.get(code, { type: "json" });
      if (record) {
        name = typeof record.name === "string" ? record.name
             : typeof record.takmaAd === "string" ? record.takmaAd : "";
        day = Number(record.day) > 0 ? Number(record.day) : 0;
        if (record.lang === "en") lang = "en";
      }
    }
  } catch (e) { /* a preview without a name is still a preview */ }
  const say = WORDING[lang];
  const DESCRIPTION = say.description;

  // günlük · ayşe'nin çizimleri · chizz, with either middle part left out when it
  // does not apply.
  const title = (day ? say.daily + " · " : "")
              + (name ? say.drawingsOf.replace("{whose}", whose(name, lang)) + " · " : "")
              + TITLE_SUFFIX;
  const page = url.origin + "/?o=" + code;
  const image = url.origin + "/api/card/" + code + ".png";

  // Only what the page does not already carry. The page has its own title, url, image
  // and card tags for the bare address, and those are rewritten below where they stand --
  // injecting a second copy would leave two of each, and which one a chat app reads
  // is its own business.
  const tags = '<meta property="og:image:alt" content="' + attr(DESCRIPTION) + '">';

  const setContent = value => ({ element(el){ el.setAttribute("content", value); } });

  try {
    // The document has no explicit <head>, so the title tag is the anchor to hang the
    // new tags on. The paired tags in public/index.html are what these selectors find:
    // if they are ever renamed there, rename them here too.
    return new HTMLRewriter()
      .on("title", { element(el){ el.after(tags, { html: true }); } })
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(DESCRIPTION))
      .on('meta[name="description"]', setContent(DESCRIPTION))
      .on('meta[property="og:url"]', setContent(page))
      .on('meta[property="og:image"]', setContent(image))
      .on('meta[property="og:image:width"]', setContent("800"))
      .on('meta[property="og:image:height"]', setContent("1000"))
      .on('meta[name="twitter:card"]', setContent("summary_large_image"))
      .transform(response);
  } catch (e) {
    // A preview is worth less than the page. Anything unexpected in here hands back
    // what the reader actually came for, rather than an error page.
    return response;
  }
}
