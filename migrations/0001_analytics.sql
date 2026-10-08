-- What a visit did, for the owner's /admin page and for analysis. Written by
-- functions/api/events.js, read by functions/api/admin/*. Nothing here names anyone: a
-- visit id is random, lives only in the tab's memory and dies with it, no IP address or
-- typed text is stored, and the name a player gives a round is never sent here.
--
-- Apply with:  npx wrangler d1 migrations apply chizz-analytics --remote   (or --local)

-- One row per page load.
CREATE TABLE visits (
  id           TEXT PRIMARY KEY,     -- 16 hex characters, made by the page
  started_at   INTEGER NOT NULL,     -- server time of the first batch, ms since 1970
  last_at      INTEGER NOT NULL,     -- server time of the latest batch
  day          INTEGER,              -- the game's day number (lib/day.js) at the start
  local_hour   INTEGER,              -- 0-23 on the player's clock, for time-of-day
  country      TEXT,                 -- two letters, from Cloudflare
  lang         TEXT,                 -- tr | en
  input        TEXT,                 -- touch | mouse | pen, from the first pointer
  os           TEXT,                 -- ios | android | windows | mac | linux | other
  width        INTEGER,              -- viewport in CSS pixels
  height       INTEGER,
  entry        TEXT,                 -- home | link
  via_code     TEXT,                 -- the round code a link arrived with
  played_before INTEGER,             -- 1 if this device had played before this visit
  first_day    INTEGER,              -- earliest day this device has a round for (cohort)
  days_played  INTEGER,              -- daily games played on this device in the last 14 days
  last_screen  TEXT,                 -- the screen the visit was last on
  left_at      INTEGER,              -- server time the page was last hidden or closed
  events       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX visits_started ON visits(started_at);

-- The events themselves, in the batches they arrived in: a JSON array per row keeps a
-- visit to a handful of writes instead of one per tap. Each event is
-- {t, type, screen?, target?, x?, y?, ...} with t in ms since the visit started.
CREATE TABLE event_batches (
  visit_id     TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  received_at  INTEGER NOT NULL,
  events       TEXT NOT NULL,
  PRIMARY KEY (visit_id, seq)
);
CREATE INDEX event_batches_received ON event_batches(received_at);

-- One row per round played: drawn here, guessed here, or both.
CREATE TABLE rounds (
  id           TEXT PRIMARY KEY,     -- 16 hex, made by the page
  visit_id     TEXT NOT NULL,
  started_at   INTEGER NOT NULL,
  kind         TEXT,                 -- daily | unlimited | friend
  role         TEXT,                 -- solo | drawer | guesser
  code         TEXT,                 -- the saved round's code, once it has one
  day          INTEGER,              -- for a daily round
  secs         REAL,                 -- seconds per word
  mode         TEXT,                 -- pool (kolay) | typed (zor)
  lang         TEXT,
  input        TEXT,                 -- what drew it, when it was drawn here
  words        TEXT,                 -- JSON array of the 20 words, in drawing order
  drawn_at     INTEGER,              -- when the last word was drawn
  finished_at  INTEGER,              -- when the guesses were marked
  score        INTEGER,
  recall_ms    INTEGER               -- grid up to finish
);
CREATE INDEX rounds_visit ON rounds(visit_id);
CREATE INDEX rounds_started ON rounds(started_at);
CREATE INDEX rounds_code ON rounds(code);

-- One row per word of a round. The drawing half is filled when the word was drawn on this
-- device, the guessing half when it was guessed here.
CREATE TABLE round_items (
  round_id     TEXT NOT NULL,
  idx          INTEGER NOT NULL,     -- 0-19, the order it was drawn in (serial position)
  word         TEXT NOT NULL,
  -- drawing
  strokes      INTEGER,
  points       INTEGER,
  ink          REAL,                 -- total line length, in pad widths
  first_ms     INTEGER,              -- word shown -> first touch of the pen
  last_ms      INTEGER,              -- word shown -> last point drawn
  clears       INTEGER,              -- times the pad was wiped for this word
  drawing      TEXT,                 -- JSON, Quick, Draw! shape: [[xs], [ys], [ts]] per stroke, 0-255
  -- guessing
  grid_pos     INTEGER,              -- where the drawing sat in the grid
  answer       TEXT,                 -- what was picked or typed, as given
  answer_word  TEXT,                 -- the round's word that answer counts as, if any
  correct      INTEGER,
  answer_ms    INTEGER,              -- grid up -> the final answer was given
  tries        INTEGER,              -- times the answer for this drawing was set or changed
  PRIMARY KEY (round_id, idx)
);
