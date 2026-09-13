// The daily clock, in one place.
//
// This lives outside functions/ on purpose: everything under that directory becomes a
// route, and this is a module, not an endpoint.
//
// The client keeps its own copy of these two constants, because index.html is a single
// file with no imports and no build step -- that is the whole shape of the project.
// The copy is guarded by tools/check-day-epoch.js, which fails loudly if the two ever
// drift. They must agree: if the client thinks it is day 7 and the server thinks it is
// day 6, scores land on the wrong board and saved rounds expire at the wrong time, and
// nothing anywhere says so.

// Day 1 is Tuesday 8 September 2026, midnight in Turkey. Turkey is UTC+3 all year and
// has had no daylight saving since 2016, so one fixed offset is correct rather than a
// simplification.
export const EPOCH = Date.UTC(2026, 8, 7, 21, 0, 0);
export const DAY_MS = 86400000;

// Which day it is now, counting from 1.
export function dayNumber(at) {
  return Math.floor(((at === undefined ? Date.now() : at) - EPOCH) / DAY_MS) + 1;
}

// Seconds until the current day ends, so a daily round can expire with it. Never less
// than a minute, so a round saved in the last instant of a day is not born expired.
export function endOfDay(at) {
  const now = at === undefined ? Date.now() : at;
  return Math.max(60, Math.round((EPOCH + dayNumber(now) * DAY_MS - now) / 1000));
}
