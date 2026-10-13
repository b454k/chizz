// Where each drawing sits in the grid, in one place.
//
// This lives outside functions/ on purpose: everything under that directory becomes a
// route, and this is a module, not an endpoint.
//
// The grid is shuffled so that position gives nothing away, and shuffled the same way for
// everyone who sees the round, so that the green and red squares people send each other
// describe the same drawings. The shuffle is seeded from the drawings themselves, in the
// exact form they are stored and sent in, so the drawer works it out before the round has
// a code and every guesser -- and the link preview -- works out the same one without being
// told.
//
// Seeding it from the words instead would have been simpler and wrong: a daily round is
// the same twenty words for everybody, so after playing your own you would know every
// position in a friend's. Two rounds never hold the same strokes.
//
// The client keeps its own copy of all of this, because index.html is a single file with
// no imports and no build step -- that is the whole shape of the project. The copy is
// guarded by tools/check-grid.js, which runs both and fails if they ever disagree. They
// must: a preview laid out in one order beside a score written in another is exactly the
// bug this was written to fix.

export const GRID = 20;

// A hash of the drawings as JSON. FNV-1a: short, and it only has to spread, not defend.
export function seedFrom(encoded) {
  const s = JSON.stringify(encoded || []);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The same generator the daily schedule is dealt with, so there is one kind of randomness
// in the game that can be repeated.
function random(seed) {
  let a = (seed * 1831565813) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Grid position -> which drawing goes there.
export function gridOrder(encoded) {
  const rnd = random(seedFrom(encoded));
  const a = [];
  for (let i = 0; i < GRID; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
