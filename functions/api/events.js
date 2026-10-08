import { dayNumber } from "../../lib/day.js";

// POST /api/events  body {v, seq, meta?, events, rounds?}  ->  204
//
// What a visit did -- the screens it went through, where it tapped, when it left, and the
// rounds it drew and guessed -- written to D1 (binding DB) for the owner's /admin page
// and for analysis. Schema: migrations/0001_analytics.sql.
//
// Nothing names anyone. The visit id is random and lives only in the tab's memory; no IP
// address is stored, only the country Cloudflare puts on the request; the page never
// sends typed text other than a guess, nor the name given to a round.
//
// Every field is checked and anything unexpected is dropped rather than refused: this is
// a measurement, and a page that sends one odd value should still have the rest counted.
// The page does not read the answer, so it is always 204, also when D1 is not bound.

const MAX_BYTES = 300 * 1024;              // a round's twenty drawings with their timings
const MAX_EVENTS = 100;
const MAX_ROUNDS = 3;
const N = 20;
const KEEP_MS = 400 * 86400000;            // 13 months and a bit, then it goes
const VISIT_ID = /^[0-9a-f]{16}$/;
const CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

const EVENT_TYPES = ["screen", "tap", "hide", "show", "leave", "error", "share", "report"];
// The keys an event may carry beyond t and type, and how long a string may be.
const EVENT_KEYS = { screen: 24, target: 80, message: 200, where: 120, how: 16, kind: 8, code: 4 };

function done() { return new Response(null, { status: 204 }); }

function str(v, max) {
  return typeof v === "string" && v ? v.slice(0, max) : null;
}
function int(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max ? v : null;
}
function num(v, min, max) {
  return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : null;
}
function oneOf(v, list) {
  return list.indexOf(v) >= 0 ? v : null;
}
function code(v) {
  return typeof v === "string" && CODE.test(v) ? v : null;
}

function cleanEvent(e) {
  if (!e || typeof e !== "object") return null;
  const type = oneOf(e.type, EVENT_TYPES);
  const t = int(e.t, 0, 7 * 86400000);
  if (!type || t === null) return null;
  const out = { t, type };
  for (const k in EVENT_KEYS) {
    const v = k === "code" ? code(e[k]) : str(e[k], EVENT_KEYS[k]);
    if (v) out[k] = v;
  }
  const x = num(e.x, 0, 1), y = num(e.y, 0, 1);
  if (x !== null && y !== null) { out.x = Math.round(x * 1000) / 1000; out.y = Math.round(y * 1000) / 1000; }
  return out;
}

// A drawing as Quick, Draw! stores one: per stroke [xs, ys, ts], coordinates 0-255 and
// ts in ms since the word was shown.
function cleanDrawing(d) {
  if (!Array.isArray(d) || d.length > 200) return null;
  let points = 0;
  for (const st of d) {
    if (!Array.isArray(st) || st.length !== 3) return null;
    const [xs, ys, ts] = st;
    if (!Array.isArray(xs) || !Array.isArray(ys) || !Array.isArray(ts)) return null;
    if (!xs.length || xs.length > 2000 || xs.length !== ys.length || xs.length !== ts.length) return null;
    for (let i = 0; i < xs.length; i++) {
      if (int(xs[i], 0, 255) === null || int(ys[i], 0, 255) === null || int(ts[i], 0, 600000) === null) return null;
    }
    points += xs.length;
  }
  return points <= 20000 ? d : null;
}

function cleanItem(it) {
  if (!it || typeof it !== "object") return null;
  const idx = int(it.idx, 0, N - 1);
  if (idx === null) return null;
  const drawing = it.drawing !== undefined ? cleanDrawing(it.drawing) : null;
  return {
    idx,
    strokes: int(it.strokes, 0, 200),
    points: int(it.points, 0, 400000),
    ink: num(it.ink, 0, 1000) === null ? null : Math.round(it.ink * 1000) / 1000,
    first_ms: int(it.firstMs, 0, 600000),
    last_ms: int(it.lastMs, 0, 600000),
    clears: int(it.clears, 0, 100),
    drawing: drawing ? JSON.stringify(drawing) : null,
    grid_pos: int(it.gridPos, 0, N - 1),
    answer: typeof it.answer === "string" ? it.answer.slice(0, 40) : null,
    answer_word: str(it.answerWord, 40),
    correct: it.correct === true ? 1 : it.correct === false ? 0 : null,
    answer_ms: int(it.answerMs, 0, 7 * 86400000),
    tries: int(it.tries, 0, 1000)
  };
}

function cleanRound(r, now) {
  if (!r || typeof r !== "object" || typeof r.id !== "string" || !VISIT_ID.test(r.id)) return null;
  if (!Array.isArray(r.words) || r.words.length !== N) return null;
  for (const w of r.words) if (typeof w !== "string" || !w || w.length > 40) return null;
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, N).map(cleanItem).filter(Boolean);
  return {
    id: r.id,
    kind: oneOf(r.kind, ["daily", "unlimited", "friend"]),
    role: oneOf(r.role, ["solo", "drawer", "guesser"]),
    code: code(r.code),
    day: int(r.day, 1, 100000),
    secs: num(r.secs, 1, 10),
    mode: oneOf(r.mode, ["pool", "typed"]),
    lang: oneOf(r.lang, ["tr", "en"]),
    input: oneOf(r.input, ["touch", "mouse", "pen"]),
    words: JSON.stringify(r.words),
    drawn_at: r.drawn === true ? now : null,
    finished_at: r.finished === true ? now : null,
    score: int(r.score, 0, N),
    recall_ms: int(r.recallMs, 0, 7 * 86400000),
    items
  };
}

const ROUND_COLS = ["kind", "role", "code", "day", "secs", "mode", "lang", "input", "words",
                    "drawn_at", "finished_at", "score", "recall_ms"];
const ITEM_COLS = ["strokes", "points", "ink", "first_ms", "last_ms", "clears", "drawing",
                   "grid_pos", "answer", "answer_word", "correct", "answer_ms", "tries"];

// Insert, or fill in what this report knows and keep what an earlier one said. The
// columns in "fixed" are written once, by whichever report came first.
function upsert(table, key, fixed, cols) {
  const all = key.concat(fixed, cols);
  return "INSERT INTO " + table + " (" + all.join(", ") + ") VALUES (" + all.map(() => "?").join(", ") + ")"
    + " ON CONFLICT(" + key.join(", ") + ") DO UPDATE SET "
    + cols.map(c => c + " = COALESCE(excluded." + c + ", " + table + "." + c + ")").join(", ");
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return done();

  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BYTES) return done();
  let d;
  try { d = JSON.parse(body); } catch (e) { return done(); }
  if (!d || typeof d !== "object" || typeof d.v !== "string" || !VISIT_ID.test(d.v)) return done();
  const seq = int(d.seq, 0, 100000);
  if (seq === null) return done();

  const now = Date.now();
  const events = (Array.isArray(d.events) ? d.events : []).slice(0, MAX_EVENTS).map(cleanEvent).filter(Boolean);
  const m = d.meta && typeof d.meta === "object" ? d.meta : {};
  const maxT = events.reduce((a, e) => Math.max(a, e.t), 0);

  // Where the visit stands after this batch: the last screen it reached, and whether its
  // last word was leaving. Coming back clears that, so left_at is always the latest exit.
  let lastScreen = null;
  for (const e of events) if (e.type === "screen") lastScreen = e.screen || null;
  const last = events[events.length - 1];
  const leftAt = last && (last.type === "hide" || last.type === "leave") ? now : null;

  const stmts = [];
  stmts.push(env.DB.prepare(
    "INSERT INTO visits (id, started_at, last_at, day, local_hour, country, lang, input, os, width, height,"
    + " entry, via_code, played_before, first_day, days_played, last_screen, left_at, events)"
    + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    + " ON CONFLICT(id) DO UPDATE SET last_at = excluded.last_at,"
    + " events = visits.events + excluded.events,"
    + " last_screen = COALESCE(excluded.last_screen, visits.last_screen),"
    + " left_at = excluded.left_at,"
    + " input = COALESCE(visits.input, excluded.input),"
    + " lang = COALESCE(excluded.lang, visits.lang)"
  ).bind(
    d.v, now - maxT, now, dayNumber(now - maxT),
    int(m.hour, 0, 23),
    str(request.cf && request.cf.country, 2),
    oneOf(m.lang, ["tr", "en"]),
    oneOf(m.input, ["touch", "mouse", "pen"]),
    oneOf(m.os, ["ios", "android", "windows", "mac", "linux", "other"]),
    int(m.w, 0, 10000), int(m.h, 0, 10000),
    oneOf(m.entry, ["home", "link"]),
    code(m.via),
    m.returning === true ? 1 : m.returning === false ? 0 : null,
    int(m.firstDay, 1, 100000),
    int(m.daysPlayed, 0, 14),
    lastScreen, leftAt, events.length
  ));
  if (events.length) {
    stmts.push(env.DB.prepare(
      "INSERT OR IGNORE INTO event_batches (visit_id, seq, received_at, events) VALUES (?, ?, ?, ?)"
    ).bind(d.v, seq, now, JSON.stringify(events)));
  }

  const rounds = (Array.isArray(d.rounds) ? d.rounds : []).slice(0, MAX_ROUNDS)
    .map(r => cleanRound(r, now)).filter(Boolean);
  const roundSql = upsert("rounds", ["id"], ["visit_id", "started_at"], ROUND_COLS);
  const itemSql = upsert("round_items", ["round_id", "idx"], ["word"], ITEM_COLS);
  for (const r of rounds) {
    stmts.push(env.DB.prepare(roundSql).bind(r.id, d.v, now, ...ROUND_COLS.map(c => r[c])));
    const words = JSON.parse(r.words);
    for (const it of r.items) {
      stmts.push(env.DB.prepare(itemSql).bind(r.id, it.idx, words[it.idx], ...ITEM_COLS.map(c => it[c])));
    }
  }

  await env.DB.batch(stmts);

  // No cron on Pages, so old rows are cleared by an occasional request instead.
  if (Math.random() < 0.01) {
    const cut = now - KEEP_MS;
    waitUntil(env.DB.batch([
      env.DB.prepare("DELETE FROM event_batches WHERE received_at < ?").bind(cut),
      env.DB.prepare("DELETE FROM visits WHERE started_at < ?").bind(cut),
      env.DB.prepare("DELETE FROM round_items WHERE round_id IN (SELECT id FROM rounds WHERE started_at < ?)").bind(cut),
      env.DB.prepare("DELETE FROM rounds WHERE started_at < ?").bind(cut)
    ]).catch(() => {}));
  }
  return done();
}

// Any method other than POST. Without this Pages falls through to the static
// asset handler and answers an API call with the whole index.html page.
export function onRequest() {
  return new Response(JSON.stringify({ error: "POST only" }), {
    status: 405, headers: { "content-type": "application/json; charset=utf-8" }
  });
}
